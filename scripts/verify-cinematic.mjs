// Read-only browser regression checks. Requires Playwright and its Chromium browser.
// BASE_URL=http://localhost:3030 node scripts/verify-cinematic.mjs
// Optional: PLAYWRIGHT_MODULE, CINEMATIC_STORAGE_STATE, CINEMATIC_BUILDER_URL,
// CINEMATIC_PUBLIC_URL (defaults to the official template preview route).
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.BASE_URL || "http://localhost:3030";
const preview =
  process.env.CINEMATIC_PUBLIC_URL ||
  `${base}/templates/cinematic-vintage/preview`;
const picker = process.env.CINEMATIC_PICKER_URL;
const standardPicker = process.env.STANDARD_PICKER_URL;
const output = "/tmp/ngaturi-vintage-verification";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  storageState: process.env.CINEMATIC_STORAGE_STATE,
});
const errors = [];

async function load(page, url) {
  await page.goto(url);
  const cover = page.locator("[data-invitation-cover] button");
  if (await cover.count()) await cover.click();
  await page.waitForSelector("[data-cinematic-stage][data-enhanced]");
}

async function cameraCheck(page, label, canvas = false) {
  const stage = page.locator("[data-cinematic-stage]");
  const bounds = await stage.evaluate((el) => {
    const scroller = el.closest("[data-device-scroller]");
    const height = scroller?.clientHeight ?? innerHeight;
    return {
      top:
        el.getBoundingClientRect().top +
        (scroller?.scrollTop ?? scrollY) -
        (scroller?.getBoundingClientRect().top ?? 0),
      distance: el.offsetHeight - height,
    };
  });
  const baseline = await page.evaluate(() => ({
    window: scrollY,
    outer: document.querySelector("main")?.scrollTop ?? 0,
  }));
  const samples = {};
  for (const p of [
    0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.16, 0.27, 0.37, 0.45, 0.52, 0.58, 0.6, 0.62,
    0.64, 0.66, 0.7, 0.75, 0.8, 0.85, 0.9, 0.94, 0.96, 0.98, 0.99,
  ]) {
    await stage.evaluate(
      (el, { bounds, p }) => {
        const target = bounds.top + bounds.distance * p;
        const scroller = el.closest("[data-device-scroller]");
        if (scroller) scroller.scrollTop = target;
        else document.documentElement.scrollTop = target;
      },
      { bounds, p },
    );
    await page.waitForTimeout(80);
    samples[p] = await stage.evaluate((el) => {
      const matrix = (selector) =>
        new DOMMatrix(getComputedStyle(el.querySelector(selector)).transform);
      const scroller = el.closest("[data-device-scroller]");
      return {
        entrance: matrix("[data-scene=entrance] > div").a,
        couple: matrix("[data-scene=couple] > div").a,
        quote: matrix("[data-scene=quote] > div").a,
        venue: matrix("[data-scene=venue] > div").a,
        closing: matrix("[data-scene=closing] > div").a,
        rail: matrix("[data-world-rail]").e,
        camera: matrix("[data-world-camera]").a,
        foreground: matrix('[data-depth="5"]').f,
        background: matrix('[data-depth="0"]').f,
        scenes: [...el.querySelectorAll("[data-scene]")]
          .filter((s) => !s.inert)
          .map((s) => s.dataset.scene),
        overflow: scroller
          ? scroller.scrollWidth > scroller.clientWidth
          : document.documentElement.scrollWidth > innerWidth,
        window: scrollY,
        outer: document.querySelector("main")?.scrollTop ?? 0,
      };
    });
    assert.equal(samples[p].overflow, false, `${label}: overflow at ${p}`);
    if (canvas) {
      assert.equal(
        samples[p].window,
        baseline.window,
        "Builder window scroll changed",
      );
      assert.equal(
        samples[p].outer,
        baseline.outer,
        "Builder outer scroll changed",
      );
    }
    if ([0, 0.16, 0.37, 0.52, 0.6, 0.7, 0.85, 0.99].includes(p))
      await page.screenshot({ path: `${output}/${label}-${p}.png` });
  }
  assert(
    Math.max(samples[0.06].entrance, samples[0.08].entrance, samples[0.1].entrance) >
      Math.min(samples[0.02].entrance, samples[0.04].entrance),
    "Entrance must zoom",
  );
  assert.notEqual(
    samples[0.06].foreground,
    samples[0.06].background,
    "Depth layers must move differently",
  );
  assert(samples[0.27].couple < samples[0.16].couple, "Couple camera must pull back");
  assert(
    Math.min(samples[0.27].quote, samples[0.37].quote) <
      Math.max(samples[0.16].quote, samples[0.27].quote),
    "Quote must pull back",
  );
  assert(
    samples[0.45].rail < samples[0.37].rail,
    "Vertical scroll must traverse gallery horizontally",
  );
  const akadPeak = Math.max(samples[0.52].camera, samples[0.58].camera);
  const receptionPeak = Math.max(
    samples[0.7].camera,
    samples[0.75].camera,
    samples[0.8].camera,
  );
  assert(akadPeak > samples[0.45].camera, "Akad must enter");
  assert(samples[0.62].camera < akadPeak, "Akad must exit");
  assert(
    Math.abs(samples[0.62].camera - samples[0.64].camera) < 0.001 &&
      Math.abs(samples[0.62].rail - samples[0.64].rail) < 0.001,
    "Gallery world must hold after Akad exit",
  );
  assert(
    samples[0.7].rail < samples[0.64].rail,
    "Camera must travel to reception",
  );
  assert(receptionPeak > samples[0.66].camera, "Reception must enter");
  assert(samples[0.85].camera < receptionPeak, "Reception must exit");
  assert(samples[0.9].scenes.includes("venue"), "Venue must appear");
  assert(
    Math.max(samples[0.9].venue, samples[0.94].venue) > samples[0.85].venue,
    "Venue transition must zoom in",
  );
  assert(
    Math.min(samples[0.98].closing, samples[0.99].closing) <
      Math.max(samples[0.94].closing, samples[0.96].closing),
    "Closing must pull back",
  );
  console.log(
    `${label}: entrance, depth, gallery, Akad enter/exit, reception enter/exit, venue, closing passed`,
  );
}

try {
  for (const width of process.env.SKIP_PUBLIC ? [] : [360, 430, 1440]) {
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width, height: 900 });
    await load(page, preview);
    await cameraCheck(page, `public-${width}`);
    // Preference changes clean up transforms/inert immediately, without remounting.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(
      () =>
        !document
          .querySelector("[data-cinematic-stage]")
          .hasAttribute("data-enhanced"),
    );
    assert.equal(
      await page.locator("[data-cinematic-stage] [inert]").count(),
      0,
    );
    assert.equal(
      await page.locator("[data-cinematic-stage] [data-event-portal]").count(),
      2,
    );
    await page.locator("[data-scene=venue]").scrollIntoViewIfNeeded();
    assert(await page.locator("[data-scene=venue] a").isVisible());
    await page.screenshot({ path: `${output}/reduced-${width}.png` });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.waitForSelector("[data-enhanced]");
    await page
      .getByRole("button", { name: "Tampilan sederhana", exact: true })
      .click();
    assert.equal(await page.locator("[data-enhanced]").count(), 0);
    for (const type of [
      "rsvp",
      "guestbook",
      "gift",
      "countdown",
      "map-location",
      "music",
      "navigation",
    ])
      assert.equal(
        await page.locator(`[data-section="${type}"]`).count(),
        1,
        `${type} must remain rendered`,
      );
    console.log(
      `public-${width}: live reduced motion and manual fallback passed`,
    );
    await page.close();
  }
  if (picker) {
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(picker);
    const pickerHeading = page.getByRole("heading", { name: "Pilih template undangan" });
    if (await pickerHeading.count()) {
      assert(await pickerHeading.isVisible());
      const card = page.locator("article").filter({ hasText: "Cinematic Vintage" });
      assert.equal(await card.count(), 1);
      assert((await card.locator("img").getAttribute("src"))?.includes("/templates/cinematic-vintage/card"));
      await card.getByRole("button", { name: "Pakai template ini" }).click();
    }
    await page.waitForSelector("[data-cinematic-stage][data-enhanced]");
    assert.equal(await page.getByRole("heading", { name: "Pilih template undangan" }).count(), 0);

    const left = page.locator("aside").first();
    const inspector = page.locator("aside").nth(1);
    const field = (label, index = 0) =>
      inspector
        .locator("label")
        .filter({ hasText: label })
        .nth(index)
        .locator("input, textarea, select")
        .last();
    assert(await inspector.getByText("Cinematic Timeline", { exact: true }).isVisible());
    const heroRow = left.locator("li").filter({ hasText: "Sampul / Pembuka" });
    assert.equal(await heroRow.getByRole("button", { name: "Geser" }).count(), 0);
    assert.equal(await heroRow.getByLabel("Urutan dikendalikan oleh template").count(), 1);
    const rsvpRow = left.locator("li").filter({ hasText: /^RSVP/ });
    assert.equal(await rsvpRow.getByRole("button", { name: "Geser" }).count(), 1);

    await heroRow.getByRole("button", { name: "Sampul / Pembuka" }).click();
    assert(await inspector.getByText("Tampilan dikendalikan oleh template.", { exact: true }).isVisible());
    await field("Nama").fill("Phase 6B Couple");
    assert(await page.locator("[data-device-scroller]").getByText("Phase 6B Couple", { exact: true }).isVisible());

    await left.getByRole("button", { name: "Kutipan", exact: true }).click();
    await inspector.getByRole("heading", { name: "Kutipan", exact: true }).waitFor();
    await field("Teks kutipan").fill("Phase 6B Quote");
    assert(await page.locator("[data-device-scroller]").getByText("Phase 6B Quote", { exact: true }).isVisible());

    await left.getByRole("button", { name: "Rangkaian Acara", exact: true }).click();
    await inspector.getByRole("heading", { name: "Rangkaian Acara", exact: true }).waitFor();
    const eventNames = inspector.locator("label").filter({ hasText: "Nama acara" }).locator("input");
    await eventNames.nth(0).fill("Akad Phase 6B");
    await eventNames.nth(1).fill("Resepsi Phase 6B");
    await field("Jam mulai").fill("09:15");

    await left.getByRole("button", { name: "Peta Lokasi", exact: true }).click();
    await field("Nama tempat").fill("Venue Phase 6B");

    await left.getByRole("button", { name: "Galeri", exact: true }).click();
    await field("Keterangan").fill("Gallery Phase 6B");

    await left.getByRole("button", { name: "Penutup / Terima Kasih", exact: true }).click();
    await field("Pesan penutup").fill("Closing Phase 6B");
    await page.getByText("Tersimpan", { exact: true }).waitFor({ timeout: 10000 });
    await page.reload();
    await page.waitForSelector("[data-cinematic-stage][data-enhanced]");
    assert.equal(await page.getByRole("heading", { name: "Pilih template undangan" }).count(), 0);
    await page.locator("aside").first().getByRole("button", { name: "Sampul / Pembuka" }).click();
    assert.equal(
      await page
        .locator("aside")
        .nth(1)
        .locator("label")
        .filter({ hasText: "Nama" })
        .first()
        .locator("input")
        .inputValue(),
      "Phase 6B Couple",
    );
    console.log("Builder picker, locks, live edits, autosave and reload passed");
    await page.close();
  }
  if (standardPicker) {
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(standardPicker);
    if (await page.getByRole("heading", { name: "Pilih template undangan" }).count()) {
      const card = page.locator("article").filter({ hasText: "Sage Emas Klasik" });
      await card.getByRole("button", { name: "Pakai template ini" }).click();
    }
    await page.waitForSelector('[data-device-scroller] [data-section-id]');
    assert.equal(await page.locator("[data-cinematic-stage]").count(), 0);
    const left = page.locator("aside").first();
    const inspector = page.locator("aside").nth(1);
    assert(await inspector.getByLabel("Animasi saat scroll").isVisible());
    const coverRow = left.locator("li").filter({ hasText: "Sampul / Buka Undangan" });
    assert.equal(await coverRow.getByRole("button", { name: "Geser" }).count(), 1);
    await coverRow.getByRole("button", { name: "Sampul / Buka Undangan" }).click();
    assert((await inspector.getByRole("button").count()) > 1);
    await page.reload();
    assert.equal(await page.getByRole("heading", { name: "Pilih template undangan" }).count(), 0);
    assert.equal(await page.locator("[data-cinematic-stage]").count(), 0);
    console.log("Standard Builder picker, editable controls and reload passed");
    await page.close();
  }
  if (process.env.CINEMATIC_BUILDER_URL) {
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width: 1440, height: 1000 });
    await load(page, process.env.CINEMATIC_BUILDER_URL);
    await cameraCheck(page, "builder-360", true);
    await page.goto(`${base}/templates`);
    assert.equal(
      await page.locator("[data-cinematic-stage], .pin-spacer").count(),
      0,
    );
    await page.goBack();
    await page.waitForSelector("[data-enhanced]");
    assert.equal(await page.locator("[data-cinematic-stage]").count(), 1);
    console.log("Builder: navigation away/back lifecycle passed");
    await page.close();
  }
  // Development chunk names allow a real dynamic-import failure to be injected.
  if (!process.env.SKIP_PUBLIC) {
    const failed = await context.newPage();
    let blocked = 0;
    await failed.route("**/*cinematic_timeline*", (route) => {
      blocked++;
      return route.abort();
    });
    await failed.goto(preview);
    await failed.locator("[data-invitation-cover] button").click();
    await failed.waitForTimeout(700);
    if (blocked) {
      assert.equal(await failed.locator("[data-enhanced]").count(), 0);
      await failed.locator("[data-scene=venue]").scrollIntoViewIfNeeded();
      assert(await failed.locator("[data-scene=venue] a").isVisible());
      console.log("Dynamic import failure: readable DOM and venue CTA passed");
    } else
      console.log(
        "Dynamic import failure injection skipped: production chunks have opaque names",
      );
    await failed.close();
    const standard = await context.newPage();
    await standard.goto(`${base}/templates/navy-elegan/preview`);
    assert.equal(await standard.locator("[data-cinematic-stage]").count(), 0);
    assert.equal(await standard.locator("[data-section=hero]").count(), 1);
    await standard.close();
  }
  assert.deepEqual(errors, [], "Unexpected browser errors");
  console.log(`Standard template isolation passed. Screenshots: ${output}`);
} finally {
  await browser.close();
}

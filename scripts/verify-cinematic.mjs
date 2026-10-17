// Safe local browser acceptance. Every public API request is intercepted.
// BASE_URL=http://127.0.0.1:3048 PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/verify-cinematic.mjs
// Optional: CINEMATIC_PUBLIC_URL, CINEMATIC_FIXTURE_URL (stress fixture),
// CINEMATIC_BUILDER_URL, CINEMATIC_STANDARD_URL, CINEMATIC_OUTPUT, CINEMATIC_STORAGE_STATE.
import assert from "node:assert/strict";
import { mkdir, writeFile, rename } from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.BASE_URL || "http://127.0.0.1:3030";
const preview =
  process.env.CINEMATIC_PUBLIC_URL ||
  `${base}/templates/cinematic-vintage/preview`;
const fixture = process.env.CINEMATIC_FIXTURE_URL;
const builder = process.env.CINEMATIC_BUILDER_URL;
const standard = process.env.CINEMATIC_STANDARD_URL;
for (const url of [preview, fixture, builder, standard].filter(Boolean))
  assert(
    ["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname),
    "Acceptance must use a local server",
  );
const output =
  process.env.CINEMATIC_OUTPUT || "/tmp/ngaturi-cinematic-acceptance";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const results = [];
const names = {
  hero: "Awal",
  "couple-intro": "Mempelai",
  quote: "Kutipan",
  story: "Perjalanan Kami",
  countdown: "Hari Bahagia",
  gallery: "Kenangan",
  "event-details": "Acara",
  "map-location": "Lokasi",
  rsvp: "RSVP",
  gift: "Tanda Kasih",
  guestbook: "Doa & Ucapan",
  closing: "Penutup",
};
async function test(name, run) {
  if (
    process.env.CINEMATIC_CASES &&
    !new RegExp(process.env.CINEMATIC_CASES).test(name)
  )
    return;
  const began = Date.now();
  try {
    const detail = await run();
    results.push({
      name,
      status: detail?.skipped ? "SKIP" : "PASS",
      seconds: (Date.now() - began) / 1000,
      ...detail,
    });
    console.log(`${detail?.skipped ? "SKIP" : "PASS"} ${name}`);
  } catch (error) {
    results.push({ name, status: "FAIL", error: error.stack });
    console.error(`FAIL ${name}: ${error.message}`);
  }
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
}
async function open(width = 390, height = 844, url = preview, options = {}) {
  const context = await browser.newContext({
    viewport: { width, height },
    hasTouch: width < 500,
    isMobile: width < 500,
    storageState: process.env.CINEMATIC_STORAGE_STATE,
    ...options,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/**", (route) =>
    route.fulfill({
      json: route.request().url().includes("public-config") ? {} : [],
    }),
  );
  await page.addInitScript(() => {
    window.__copyFail = false;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text) => {
          if (window.__copyFail) throw Error("mock clipboard unavailable");
          window.__copied = text;
        },
      },
    });
  });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  const cover = page.locator("[data-invitation-cover] button");
  if (await cover.count()) {
    assert(
      !(await page.locator("[data-cinematic-pager]").isVisible()),
      "Pager must stay hidden before opening",
    );
    await cover.click();
    await page.waitForFunction(
      () =>
        document
          .querySelector("[data-invitation-cover]")
          ?.getAttribute("data-open") === "1",
    );
  }
  await page.evaluate(() => document.fonts.ready);
  if (
    options.reducedMotion !== "reduce" &&
    new URL(url).searchParams.get("simple") !== "1"
  )
    await page
      .locator("[data-cinematic-stage][data-enhanced]")
      .first()
      .waitFor();
  await page.locator("[data-cinematic-pager]").waitFor();
  return { context, page, errors };
}
async function seek(page, type, panelIndex) {
  await page.evaluate(
    ({ type, panelIndex }) => {
      document.activeElement?.blur();
      const section = document.querySelector(
        `.cinematic-invitation [data-section="${type}"]`,
      );
      if (!section) throw Error(`Missing chapter ${type}`);
      const stage = section.closest("[data-cinematic-stage]");
      const event = new CustomEvent("cinematic:seek", {
        detail: {
          sectionId: section.dataset.sectionId,
          panelIndex,
          behavior: "instant",
        },
        cancelable: true,
      });
      if (!stage || stage.dispatchEvent(event))
        (
          section.querySelectorAll("[data-world-panel]")[panelIndex ?? 0] ??
          section
        ).scrollIntoView({ behavior: "instant", block: "start" });
    },
    { type, panelIndex },
  );
  await page.waitForTimeout(300);
}
const current = (page) =>
  page
    .locator(
      "[data-cinematic-pager] [aria-current=location] strong > span > span:not([aria-hidden])",
    )
    .innerText();
const y = (page) => page.evaluate(() => scrollY);
async function configuredGuestLimit(form) {
  const input = form.locator('input[name="guest_count"][type="number"]');
  const raw = await input.getAttribute("max");
  const maximum = Number(raw);
  assert(
    raw !== null &&
      /^[1-9]\d*$/.test(raw) &&
      Number.isSafeInteger(maximum) &&
      maximum <= 20,
    `Invalid RSVP fixture: guest-count max must be an integer 1–20; received ${JSON.stringify(raw)}`,
  );
  assert.equal(
    await input.getAttribute("min"),
    "1",
    "Invalid RSVP fixture: guest-count min must match the server contract (1)",
  );
  return { input, maximum, count: Math.min(2, maximum) };
}
async function screenshot(page, name) {
  await page.evaluate(async () => {
    const visible = [...document.images].filter((image) => {
      const box = image.getBoundingClientRect();
      return (
        getComputedStyle(image).visibility === "visible" &&
        box.top < innerHeight &&
        box.bottom > 0 &&
        box.left < innerWidth &&
        box.right > 0
      );
    });
    await Promise.race([
      Promise.all(visible.map((image) => image.decode().catch(() => {}))),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
  });
  await page.screenshot({ path: `${output}/${name}.png` });
}
async function visibleScenes(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("[data-scene]")]
      .filter((node) => {
        const box = node.getBoundingClientRect();
        return (
          box.top < innerHeight &&
          box.bottom > 0 &&
          getComputedStyle(node).visibility === "visible" &&
          Number(getComputedStyle(node).opacity) > 0.1
        );
      })
      .map((node) => node.dataset.scene),
  );
}
try {
  for (const [width, height] of [
    [360, 800],
    [390, 844],
    [430, 932],
    [768, 1024],
    [1440, 844],
  ])
    await test(`fresh-${width}x${height}`, async () => {
      const f = await open(width, height);
      const { page } = f;
      try {
        const start = await y(page);
        await page.waitForTimeout(1100);
        assert(
          Math.abs((await y(page)) - start) <= 1,
          "Idle opening must not start a tour",
        );
        const types = await page.evaluate(() =>
          [
            ...document.querySelectorAll(
              ".cinematic-invitation [data-section]",
            ),
          ].map((n) => n.dataset.section),
        );
        const chapters = [...new Set(types.filter((type) => names[type]))];
        for (const type of chapters) {
          await seek(page, type);
          assert.equal(
            await current(page),
            names[type],
            `Pager must follow ${type}`,
          );
          assert.equal(
            await page.evaluate(() =>
              Math.max(0, document.documentElement.scrollWidth - innerWidth),
            ),
            0,
            "No horizontal page overflow",
          );
          assert(
            (await visibleScenes(page)).length <= 1,
            "Only one cinematic scene at a reading stop",
          );
          if (
            [
              "hero",
              "couple-intro",
              "gallery",
              "event-details",
              "rsvp",
              "closing",
            ].includes(type)
          )
            await screenshot(page, `${type}-${width}`);
        }
        const events = page.locator("[data-event-portal]");
        for (let i = 0; i < (await events.count()); i++) {
          await seek(page, "event-details", i);
          const link = events.nth(i).getByRole("link");
          if (await link.count()) {
            const box = await link.boundingBox();
            assert(
              box && box.y >= 0 && box.y + box.height < height - 78,
              "Every event map action must clear the pager",
            );
          }
        }
        await page
          .locator("[data-cinematic-pager] [aria-haspopup=dialog]")
          .click();
        const list = page.locator("[data-cinematic-dialog=chapters] ol button");
        assert.equal(await list.count(), chapters.length);
        for (let i = 0; i < chapters.length; i++)
          assert((await list.nth(i).innerText()).includes(names[chapters[i]]));
        await screenshot(page, `chapters-${width}`);
        await page.keyboard.press("Escape");
        assert(
          await page
            .locator("[data-cinematic-pager] [aria-haspopup=dialog]")
            .evaluate((node) => node === document.activeElement),
        );
        assert.deepEqual(f.errors, []);
        return { chapters, events: await events.count(), pageErrors: f.errors };
      } finally {
        await f.context.close();
      }
    });
  await test("scroll-cancellation-and-retained-focus", async () => {
    const f = await open();
    const p = f.page;
    try {
      await seek(p, "event-details");
      await p.mouse.move(2, 300);
      await p.mouse.wheel(0, 45);
      await p.waitForTimeout(150);
      const manual = await y(p);
      await p.waitForTimeout(1000);
      const resting = await y(p);
      assert(
        resting >= manual - 1 && resting - manual <= 65,
        "A small forward input must not rebound or advance chapters",
      );
      await p.mouse.wheel(0, 260);
      await p.waitForTimeout(100);
      await p.mouse.wheel(0, -80);
      await p.waitForTimeout(150);
      const reverse = await y(p);
      await p.waitForTimeout(1000);
      assert(
        (await y(p)) <= reverse + 1,
        "Reverse input must cancel forward assistance",
      );
      await p.evaluate(() => {
        const stage = document.querySelector("[data-cinematic-stage]");
        scrollTo({
          top:
            stage.getBoundingClientRect().top +
            scrollY +
            stage.offsetHeight -
            innerHeight -
            2,
          behavior: "instant",
        });
      });
      await p.waitForTimeout(300);
      assert.equal(
        (await visibleScenes(p)).length,
        1,
        "A stage must stay readable when its final transition is interrupted",
      );
      await seek(p, "hero");
      await p
        .getByRole("button", { name: "Bab berikutnya: Mempelai", exact: true })
        .click();
      await p.waitForTimeout(80);
      await p.mouse.move(2, 300);
      await p.mouse.wheel(0, 55);
      await p.waitForTimeout(150);
      const interrupted = await y(p);
      await p.waitForTimeout(1400);
      assert(
        Math.abs((await y(p)) - interrupted) <= 65,
        "New input cancels the chapter tween",
      );
      await seek(p, "rsvp");
      await p
        .locator("[data-section=rsvp] input[name=name]")
        .fill("Tamu Lokal");
      await p.evaluate(() =>
        document
          .querySelector("[data-section=gift]")
          .scrollIntoView({ behavior: "instant" }),
      );
      await p.waitForTimeout(350);
      assert.equal(await current(p), names.gift);
      assert(
        await p
          .locator("input[name=name]")
          .first()
          .evaluate((n) => n === document.activeElement),
      );
      assert(await p.locator("[data-cinematic-pager]").isVisible());
      assert.deepEqual(f.errors, []);
      return { smallForward: { manual, resting }, pageErrors: f.errors };
    } finally {
      await f.context.close();
    }
  });
  await test("gallery-lightbox-controls-focus-and-touch", async () => {
    const f = await open();
    const p = f.page;
    try {
      await seek(p, "gallery");
      const gallery = p.locator("[data-gallery-frames]");
      const first = gallery.getByRole("button", {
        name: /^Perbesar foto 1 dari/,
      });
      const position = await y(p);
      await first.click();
      await p.locator("dialog[open]").waitFor();
      assert(!(await p.locator("[data-cinematic-pager]").isVisible()));
      const dialog = p.locator("dialog");
      await dialog
        .getByRole("button", { name: "Foto berikutnya", exact: true })
        .click();
      assert((await dialog.innerText()).includes("Foto 2 dari"));
      await p.keyboard.press("ArrowLeft");
      assert((await dialog.innerText()).includes("Foto 1 dari"));
      await dialog
        .getByRole("button", { name: "Tutup foto", exact: true })
        .focus();
      await p.keyboard.press("Shift+Tab");
      assert.equal(
        await p.evaluate(() =>
          document.activeElement.getAttribute("aria-label"),
        ),
        "Foto berikutnya",
      );
      await p.keyboard.press("Tab");
      assert.equal(
        await p.evaluate(() =>
          document.activeElement.getAttribute("aria-label"),
        ),
        "Tutup foto",
      );
      await screenshot(p, "lightbox-390");
      await p.keyboard.press("Escape");
      assert(await first.evaluate((n) => n === document.activeElement));
      assert(
        Math.abs((await y(p)) - position) <= 1,
        "Closing the viewer preserves its page position within native scroll rounding",
      );
      await gallery
        .locator('[data-gallery-index="0"]')
        .getByRole("button", { name: "Kenangan berikutnya", exact: true })
        .click();
      await p.waitForTimeout(650);
      assert.equal(
        await gallery.getAttribute("data-active-gallery-index"),
        "1",
      );
      const cdp = await f.context.newCDPSession(p);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: 290, y: 300 }],
      });
      for (const x of [260, 220, 180, 130]) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x, y: 300 }],
        });
        await p.waitForTimeout(35);
      }
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await p.waitForTimeout(650);
      assert.equal(
        await gallery.getAttribute("data-active-gallery-index"),
        "2",
      );
      const secondY = await y(p);
      await gallery
        .getByRole("button", { name: /^Perbesar foto 3 dari/ })
        .click();
      await p.locator("dialog[open]").waitFor();
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: 280, y: 300 }],
      });
      for (const x of [230, 180, 120]) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x, y: 300 }],
        });
        await p.waitForTimeout(35);
      }
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      assert((await p.locator("dialog").innerText()).includes("Foto 4 dari"));
      await p.keyboard.press("Escape");
      assert(
        Math.abs((await y(p)) - secondY) <= 1,
        "Closing the viewer preserves its page position within native scroll rounding",
      );
      assert.equal(
        await gallery.getAttribute("data-active-gallery-index"),
        "2",
      );
      await p.evaluate(() => document.activeElement?.blur());
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: 190, y: 490 }],
      });
      for (const top of [450, 400, 350, 300]) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: 190, y: top }],
        });
        await p.waitForTimeout(60);
      }
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await p.waitForTimeout(700);
      assert(
        (await y(p)) > secondY,
        "Vertical gallery gestures must retain native page travel",
      );
      assert.equal(await p.locator("dialog[open]").count(), 0);
      assert.deepEqual(f.errors, []);
      return { pageErrors: f.errors };
    } finally {
      await f.context.close();
    }
  });
  await test("rsvp-contract-failure-retry-success-and-private-message", async () => {
    const f = await open();
    const p = f.page;
    const payloads = [];
    let releaseResponse;
    const pending = new Promise((resolve) => {
      releaseResponse = resolve;
    });
    try {
      if (
        await p
          .getByText("Pratinjau — konfirmasi tidak akan dikirim.", {
            exact: true,
          })
          .count()
      )
        return {
          skipped:
            "Submission coverage requires a safe public fixture; the catalog preview deliberately disables submission.",
        };
      await p.route("**/api/public/*/rsvp", async (route) => {
        payloads.push(route.request().postDataJSON());
        if (payloads.length === 1) await pending;
        else await new Promise((resolve) => setTimeout(resolve, 350));
        await route.fulfill({
          status: payloads.length === 1 ? 503 : 200,
          json:
            payloads.length === 1
              ? { error: "Koneksi terputus. Coba lagi." }
              : { ok: true },
        });
      });
      await seek(p, "rsvp");
      const section = p.locator("[data-section=rsvp]");
      const form = section.locator("form");
      assert.equal(await form.locator("input[name=status]:checked").count(), 0);
      await form.locator("input[name=name]").fill("Tamu Pengujian Lokal");
      if (await form.locator("input[name=phone]").count())
        await form.locator("input[name=phone]").fill("081234567890");
      assert(
        !(await form.evaluate((n) => n.checkValidity())),
        "Attendance must be an explicit choice",
      );
      await form.getByRole("radio", { name: "Hadir", exact: true }).check();
      const { input, maximum, count } = await configuredGuestLimit(form);
      await input.fill(String(count));
      assert(
        await form.evaluate((node) => node.checkValidity()),
        "A count within the configured maximum must be valid",
      );
      await input.fill(String(maximum + 1));
      assert(
        !(await form.evaluate((node) => node.checkValidity())),
        "The configured attendance limit remains enforced",
      );
      await form
        .getByRole("radio", { name: "Tidak hadir", exact: true })
        .check();
      assert.equal(
        await form.getByLabel("Jumlah tamu", { exact: true }).count(),
        0,
      );
      assert(!(await form.innerText()).includes("Termasuk Anda"));
      assert.equal(
        await form.locator("input[name=guest_count]").inputValue(),
        "1",
      );
      await form.getByRole("radio", { name: "Hadir", exact: true }).check();
      assert.equal(
        await form.locator("input[name=guest_count]").inputValue(),
        String(maximum),
      );
      await form
        .getByRole("radio", { name: "Tidak hadir", exact: true })
        .check();
      await form
        .locator("textarea")
        .fill("Pesan pribadi yang diuji dengan mock.");
      const submit = form.locator('button[type="submit"]');
      assert(
        await form.evaluate((node) => node.checkValidity()),
        "The non-attending form must have a valid request",
      );
      await submit.click();
      await p.waitForTimeout(80);
      assert(await submit.isDisabled());
      await form.dispatchEvent("submit");
      releaseResponse();
      await form.getByRole("alert").waitFor();
      assert.equal(payloads.length, 1);
      assert.equal(
        await form.locator("textarea").inputValue(),
        "Pesan pribadi yang diuji dengan mock.",
      );
      assert.equal(
        await form.locator("input[name=name]").inputValue(),
        "Tamu Pengujian Lokal",
      );
      await submit.click();
      const before = await y(p);
      await section.getByRole("status").waitFor();
      await p.waitForTimeout(400);
      assert(
        Math.abs((await y(p)) - before) <= 1,
        "Success must preserve page position",
      );
      assert.equal(payloads.length, 2);
      assert(
        payloads.every(
          (payload) =>
            payload.status === "not_attending" && payload.guest_count === "1",
        ),
      );
      assert(
        !(await section.getByRole("status").innerText()).includes("1 tamu"),
      );
      await screenshot(p, "rsvp-success-390");
      assert.deepEqual(f.errors, []);
      const attending = await open();
      const attendingPayloads = [];
      try {
        await attending.page.route("**/api/public/*/rsvp", async (route) => {
          attendingPayloads.push(route.request().postDataJSON());
          await route.fulfill({ json: { ok: true } });
        });
        await seek(attending.page, "rsvp");
        const attendingForm = attending.page.locator(
          "[data-section=rsvp] form",
        );
        await attendingForm
          .locator("input[name=name]")
          .fill("Tamu Hadir Lokal");
        if (await attendingForm.locator("input[name=phone]").count())
          await attendingForm.locator("input[name=phone]").fill("081234567890");
        await attendingForm
          .getByRole("radio", { name: "Hadir", exact: true })
          .check();
        const configured = await configuredGuestLimit(attendingForm);
        assert.equal(configured.maximum, maximum);
        await configured.input.fill(String(configured.count));
        assert(await attendingForm.evaluate((node) => node.checkValidity()));
        await attendingForm.locator('button[type="submit"]').click();
        await attending.page
          .locator("[data-section=rsvp]")
          .getByRole("status")
          .waitFor();
        assert.equal(attendingPayloads.length, 1);
        assert.equal(attendingPayloads[0].status, "attending");
        assert.equal(attendingPayloads[0].guest_count, String(count));
        assert.deepEqual(attending.errors, []);
      } finally {
        await attending.context.close();
      }
      return {
        configuredMaximum: maximum,
        validAttendingCount: count,
        mockedRequests: payloads.length + attendingPayloads.length,
        payloads,
        attendingPayload: attendingPayloads[0],
        successScrollDelta: (await y(p)) - before,
        pageErrors: f.errors,
      };
    } finally {
      await f.context.close();
    }
  });
  await test("gift-copy-and-public-wishes-feedback", async () => {
    const f = await open();
    const p = f.page;
    let posts = 0;
    try {
      await seek(p, "gift");
      const gift = p.locator("[data-section=gift]");
      await gift.locator("summary").click();
      const copy = gift.getByRole("button", { name: /Salin nomor/ }).first();
      await copy.scrollIntoViewIfNeeded();
      const height = await gift.evaluate((n) => n.offsetHeight);
      await copy.click();
      assert((await gift.innerText()).includes("Tersalin"));
      await p.evaluate(() => (window.__copyFail = true));
      await copy.click();
      assert((await gift.innerText()).includes("Belum tersalin"));
      assert.equal(await gift.evaluate((n) => n.offsetHeight), height);
      await screenshot(p, "gift-expanded-390");
      await p.route("**/api/public/*/guestbook", async (route) => {
        if (route.request().method() === "GET")
          return route.fulfill({ json: [] });
        posts++;
        return route.fulfill({
          status: posts === 1 ? 503 : 200,
          json:
            posts === 1
              ? { error: "Coba lagi nanti." }
              : { ok: true, pending: true },
        });
      });
      await seek(p, "guestbook");
      const form = p.locator("[data-section=guestbook] form");
      if (
        await form
          .getByText("Pratinjau — ucapan tidak akan dikirim.", { exact: true })
          .count()
      )
        return {
          giftCopy: "PASS",
          skipped:
            "Wish submission requires a safe public fixture; the catalog preview disables submission.",
        };
      await form.locator("input[name=name]").fill("Tamu Lokal");
      await form.locator("textarea").fill("Ucapan publik lokal.");
      await form
        .getByRole("button", { name: "Kirim Ucapan", exact: true })
        .click();
      await form.getByRole("alert").waitFor();
      assert.equal(
        await form.locator("textarea").inputValue(),
        "Ucapan publik lokal.",
      );
      await form
        .getByRole("button", { name: "Kirim Ucapan", exact: true })
        .click();
      await form.getByRole("status").waitFor();
      assert((await form.innerText()).includes("menunggu persetujuan"));
      assert.equal(posts, 2);
      assert.deepEqual(f.errors, []);
      return { mockedWishRequests: posts, pageErrors: f.errors };
    } finally {
      await f.context.close();
    }
  });
  await test("resize-orientation-and-tall-reading", async () => {
    const f = await open(1440, 844);
    const p = f.page;
    try {
      await p.evaluate(() => {
        const native = window.scrollTo.bind(window);
        window.__resizeRestores = [];
        window.scrollTo = (...args) => {
          window.__resizeRestores.push(args);
          return native(...args);
        };
      });
      const restorations = [];
      const resize = async (width, height) => {
        await p.evaluate(() => (window.__resizeRestores = []));
        await p.setViewportSize({ width, height });
        await p.waitForTimeout(500);
        const writes = await p.evaluate(() => window.__resizeRestores.length);
        assert.equal(writes, 1, "One restoration per document viewport change");
        restorations.push({ width, height, writes });
      };
      await seek(p, "couple-intro");
      await resize(360, 800);
      assert.equal(await current(p), names["couple-intro"]);
      assert.deepEqual(await visibleScenes(p), ["couple"]);
      const couple = p.locator("[data-section=couple-intro]");
      assert((await couple.getAttribute("data-cinematic-tall")) !== null);
      await p.mouse.move(2, 300);
      let reached = false;
      for (let i = 0; i < 20; i++) {
        const box = await couple
          .locator("[data-couple-person]")
          .last()
          .boundingBox();
        if (box && box.y + box.height < 700) {
          reached = true;
          break;
        }
        await p.mouse.wheel(0, 70);
        await p.waitForTimeout(90);
      }
      assert(reached, "Read the final family lines before leaving Couple");
      assert.equal(await current(p), names["couple-intro"]);
      await screenshot(p, "couple-reading-end-360");
      await resize(844, 390);
      assert.equal(await current(p), names["couple-intro"]);
      await seek(p, "event-details");
      await resize(390, 844);
      assert.equal(await current(p), names["event-details"]);
      assert.deepEqual(await visibleScenes(p), ["world"]);
      await screenshot(p, "orientation-return-390");
      await seek(p, "closing");
      await resize(430, 932);
      assert.equal(
        await current(p),
        names.closing,
        "Later stages must retain their chapter when preceding stages resize",
      );
      await seek(p, "rsvp");
      const field = p.locator("[data-section=rsvp] input[name=name]");
      await field.fill("Tamu keyboard lokal");
      await resize(390, 500);
      assert.equal(
        await current(p),
        names.rsvp,
        "A focused natural-height form must survive viewport shrink",
      );
      const fieldBox = await field.boundingBox();
      assert(
        fieldBox && fieldBox.y >= 0 && fieldBox.y + fieldBox.height <= 500,
      );
      await resize(390, 844);
      assert.equal(await current(p), names.rsvp);
      await seek(p, "gift");
      await p.locator("[data-section=gift] summary").click();
      const accountAction = p.locator("[data-section=gift] button").first();
      await accountAction.scrollIntoViewIfNeeded();
      await accountAction.focus();
      await p.waitForTimeout(150);
      await resize(430, 932);
      assert.equal(await current(p), names.gift);
      const accountBox = await accountAction.boundingBox();
      assert(
        accountBox &&
          accountBox.y >= 0 &&
          accountBox.y + accountBox.height <= 932,
      );
      await seek(p, "guestbook");
      const wishName = p.locator("[data-section=guestbook] input[name=name]");
      await wishName.fill("Tamu ucapan lokal");
      await resize(390, 500);
      assert.equal(await current(p), names.guestbook);
      const wishBox = await wishName.boundingBox();
      assert(wishBox && wishBox.y >= 0 && wishBox.y + wishBox.height <= 500);
      await resize(390, 844);
      assert.equal(await current(p), names.guestbook);
      assert.deepEqual(f.errors, []);
      return { restorations, pageErrors: f.errors };
    } finally {
      await f.context.close();
    }
  });
  await test("reduced-motion-content-navigation-and-gallery", async () => {
    const f = await open(390, 844, preview, { reducedMotion: "reduce" });
    const p = f.page;
    try {
      assert.equal(await p.locator("[data-enhanced]").count(), 0);
      assert.equal(
        await p.locator("[data-cinematic-stage] [inert]").count(),
        0,
      );
      await seek(p, "gallery");
      const opener = p.getByRole("button", { name: /^Perbesar foto 1 dari/ });
      await opener.click();
      await p.locator("dialog[open]").waitFor();
      await p.keyboard.press("Escape");
      assert(await opener.evaluate((n) => n === document.activeElement));
      await seek(p, "rsvp");
      assert(
        await p.locator("[data-section=rsvp] input[name=name]").isVisible(),
      );
      await seek(p, "closing");
      assert.equal(await current(p), names.closing);
      await screenshot(p, "reduced-motion-closing-390");
      assert.deepEqual(f.errors, []);
      return { pageErrors: f.errors };
    } finally {
      await f.context.close();
    }
  });
  if (fixture)
    for (const query of [
      "optional=1",
      "reorder=1",
      "long=1",
      "empty=1",
      "broken=1",
      "simple=1",
      "nohero=1",
      "nocover=1",
    ])
      await test(`fixture-${query}`, async () => {
        const url = new URL(fixture);
        const [key, value] = query.split("=");
        url.searchParams.set(key, value);
        const f = await open(360, 640, url.href);
        const p = f.page;
        try {
          const ids = await p
            .locator(
              "[data-cinematic-stage] [data-section-id],[data-cinematic-interaction][data-section-id]",
            )
            .evaluateAll((nodes) => nodes.map((n) => n.dataset.sectionId));
          assert.equal(
            new Set(ids).size,
            ids.length,
            "Stable section records must render once",
          );
          await p
            .locator("[data-cinematic-pager] [aria-haspopup=dialog]")
            .click();
          await screenshot(p, `fixture-${key}-chapters`);
          await p
            .locator("dialog")
            .getByRole("button", { name: /Acara/ })
            .click();
          await p.waitForTimeout(1550);
          assert.equal(await current(p), names["event-details"]);
          if (key === "broken") {
            await seek(p, "gallery");
            await p.waitForTimeout(500);
            assert(
              (await p.locator("[data-gallery-frames]").innerText()).includes(
                "Foto belum dapat dimuat",
              ),
            );
          }
          if (key === "optional" || key === "empty")
            assert.equal(
              await p.locator("[data-section=music] button").count(),
              0,
            );
          if (key === "long") {
            await seek(p, "event-details");
            assert(
              (await p
                .locator('[data-event-portal="0"]')
                .getAttribute("data-cinematic-tall")) !== null,
            );
            await screenshot(p, "long-event-360");
          }
          assert.equal(
            await p.evaluate(() =>
              Math.max(0, document.documentElement.scrollWidth - innerWidth),
            ),
            0,
          );
          assert.deepEqual(f.errors, []);
          return { pageErrors: f.errors };
        } finally {
          await f.context.close();
        }
      });
  if (builder)
    await test("real-builder-canvas-ownership-and-live-edits", async () => {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        storageState: process.env.CINEMATIC_STORAGE_STATE,
      });
      const p = await context.newPage();
      const errors = [];
      p.on("pageerror", (e) => errors.push(e.message));
      await p.route("**/api/**", (r) => r.fulfill({ json: [] }));
      try {
        await p.goto(builder, {
          waitUntil: "domcontentloaded",
          timeout: 90000,
        });
        await p
          .locator("[data-cinematic-stage][data-enhanced]")
          .first()
          .waitFor();
        const host = await y(p);
        await p
          .locator("[data-cinematic-pager] [aria-haspopup=dialog]")
          .click();
        await p.locator("dialog").getByRole("button", { name: /RSVP/ }).click();
        await p.waitForTimeout(1700);
        assert.equal(await y(p), host);
        assert(
          (await p
            .locator("[data-device-scroller]")
            .evaluate((n) => n.scrollTop)) > 0,
        );
        assert.equal(await current(p), names.rsvp);
        if (await p.evaluate(() => !!window.__BUILDER__)) {
          await p.evaluate(() => {
            const store = window.__BUILDER__.getState();
            const hero = store.sections.find((s) => s.type === "hero");
            store.setProp(hero.id, "couple_names", "Nama Builder Lokal");
            store.select(hero.id);
          });
          await p.waitForTimeout(400);
          assert(
            (await p.locator("[data-section=hero]").innerText()).includes(
              "Nama Builder Lokal",
            ),
          );
          assert.equal(await y(p), host);
        }
        await screenshot(p, "builder-1440");
        let ownerRestorations;
        if (await p.evaluate(() => !!window.__BUILDER__)) {
          await p.evaluate(() => {
            const owner = document.querySelector("[data-device-scroller]");
            const native = owner.scrollTo.bind(owner);
            window.__oldBuilderOwner = owner;
            window.__oldBuilderRestores = [];
            owner.scrollTo = (...args) => {
              window.__oldBuilderRestores.push(args);
              return native(...args);
            };
          });
          await p.evaluate(() =>
            window.__BUILDER__.getState().setDevice("desktop"),
          );
          await p.waitForTimeout(500);
          assert.equal(
            await p
              .locator(".cinematic-invitation")
              .evaluate((node) =>
                Math.round(node.getBoundingClientRect().width),
              ),
            1120,
            "Builder desktop must use the public reading width",
          );
          assert.equal(await y(p), host);
          assert(
            await p.evaluate(() => !window.__oldBuilderOwner.isConnected),
            "Changing DeviceFrame category replaces its scroll owner",
          );
          await p
            .locator("[data-cinematic-pager] [aria-haspopup=dialog]")
            .click();
          await p
            .locator("dialog")
            .getByRole("button", { name: /RSVP/ })
            .click();
          await p.waitForTimeout(1700);
          assert.equal(await current(p), names.rsvp);
          await p
            .locator("[data-section=rsvp] input[name=name]")
            .fill("Tamu resize Builder");
          await p.waitForTimeout(150);
          await p.evaluate(() => {
            const owner = document.querySelector("[data-device-scroller]");
            const native = owner.scrollTo.bind(owner);
            window.__builderOwner = owner;
            window.__builderRestores = [];
            owner.scrollTo = (...args) => {
              window.__builderRestores.push(args);
              return native(...args);
            };
          });
          const beforeResizeChapter = await current(p);
          ownerRestorations = [];
          for (const height of [800, 1000]) {
            await p.evaluate(() => (window.__builderRestores = []));
            await p.setViewportSize({ width: 1440, height });
            await p.waitForTimeout(500);
            const state = await p.evaluate(() => ({
              sameOwner:
                window.__builderOwner ===
                document.querySelector("[data-device-scroller]"),
              writes: window.__builderRestores.length,
              unmountedWrites: window.__oldBuilderRestores.length,
            }));
            assert(
              state.sameOwner,
              "Resize coverage must use the same actual scroll owner",
            );
            assert.equal(
              state.writes,
              1,
              "One restoration inside the Builder scroll owner",
            );
            assert.equal(
              state.unmountedWrites,
              0,
              "Unmounted owners must not receive stale restoration callbacks",
            );
            assert.equal(await current(p), beforeResizeChapter);
            assert.equal(await y(p), host);
            ownerRestorations.push({ height, ...state });
          }
          await screenshot(p, "builder-desktop-1440");
          await p.evaluate(() => {
            document.activeElement?.blur();
            document
              .querySelector("[data-device-scroller]")
              .scrollTo({ top: 0, behavior: "instant" });
          });
          await p.waitForTimeout(200);
          const ownerBox = await p
            .locator("[data-device-scroller]")
            .boundingBox();
          assert(ownerBox);
          await p.mouse.move(
            ownerBox.x + 4,
            ownerBox.y + Math.min(160, ownerBox.height / 2),
          );
          const seen = new Set();
          let previous = 0;
          for (let step = 0; step < 400; step++) {
            const state = await p.evaluate(() => {
              const owner = document.querySelector("[data-device-scroller]");
              return {
                top: owner.scrollTop,
                end: owner.scrollHeight - owner.clientHeight,
                chapter: document.querySelector("[data-cinematic-pager]")
                  ?.dataset.currentChapter,
              };
            });
            assert(
              state.top >= previous - 1,
              "Builder native scroll must not rebound",
            );
            seen.add(state.chapter);
            previous = state.top;
            if (Math.abs(state.end - state.top) <= 1) break;
            await p.mouse.wheel(0, 180);
            await p.waitForTimeout(60);
          }
          const expected = await p
            .locator(".cinematic-invitation [data-section]")
            .evaluateAll((nodes) => nodes.map((node) => node.dataset.section));
          for (const chapter of expected.filter((type) => names[type]))
            assert(
              seen.has(chapter),
              `Builder native scroll must reach ${chapter}`,
            );
          const remaining = await p
            .locator("[data-device-scroller]")
            .evaluate(
              (owner) =>
                owner.scrollHeight - owner.clientHeight - owner.scrollTop,
            );
          assert(
            Math.abs(remaining) <= 1,
            "Builder native scroll must reach the actual end",
          );
          assert.equal(await y(p), host);
          await screenshot(p, "builder-native-journey-end-1440");
          await p.evaluate(() =>
            window.__BUILDER__
              .getState()
              .setGlobal({ presentationMode: "simple" }),
          );
          await p.waitForTimeout(350);
          assert.equal(
            await p.locator("[data-cinematic-stage][data-enhanced]").count(),
            0,
          );
          assert(
            await p
              .locator("[data-cinematic-stage] [data-scene]")
              .evaluateAll((nodes) =>
                nodes.every(
                  (node) => getComputedStyle(node).visibility === "visible",
                ),
              ),
            "Switching presentation must clear hidden scene styles",
          );
        }
        assert.deepEqual(errors, []);
        return { hostScroll: host, ownerRestorations, pageErrors: errors };
      } finally {
        await context.close();
      }
    });
  if (standard)
    await test("shared-music-standard-template-smoke", async () => {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
      });
      const p = await context.newPage();
      const errors = [];
      p.on("pageerror", (e) => errors.push(e.message));
      await p.route("**/api/**", (r) => r.fulfill({ json: [] }));
      try {
        await p.goto(standard, {
          waitUntil: "domcontentloaded",
          timeout: 90000,
        });
        const cover = p.locator("[data-invitation-cover] button");
        if (await cover.count()) await cover.click();
        assert.equal(await p.locator("[data-cinematic-stage]").count(), 0);
        assert((await p.locator("form").count()) > 0);
        await screenshot(p, "standard-template-390");
        assert.deepEqual(errors, []);
        return { pageErrors: errors };
      } finally {
        await context.close();
      }
    });
  await test("natural-wheel-journey-every-chapter-and-event", async () => {
    const f = await open();
    const p = f.page;
    const seen = new Set(),
      events = new Set();
    try {
      const expected = await p.evaluate(() =>
        [
          ...document.querySelectorAll(".cinematic-invitation [data-section]"),
        ].map((node) => node.dataset.section),
      );
      const chapters = [...new Set(expected.filter((type) => names[type]))];
      await p.mouse.move(2, 280);
      let last = await y(p),
        unchanged = 0;
      for (let step = 0; step < 400; step++) {
        const state = await p.evaluate(() => ({
          y: scrollY,
          chapter: document.querySelector("[data-cinematic-pager]")?.dataset
            .currentChapter,
          events: [...document.querySelectorAll("[data-event-portal]")]
            .filter((node) => {
              const box = node.getBoundingClientRect();
              return (
                getComputedStyle(node).visibility === "visible" &&
                Math.abs((box.left + box.right) / 2 - innerWidth / 2) < 70
              );
            })
            .map((node) => node.dataset.eventPortal),
        }));
        assert(
          state.y >= last - 1,
          "Ordinary forward scrolling must never snap backward",
        );
        if (!seen.has(state.chapter)) {
          seen.add(state.chapter);
          await p.waitForTimeout(450);
          assert((await y(p)) >= state.y - 1);
        }
        state.events.forEach((index) => events.add(index));
        unchanged = state.y === last ? unchanged + 1 : 0;
        last = state.y;
        if (unchanged >= 4) break;
        await p.mouse.wheel(0, 180);
        await p.waitForTimeout(55);
      }
      for (const chapter of chapters)
        assert(seen.has(chapter), `Native wheel journey must reach ${chapter}`);
      assert.equal(
        events.size,
        await p.locator("[data-event-portal]").count(),
        "Native scroll must reach every configured schedule",
      );
      assert.equal(
        await p
          .locator("[data-cinematic-pager]")
          .getAttribute("data-current-chapter"),
        chapters.at(-1),
      );
      const pageEnd = await p.evaluate(() => {
        const owner = document.scrollingElement;
        return {
          top: owner.scrollTop,
          end: owner.scrollHeight - owner.clientHeight,
        };
      });
      assert(
        Math.abs(pageEnd.end - pageEnd.top) <= 1,
        "Native wheel must reach the actual page end",
      );
      await screenshot(p, "natural-journey-end-390");
      assert.deepEqual(f.errors, []);
      return {
        chapters: [...seen],
        events: [...events],
        pageEnd,
        pageErrors: f.errors,
      };
    } finally {
      await f.context.close();
    }
  });
  if (process.env.CINEMATIC_RECORD === "1")
    await test("recorded-guest-journey", async () => {
      const url = new URL(fixture ?? preview);
      if (fixture) url.searchParams.set("template", "cinematic-vintage");
      const f = await open(390, 844, url.href, {
        recordVideo: { dir: output, size: { width: 390, height: 844 } },
      });
      const p = f.page;
      const video = p.video();
      try {
        const go = async (label) => {
          await p
            .locator("[data-cinematic-pager] [aria-haspopup=dialog]")
            .click();
          await p
            .locator("dialog")
            .getByRole("button", { name: new RegExp(label) })
            .click();
          await p.waitForTimeout(1550);
        };
        await p.waitForTimeout(700);
        await go("Kenangan");
        await p.getByRole("button", { name: /^Perbesar foto 1 dari/ }).click();
        await p.waitForTimeout(650);
        await p.keyboard.press("ArrowRight");
        await p.waitForTimeout(600);
        await p.keyboard.press("Escape");
        await go("Acara");
        await p.waitForTimeout(700);
        await go("RSVP");
        const form = p.locator("[data-section=rsvp] form");
        await form
          .getByRole("radio", { name: "Tidak hadir", exact: true })
          .check();
        await p.waitForTimeout(650);
        await go("Tanda Kasih");
        await p.locator("[data-section=gift] summary").click();
        await p.waitForTimeout(600);
        await go("Penutup");
        assert.equal(await current(p), names.closing);
        assert(
          await p
            .getByRole("button", { name: "Akhir perjalanan", exact: true })
            .isDisabled(),
        );
        await p.waitForTimeout(900);
        assert.deepEqual(f.errors, []);
      } finally {
        await f.context.close();
      }
      const target = `${output}/journey-390.webm`;
      await rename(await video.path(), target);
      return {
        video: target,
        source: "Default Cinematic Vintage preset; no submission",
      };
    });
  await test("performance-observation", async () => {
    const f = await open();
    const p = f.page;
    try {
      await p.evaluate(() => {
        window.__signals = { longTasks: [], shifts: [], frames: [] };
        try {
          new PerformanceObserver((list) =>
            window.__signals.longTasks.push(
              ...list.getEntries().map((e) => e.duration),
            ),
          ).observe({ type: "longtask", buffered: false });
          new PerformanceObserver((list) =>
            window.__signals.shifts.push(
              ...list
                .getEntries()
                .filter((e) => !e.hadRecentInput)
                .map((e) => e.value),
            ),
          ).observe({ type: "layout-shift", buffered: false });
        } catch {}
        let last = performance.now(),
          end = last + 3000;
        const frame = (now) => {
          window.__signals.frames.push(now - last);
          last = now;
          if (now < end) requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
      await p.mouse.move(2, 300);
      for (let i = 0; i < 24; i++) {
        await p.mouse.wheel(0, 85);
        await p.waitForTimeout(110);
      }
      await p.waitForTimeout(400);
      const signals = await p.evaluate(() => {
        const s = window.__signals;
        const sorted = s.frames.sort((a, b) => a - b);
        return {
          longTasks: s.longTasks,
          layoutShiftSum: s.shifts.reduce((a, b) => a + b, 0),
          frameSamples: sorted.length,
          rafMedianMs: sorted[Math.floor(sorted.length * 0.5)],
          rafP95Ms: sorted[Math.floor(sorted.length * 0.95)],
          willChangeLayers: [
            ...document.querySelectorAll("[data-depth]"),
          ].filter((n) => getComputedStyle(n).willChange !== "auto").length,
        };
      });
      return {
        signals,
        method:
          "Headless Chromium desktop host; 3-second synthetic scroll sample. RAF gaps do not measure real-device FPS.",
      };
    } finally {
      await f.context.close();
    }
  });
} finally {
  await browser.close();
}
const failed = results.filter((result) => result.status === "FAIL");
const passed = results.filter((result) => result.status === "PASS").length;
const skipped = results.filter((result) => result.status === "SKIP").length;
console.log(
  `${passed}/${results.length} browser scenarios passed; ${skipped} skipped; evidence: ${output}`,
);
if (failed.length) process.exitCode = 1;

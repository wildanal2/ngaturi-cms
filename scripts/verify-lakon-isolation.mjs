// Production comparison: current HEAD plus fd1ef04 Builder versus the audited tree.
// Both URLs must be disposable localhost builds; every mutation is mocked.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const { default: sharp } = await import("sharp");
const final = process.env.BASE_URL || "http://localhost:3061";
const baseline = process.env.BASELINE_URL || "http://localhost:3062";
for (const url of [final, baseline])
  assert(["localhost", "127.0.0.1"].includes(new URL(url).hostname));
const out = process.env.LAKON_OUTPUT || "/tmp/ngaturi-lakon-isolation-browser";
await mkdir(out, { recursive: true });
const browser = await chromium.connectOverCDP(
  process.env.CDP_URL || "http://127.0.0.1:9339",
);
const results = [];
let assertions = 0;
const check = (condition, message) => {
  assertions++;
  assert(condition, message);
};
async function run(name, fn) {
  if (
    process.env.LAKON_CASES &&
    !new RegExp(process.env.LAKON_CASES).test(name)
  )
    return;
  const before = assertions;
  try {
    results.push({
      name,
      status: "PASS",
      ...(await fn()),
      assertions: assertions - before,
    });
  } catch (error) {
    results.push({
      name,
      status: "FAIL",
      assertions: assertions - before,
      error: error.stack,
    });
  }
  console.log(results.at(-1).status, name, results.at(-1).error || "");
  await writeFile(
    `${out}/results.json`,
    JSON.stringify({ assertions, results }, null, 2),
  );
}
function tone() {
  const b = Buffer.alloc(16044);
  b.write("RIFF");
  b.writeUInt32LE(16036, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(8000, 24);
  b.writeUInt32LE(16000, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(16000, 40);
  return b;
}
async function fixture(base, path, width = 390, height = 844, motion) {
  const context = await browser.newContext({
    viewport: { width, height },
    isMobile: width < 500,
    hasTouch: width < 900,
    reducedMotion:
      motion ||
      (path.includes("shell?template=cinematic-vintage")
        ? "no-preference"
        : "reduce"),
    timezoneId: "Asia/Jakarta",
  });
  const state = {
    errors: [],
    requests: [],
    saves: [],
    publishes: 0,
    active: 0,
    maxActive: 0,
    delay: 0,
    fail: false,
    uploads: 0,
  };
  await context.route("**/*", async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    state.requests.push(url.pathname);
    if (!["localhost", "127.0.0.1"].includes(url.hostname))
      return route.abort();
    if (["/invitations", "/login"].includes(url.pathname))
      return route.fulfill({
        contentType: "text/x-component",
        body: '0:{"f":[],"b":"local-fixture"}\n',
      });
    if (req.method() === "POST" && req.headers()["next-action"]) {
      const body = req.postData() || "",
        save = body.includes("global_settings");
      if (save) {
        state.saves.push(body);
        state.active++;
        state.maxActive = Math.max(state.maxActive, state.active);
        await new Promise((r) => setTimeout(r, state.delay));
        state.active--;
      } else state.publishes++;
      return route.fulfill({
        contentType: "text/x-component",
        body: `0:{"a":${JSON.stringify(state.fail ? { ok: false, error: "Gagal simpan fixture lokal" } : { ok: true, slug: "mock-published" })},"f":[]}\n`,
      });
    }
    if (url.pathname === "/__fixture-tone.wav")
      return route.fulfill({ contentType: "audio/wav", body: tone() });
    if (url.pathname === "/api/uploads")
      return route.fulfill({
        json: {
          publicUrl: state.uploads++
            ? "/themes/lakon-kencana/demo-couple.webp"
            : "/themes/lakon-kencana/demo-rings.webp",
        },
      });
    if (url.pathname.startsWith("/api/"))
      return route.fulfill({
        json: url.pathname.includes("public-config") ? {} : { messages: [] },
      });
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method()))
      return route.abort();
    return route.continue();
  });
  await context.addInitScript(() => {
    window.__opened = [];
    window.open = (...args) => {
      window.__opened.push(args);
      return null;
    };
    window.__plays = [];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      window.__plays.push(navigator.userActivation.isActive);
      return play.call(this);
    };
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on("pageerror", (error) => state.errors.push(error.message));
  page.on("console", (message) => {
    if (/hydration|hydrating|React error #(418|423|425)/i.test(message.text()))
      state.errors.push(message.text());
  });
  await page.goto(base + path, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.fonts.ready);
  if (path.includes("shell")) {
    await page.locator("[data-device-frame-viewport]").waitFor();
    // The committed frame reserves 0x0 during SSR, then measures on mount.
    // Compare its resting layout after that existing lifecycle has completed.
    await page.waitForFunction(() => {
      const screen = document.querySelector("[data-device-frame-viewport]");
      const reservation = screen?.closest(".origin-top-left")?.parentElement;
      return (
        parseFloat(reservation?.style.width || "0") > 0 &&
        parseFloat(reservation?.style.height || "0") > 0
      );
    });
  } else if (await page.locator("[data-invitation-entry]").count())
    await page
      .locator('[data-invitation-entry][data-loading-state="complete"]')
      .waitFor();
  await page.waitForTimeout(350);
  return { page, context, state };
}
async function lakonSheets(page) {
  return page.evaluate(() =>
    [...document.styleSheets]
      .filter((sheet) => {
        try {
          return [...sheet.cssRules].some((rule) =>
            rule.cssText.includes("lakon-kencana_template__"),
          );
        } catch {
          return false;
        }
      })
      .map((sheet) => sheet.href),
  );
}
async function finish(f) {
  check(!f.state.errors.length, `runtime/hydration: ${f.state.errors}`);
  await f.context.close();
}
async function imageDiff(a, b, name) {
  const x = await sharp(a)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const y = await sharp(b)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  check(
    x.info.width === y.info.width && x.info.height === y.info.height,
    `${name}: screenshot dimensions preserved`,
  );
  let changed = 0;
  for (let i = 0; i < x.data.length; i += 3)
    if ([0, 1, 2].some((c) => Math.abs(x.data[i + c] - y.data[i + c]) > 16))
      changed++;
  const ratio = changed / (x.info.width * x.info.height);
  check(
    ratio < 0.005,
    `${name}: baseline pixel difference ${(ratio * 100).toFixed(3)}% exceeds 0.5%`,
  );
  return ratio;
}
async function capture(page, file, locator) {
  // GIF playback cannot be frozen by screenshot animations:disable. Hide only
  // these image pixels in BOTH comparisons while retaining layout and sources.
  await page.addStyleTag({
    content: 'img[src$=".gif"] { visibility:hidden !important }',
  });
  const path = `${out}/${file}.png`;
  await (locator || page).screenshot({ path, animations: "disabled" });
  return path;
}
async function geometry(page) {
  return page.evaluate(() => {
    const screen = document.querySelector("[data-device-frame-viewport]"),
      main = document.querySelector("main"),
      r = screen.getBoundingClientRect(),
      m = main.getBoundingClientRect();
    return {
      width: screen.clientWidth,
      height: screen.clientHeight,
      mainWidth: m.width,
      mainBottom: m.bottom,
      left: r.left,
      right: r.right,
      visualHeight: r.height,
      docWidth: document.documentElement.scrollWidth,
      viewport: innerWidth,
    };
  });
}
for (const id of ["gerbang-puspa", "cinematic-vintage", "sage-emas-klasik"])
  for (const width of [360, 390, 1440])
    await run(`Builder baseline ${id} ${width}`, async () => {
      const captures = [];
      for (const [label, base] of [
        ["baseline", baseline],
        ["final", final],
      ]) {
        const f = await fixture(
            base,
            `/lakon-validation-shell?template=${id}`,
            width,
            width === 1440 ? 1000 : 844,
          ),
          { page } = f;
        try {
          const g = await geometry(page);
          check(g.docWidth === width, "no horizontal document overflow");
          check(g.width === 360, "committed logical device width");
          check(
            g.left >= (width === 1440 ? 240 : 0) &&
              g.right <= (width === 1440 ? 1120 : width),
            "scaled frame fits existing Canvas",
          );
          if (width < 1024)
            check(g.height === 780, "committed mobile logical height");
          captures.push({
            geometry: g,
            path: await capture(
              page,
              `${label}-builder-${id}-${width}`,
              page.locator("main"),
            ),
          });
          if (width < 1024) {
            const trigger = page.getByRole("button", {
              name: "Buka panel Bagian",
              exact: true,
            });
            await trigger.click();
            const list = page.locator("#builder-sections"),
              inspector = page.locator("#builder-inspector");
            check(
              (await list.getAttribute("aria-modal")) === "true",
              "sections uses committed modal drawer",
            );
            check(await inspector.isHidden(), "drawers exclusive");
            for (let i = 0; i < 5; i++) {
              await page.keyboard.press("Tab");
              check(
                await list.evaluate((e) => e.contains(document.activeElement)),
                "drawer traps keyboard focus",
              );
            }
            await list
              .getByRole("button", { name: "Rangkaian Acara", exact: true })
              .click();
            check(
              (await inspector.isVisible()) && (await list.isHidden()),
              "selection hands off to Inspector",
            );
            check(
              await page.locator("main").evaluate((e) => e.inert),
              "background inert during drawer",
            );
            await page.keyboard.press("Escape");
            check(
              await trigger.evaluate((e) => e === document.activeElement),
              "Escape restores original trigger focus",
            );
            await page.waitForTimeout(650);
            const bookmarkVisible = await page.evaluate(() => {
              const owner = document.querySelector("[data-device-scroller]");
              let target =
                owner.querySelector('[data-section="event-details"]') ||
                [...owner.querySelectorAll("[data-section-id]")].find((e) =>
                  [...e.querySelectorAll("span")].some(
                    (s) => s.textContent === "Rangkaian Acara",
                  ),
                );
              if (!target) return false;
              while (
                getComputedStyle(target).display === "contents" &&
                target.firstElementChild
              )
                target = target.firstElementChild;
              const a = target.getBoundingClientRect(),
                b = owner.getBoundingClientRect();
              return a.height > 0 && a.top < b.bottom && a.bottom > b.top;
            });
            check(
              bookmarkVisible,
              "selected event intersects its committed preview viewport",
            );
            // Read the selected wrapper ID from the committed active row.
            const activeName = await page
              .locator("#builder-sections li")
              .filter({
                has: page.getByRole("button", {
                  name: "Rangkaian Acara",
                  exact: true,
                  includeHidden: true,
                }),
              })
              .getAttribute("class");
            check(
              activeName.includes("bg-cream-200"),
              "selected bookmark state preserved",
            );
            await trigger.click();
            await page
              .getByRole("button", { name: "Tutup panel", exact: true })
              .click({ position: { x: width - 4, y: 20 } });
            check(await list.isHidden(), "backdrop closes drawer");
            check(
              (await page
                .getByRole("link", { name: "Pratinjau", exact: true })
                .filter({ visible: true })
                .getAttribute("target")) === "_blank",
              "preview retains committed new-tab link",
            );
          } else {
            check(
              (await page.locator("#builder-sections").isVisible()) &&
                (await page.locator("#builder-inspector").isVisible()),
              "desktop three columns preserved",
            );
            check(
              await page
                .getByRole("navigation", { name: "Aksi Builder" })
                .isHidden(),
              "mobile dock hidden on desktop",
            );
            await page
              .locator("#builder-sections")
              .getByRole("button", {
                name: "Rangkaian Acara",
                exact: true,
              })
              .click();
          }
          await page.waitForTimeout(650);
          // Cinematic's committed composition policy locks its variants, so
          // its Inspector intentionally renders no variant thumbnails.
          if (label === "final" && id !== "cinematic-vintage") {
            await page
              .locator('#builder-inspector [data-lakon-scene="event-details"]')
              .waitFor({ state: "attached" });
          }
          await page.evaluate(() => document.fonts.ready);
          captures.at(-1).sectionStyles = await page.evaluate(() => {
            const owner = document.querySelector("[data-device-scroller]");
            return [...owner.querySelectorAll("[data-section-id]")].map(
              (wrapper) => {
                const content = [...wrapper.children].find(
                  (el) =>
                    el.nodeName !== "SPAN" &&
                    !el.classList.contains("pointer-events-none"),
                );
                const style = content && getComputedStyle(content);
                return {
                  id: wrapper.dataset.sectionId,
                  padding: style?.padding,
                  font: style?.font,
                  color: style?.color,
                  display: style?.display,
                  // Each disposable server has its own origin; compare the
                  // same asset path and all CSS values, not ports 3061/3062.
                  background: style?.background.replaceAll(
                    location.origin,
                    "<fixture-origin>",
                  ),
                  overflow: style?.overflow,
                  position: style?.position,
                };
              },
            );
          });
          if (id === "gerbang-puspa") {
            captures.at(-1).descendantStyles = await page.evaluate(() => {
              const properties = [
                "width",
                "height",
                "margin",
                "padding",
                "font",
                "color",
                "background",
                "border-top",
                "border-right",
                "border-bottom",
                "border-left",
                "border-radius",
                "display",
                "position",
                "overflow",
                "gap",
                "text-align",
                "transform",
                "opacity",
              ];
              return [
                ...document.querySelectorAll(
                  "main [data-scene], main [data-scene] *",
                ),
              ].map((element) => {
                const style = getComputedStyle(element);
                return {
                  scene: element.closest("[data-scene]").dataset.scene,
                  tag: element.tagName,
                  styles: Object.fromEntries(
                    properties.map((property) => [
                      property,
                      style
                        .getPropertyValue(property)
                        .replaceAll(location.origin, "<fixture-origin>"),
                    ]),
                  ),
                };
              });
            });
          }
          // Bookmark reachability is asserted above. Compare appearance at the
          // same reading position, after all Inspector thumbnails have loaded;
          // native smooth scrolling can settle at different intermediate frames.
          await page.evaluate(() => {
            const owner = document.querySelector("[data-device-scroller]");
            let target =
              owner.querySelector('[data-section="event-details"]') ||
              [...owner.querySelectorAll("[data-section-id]")].find((e) =>
                [...e.querySelectorAll("span")].some(
                  (s) => s.textContent === "Rangkaian Acara",
                ),
              );
            while (target && getComputedStyle(target).display === "contents")
              target = target.firstElementChild;
            target?.scrollIntoView({ block: "start", behavior: "instant" });
          });
          await page.waitForTimeout(350);
          captures.at(-1).afterInspector = await capture(
            page,
            `${label}-builder-${id}-${width}-after-inspector`,
            page.locator("main"),
          );
          check(
            !(await page.locator("main [data-lakon-root]").count()),
            "no Lakon wrapper around legacy Canvas",
          );
          await finish(f);
        } catch (error) {
          await f.context.close();
          throw error;
        }
      }
      const a = captures[0].geometry,
        b = captures[1].geometry;
      await writeFile(
        `${out}/styles-${id}-${width}.json`,
        JSON.stringify(captures, null, 2),
      );
      check(
        JSON.stringify(captures[0].sectionStyles) ===
          JSON.stringify(captures[1].sectionStyles),
        "all legacy section style signatures preserved after opening Inspector",
      );
      if (id === "gerbang-puspa") {
        check(
          JSON.stringify(captures[0].descendantStyles) ===
            JSON.stringify(captures[1].descendantStyles),
          "Gerbang frames, headings, monogram and descendant geometry retain baseline styles",
        );
      }
      for (const key of Object.keys(a))
        check(
          Math.abs(a[key] - b[key]) < 1,
          `baseline geometry ${key} preserved`,
        );
      return {
        pixelDifference: await imageDiff(
          captures[0].path,
          captures[1].path,
          `${id} ${width}`,
        ),
        afterInspectorDifference: await imageDiff(
          captures[0].afterInspector,
          captures[1].afterInspector,
          `${id} ${width} after Inspector`,
        ),
        geometry: b,
      };
    });

async function seek(page, type) {
  let target = page.locator(`[data-section="${type}"]`).first();
  while (
    await target.evaluate(
      (e) =>
        getComputedStyle(e).display === "contents" && !!e.firstElementChild,
    )
  )
    target = target.locator(":scope > *").first();
  await target.evaluate((el) => {
    const stage = el.closest("[data-cinematic-stage]");
    if (
      stage &&
      !stage.dispatchEvent(
        new CustomEvent("cinematic:seek", {
          detail: el.closest("[data-section-id]")?.dataset.sectionId,
          cancelable: true,
        }),
      )
    )
      return;
    el.scrollIntoView({ block: "start", behavior: "instant" });
  });
  await page.waitForTimeout(700);
  return target;
}
for (const id of ["gerbang-puspa", "cinematic-vintage", "sage-emas-klasik"])
  await run(`Public baseline ${id}`, async () => {
    const samples = [];
    for (const [label, base] of [
      ["baseline", baseline],
      ["final", final],
    ]) {
      const f = await fixture(base, `/isolation-validation?template=${id}`),
        { page } = f;
      try {
        const cover = await capture(page, `${label}-public-${id}-cover`);
        await page
          .locator("[data-invitation-cover]")
          .getByRole("button", { name: /Buka Undangan/i })
          .first()
          .click();
        await page.waitForTimeout(1500);
        // Sage intentionally begins with Couple after its cover; it has no Hero row.
        const hero = await seek(
            page,
            id === "sage-emas-klasik" ? "couple-intro" : "hero",
          ),
          h = await hero.boundingBox();
        check(h.height > 0, "hero renders after opening");
        const heroPath = await capture(page, `${label}-public-${id}-hero`);
        const nav = page.locator("nav").filter({ visible: true });
        check((await nav.count()) > 0, "public navigation available");
        const events = await seek(page, "event-details");
        check((await events.boundingBox()).height > 0, "events reachable");
        const rsvp = await seek(page, "rsvp");
        check((await rsvp.boundingBox()).height > 0, "RSVP reachable");
        if (id === "gerbang-puspa") {
          await page.locator("[data-gp-rsvp-launch]").click();
          check(
            (await page.locator("dialog[open] form").count()) > 0,
            "existing RSVP dialog opens",
          );
          await page.keyboard.press("Escape");
        } else {
          check(
            (await rsvp.locator("form").count()) > 0,
            "existing RSVP form remains available",
          );
        }
        const closing = await seek(page, "closing");
        check((await closing.boundingBox()).height > 0, "closing reachable");
        const closePath = await capture(page, `${label}-public-${id}-closing`);
        check(
          (await page.locator("audio").count()) === 1,
          "single existing music controller",
        );
        check(
          await page.evaluate(() => window.__plays.length > 0),
          "configured music attempted without blocking opening",
        );
        check(
          !f.state.requests.some((url) =>
            url.startsWith("/themes/lakon-kencana/"),
          ),
          "legacy public page requests no Lakon assets",
        );
        check(
          (await page
            .locator(
              "[data-lakon-root], [data-lakon-navigation], [data-lakon-cover]",
            )
            .count()) === 0,
          "no Lakon runtime/chrome",
        );
        check(
          await page.evaluate(
            () =>
              !getComputedStyle(document.documentElement).getPropertyValue(
                "--lk-ink",
              ),
          ),
          "no leaked Lakon root variables",
        );
        samples.push({
          cover,
          hero: heroPath,
          closing: closePath,
          sections: await page
            .locator("[data-section]")
            .evaluateAll((es) => es.map((e) => e.dataset.section)),
        });
        await finish(f);
      } catch (error) {
        await f.context.close();
        throw error;
      }
    }
    check(
      JSON.stringify(samples[0].sections) ===
        JSON.stringify(samples[1].sections),
      "legacy section flow unchanged",
    );
    return {
      pixels: await Promise.all(
        ["cover", "hero", "closing"].map((key) =>
          imageDiff(samples[0][key], samples[1][key], `${id} ${key}`),
        ),
      ),
    };
  });

await run(
  "Serialized autosave and existing publish callback through mocked transport",
  async () => {
    const f = await fixture(final, "/lakon-validation-shell", 390),
      { page, state } = f;
    try {
      await page
        .getByRole("button", { name: "Buka panel Bagian", exact: true })
        .click();
      await page
        .locator("#builder-sections")
        .getByRole("button", { name: "Sampul / Pembuka", exact: true })
        .click();
      const input = page
        .locator("#builder-inspector")
        .getByLabel(/^Nama/)
        .first();
      state.delay = 900;
      await input.fill("Edit Pertama & Pasangan");
      await page.waitForTimeout(1300);
      check(state.active === 1, "first autosave in flight");
      await input.fill("Edit Terakhir & Pasangan");
      await page.keyboard.press("Escape");
      await page
        .getByRole("navigation", { name: "Aksi Builder" })
        .getByRole("button", { name: "Publikasikan", exact: true })
        .click();
      await page.keyboard.press("Control+s");
      await page.waitForTimeout(2400);
      check(
        state.saves.length === 2 && state.maxActive === 1,
        "two changed snapshots, one save in flight at most",
      );
      check(
        state.saves.at(-1).includes("Edit Terakhir & Pasangan"),
        "latest authored snapshot saved",
      );
      check(
        state.publishes === 1,
        "existing publish transport called once after save drain",
      );
      check(
        await page.evaluate(
          () =>
            window.__opened.length === 1 &&
            window.__opened[0][0] === "/mock-published",
        ),
        "mock publish result reaches original callback",
      );
      await page
        .getByRole("button", { name: "Buka panel Editor", exact: true })
        .click();
      state.fail = true;
      state.delay = 0;
      await input.fill("Gagal & Coba Lagi");
      await page.waitForTimeout(1500);
      await page.keyboard.press("Escape");
      check(
        (
          await page
            .getByRole("navigation", { name: "Aksi Builder" })
            .locator("..")
            .innerText()
        ).includes("Gagal simpan"),
        "failed save retains visible error state",
      );
      state.fail = false;
      await page.keyboard.press("Control+s");
      await page.waitForTimeout(500);
      check(
        (
          await page
            .getByRole("navigation", { name: "Aksi Builder" })
            .locator("..")
            .innerText()
        ).includes("Tersimpan"),
        "existing keyboard save retries successfully",
      );
      await finish(f);
      return {
        saves: state.saves.length,
        maxConcurrent: state.maxActive,
        mockedPublishes: state.publishes,
      };
    } catch (error) {
      await f.context.close();
      throw error;
    }
  },
);

await run(
  "Lakon follows committed scaled DeviceFrame and independent portrait fields",
  async () => {
    const f = await fixture(final, "/lakon-validation-shell", 360),
      { page } = f;
    try {
      const scroller = page.locator("[data-device-scroller]");
      check(
        (await geometry(page)).width === 360,
        "original preset dimensions retained",
      );
      check(
        (await scroller.boundingBox()).width < 360,
        "narrow frame is visually scaled by committed Builder",
      );
      await page
        .locator("[data-lakon-navigation]")
        .getByRole("button", { name: "Acara", exact: true })
        .click();
      await page.waitForTimeout(650);
      const target = page.locator('[data-lakon-scene="event-details"]'),
        y = (await target.boundingBox()).y - (await scroller.boundingBox()).y;
      check(
        y >= 0 && y < 24,
        `Lakon navigation converts visual to logical coordinates (${y})`,
      );
      check(
        (await page
          .locator('[data-lakon-navigation] [aria-current="location"]')
          .innerText()) === "Acara",
        "active destination agrees with scaled frame",
      );
      check(
        (await target.locator("article").count()) === 2,
        "both events remain in native flow",
      );
      await page
        .getByRole("button", { name: "Buka panel Bagian", exact: true })
        .click();
      await page
        .locator("#builder-sections")
        .getByRole("button", { name: "Mempelai", exact: true })
        .click();
      const inspector = page.locator("#builder-inspector");
      for (const group of ["Mempelai Wanita", "Mempelai Pria"]) {
        await inspector
          .getByRole("group", { name: group, exact: true })
          .locator("input[type=file]")
          .setInputFiles(
            resolve("public/themes/lakon-kencana/demo-rings.webp"),
          );
        await page
          .getByRole("button", { name: "Pakai tanpa crop", exact: true })
          .click();
        await page.mouse.move(3, 3);
        await page
          .getByText("Foto disimpan & dioptimasi", { exact: true })
          .waitFor({ state: "hidden" });
      }
      check(
        (await page
          .locator('img[alt="Sekar Ayu Lestari"]')
          .first()
          .getAttribute("src")) === "/themes/lakon-kencana/demo-rings.webp",
        "bride source stays independent",
      );
      check(
        (await page
          .locator('img[alt="Bagas Pradipta"]')
          .first()
          .getAttribute("src")) === "/themes/lakon-kencana/demo-couple.webp",
        "groom source stays independent",
      );
      await page.keyboard.press("Escape");
      await page.waitForTimeout(650);
      await capture(page, "lakon-committed-builder-360");
      await finish(f);
    } catch (error) {
      await f.context.close();
      throw error;
    }
  },
);

// Characterize a pre-existing integration limit without changing the user's Builder.
// Normal-motion bookmarks above must pass; reduced mode is compared explicitly.
await run(
  "Cinematic reduced-motion event bookmark baseline characterization",
  async () => {
    const observations = [];
    for (const base of [baseline, final]) {
      const f = await fixture(
        base,
        "/lakon-validation-shell?template=cinematic-vintage",
        390,
        844,
        "reduce",
      );
      try {
        await f.page
          .getByRole("button", { name: "Buka panel Bagian", exact: true })
          .click();
        await f.page
          .locator("#builder-sections")
          .getByRole("button", { name: "Rangkaian Acara", exact: true })
          .click();
        await f.page.keyboard.press("Escape");
        await f.page.waitForTimeout(700);
        observations.push(
          await f.page.evaluate(() => {
            const owner = document.querySelector("[data-device-scroller]");
            const anchor = owner.querySelector('[data-event-portal="0"]');
            const a = anchor.getBoundingClientRect(),
              b = owner.getBoundingClientRect();
            return {
              visible: a.top < b.bottom && a.bottom > b.top,
              scrollTop: owner.scrollTop,
              top: a.top - b.top,
            };
          }),
        );
        await finish(f);
      } catch (error) {
        await f.context.close();
        throw error;
      }
    }
    check(
      observations[0].visible === observations[1].visible,
      "reduced bookmark preserves baseline behavior",
    );
    check(
      Math.abs(observations[0].scrollTop - observations[1].scrollTop) < 1,
      "reduced bookmark scroll position unchanged",
    );
    return {
      status: observations[0].visible ? "PASS" : "BASELINE_LIMITATION",
      observations,
      note: "Reduced mode has no timeline seek handler; its display:contents event wrapper cannot receive native scrollIntoView. Both states reproduce the same pre-existing limitation. Normal-motion bookmarks retain strict reachability checks above.",
    };
  },
);

for (const opened of [false, true])
  await run(`Lakon SPA cleanup ${opened ? "opened" : "closed"}`, async () => {
    const f = await fixture(
        final,
        "/isolation-validation?template=lakon-kencana",
      ),
      { page } = f;
    try {
      if (opened) {
        await page
          .getByRole("button", { name: "Buka Undangan", exact: true })
          .click();
        await page.locator('[data-lakon-root][data-state="opened"]').waitFor();
      }
      check(
        (await lakonSheets(page)).length === 1,
        "one deduplicated Lakon stylesheet while mounted",
      );
      await page.evaluate(() => {
        window.__lakonAudio = [...document.querySelectorAll("audio")];
      });
      await page.locator("[data-fixture-switch]").evaluate((el) => el.click());
      await page.waitForURL(/template=sage-emas-klasik/);
      await page.waitForTimeout(600);
      check(
        (await page.locator("[data-lakon-root]").count()) === 0,
        "Lakon controller unmounted on client navigation",
      );
      check(
        await page.evaluate(
          () =>
            document.documentElement.style.overflow !== "hidden" &&
            document.body.style.overflow !== "hidden",
        ),
        "document scroll locks released",
      );
      check(
        await page.evaluate(
          () => document.documentElement.style.scrollPaddingBottom === "",
        ),
        "Lakon document clearance restored",
      );
      check(
        await page.evaluate(() => history.scrollRestoration === "auto"),
        "history restoration restored",
      );
      check(
        (await page.locator('[class*="lakon-kencana_"]').count()) === 0,
        "no Lakon content, navigation, music or lightbox survives navigation",
      );
      check(
        (await lakonSheets(page)).length <= 1,
        "cached stylesheet remains deduplicated after unmount",
      );
      await page.evaluate(() => {
        window.dispatchEvent(new Event("ngaturi:open"));
        window.dispatchEvent(new Event("resize"));
        window.scrollTo(0, 500);
      });
      await page.waitForTimeout(150);
      check(
        await page.evaluate(() =>
          window.__lakonAudio.every(
            (audio) => !audio.isConnected && audio.paused,
          ),
        ),
        "removed Lakon audio is paused and does not react to a new opening event",
      );
      check(
        await page.evaluate(() => scrollY > 0),
        "native scrolling works after cleanup",
      );
      await page.goBack();
      await page.locator("[data-lakon-root]").waitFor();
      check(
        (await lakonSheets(page)).length === 1,
        "remount reuses single style resource",
      );
      await finish(f);
    } catch (error) {
      await f.context.close();
      throw error;
    }
  });
await browser.close();
console.log(
  JSON.stringify({
    assertions,
    passed: results.filter((r) => r.status === "PASS").length,
    failed: results.filter((r) => r.status === "FAIL").length,
    baselineLimitations: results.filter(
      (r) => r.status === "BASELINE_LIMITATION",
    ).length,
  }),
);
if (results.some((r) => r.status === "FAIL")) process.exitCode = 1;

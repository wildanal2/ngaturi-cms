// Local production motion acceptance; every submission and action is mocked.
// BASE_URL=http://localhost:3062 CDP_URL=http://127.0.0.1:9340 PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/verify-lakon-motion.mjs
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.BASE_URL || "http://localhost:3062";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const out = process.env.LAKON_OUTPUT || "/tmp/ngaturi-lakon-motion-browser";
await mkdir(out, { recursive: true });
const browser = await chromium.connectOverCDP(
  process.env.CDP_URL || "http://127.0.0.1:9340",
);
const results = [];
async function test(name, run) {
  if (
    process.env.LAKON_CASES &&
    !new RegExp(process.env.LAKON_CASES).test(name)
  )
    return;
  try {
    results.push({ name, status: "PASS", detail: await run() });
    console.log("PASS", name);
  } catch (error) {
    results.push({ name, status: "FAIL", error: error.stack });
    console.error("FAIL", name, error.message);
  }
  await writeFile(
    `${out}/motion-results.json`,
    JSON.stringify(results, null, 2),
  );
}
async function fixture({
  width = 390,
  reduced = false,
  builder = false,
  missing = "",
  video = false,
  template = "",
} = {}) {
  const context = await browser.newContext({
    viewport: { width, height: 844 },
    reducedMotion: reduced ? "reduce" : "no-preference",
    hasTouch: width < 500,
    ...(video
      ? {
          recordVideo: {
            dir: `${out}/video`,
            size: { width: 390, height: 844 },
          },
        }
      : {}),
  });
  const requests = [];
  await context.route("**/*", async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    requests.push({ method: req.method(), url: req.url() });
    if (!["localhost", "127.0.0.1"].includes(url.hostname))
      return route.abort();
    if (req.method() === "POST")
      return route.fulfill({
        contentType: req.headers()["next-action"]
          ? "text/x-component"
          : "application/json",
        body: req.headers()["next-action"]
          ? '0:{"a":{"ok":true,"slug":"local-motion"},"f":[]}\n'
          : '{"ok":true}',
      });
    if (url.pathname.startsWith("/api/"))
      return route.fulfill({
        json: url.pathname.includes("public-config")
          ? { turnstileSiteKey: "" }
          : { messages: [] },
      });
    return route.continue();
  });
  await context.addInitScript(
    ({ missing }) => {
      window.__lakonMotion = [];
      window.__lakonObservers = [];
      let id = 0;
      const ids = new WeakMap();
      const animate = Element.prototype.animate;
      Element.prototype.animate = function (frames, options) {
        const result = animate.call(this, frames, options);
        if (this.closest("[data-lakon-root]")) {
          if (!ids.has(this)) ids.set(this, ++id);
          window.__lakonMotion.push({
            id: ids.get(this),
            node: this,
            scene: this.closest("[data-lakon-scene]")?.dataset.lakonScene,
            delay: options?.delay,
            duration: options?.duration,
            root: !!this.closest("[data-device-scroller]"),
          });
        }
        return result;
      };
      const Observer = window.IntersectionObserver;
      window.IntersectionObserver = class extends Observer {
        constructor(callback, options) {
          super(callback, options);
          this.record = {
            root: !!options?.root,
            nodes: [],
            disconnected: false,
          };
          window.__lakonObservers.push(this.record);
        }
        observe(node) {
          this.record.nodes.push(node);
          this.record.disconnected = false;
          return super.observe(node);
        }
        disconnect() {
          this.record.disconnected = true;
          return super.disconnect();
        }
      };
      if (missing === "observer") window.IntersectionObserver = undefined;
      if (missing === "animation") Element.prototype.animate = undefined;
    },
    { missing },
  );
  const page = await context.newPage(),
    errors = [];
  page.setDefaultTimeout(10000);
  page.on("pageerror", (error) => errors.push(error.message));
  const path = template
    ? builder
      ? `/lakon-validation-shell?template=${template}`
      : `/isolation-validation?template=${template}&open=1`
    : builder
      ? "/lakon-validation-shell"
      : "/lakon-validation-public?gift=1";
  await page.goto(base + path, { waitUntil: "domcontentloaded" });
  if (!template) {
    await page.locator("[data-lakon-root]").waitFor();
    if (!builder) {
      await page
        .locator('[data-invitation-entry][data-loading-state="complete"]')
        .waitFor();
    }
  }
  await page.evaluate(() => document.fonts.ready);
  if (missing === "observer-throws") {
    // Fail the motion observer after framework/loading initialization.
    await page.evaluate(() => {
      window.IntersectionObserver = class {
        constructor() {
          throw Error("Fixture: motion observer unavailable");
        }
      };
    });
  }
  return { page, context, errors, requests };
}
async function open(page) {
  const time = Date.now();
  await page
    .locator("[data-lakon-cover]")
    .getByRole("button", { name: "Buka Undangan", exact: true })
    .click();
  await page.locator('[data-lakon-root][data-state="opened"]').waitFor();
  return Date.now() - time;
}
const scene = (page, type) =>
  page.locator(`[data-lakon-scene="${type}"]`).first();
async function seek(page, type) {
  await scene(page, type).evaluate((e) =>
    e.scrollIntoView({ block: "center", behavior: "instant" }),
  );
  await page.waitForTimeout(120);
}
async function visible(page) {
  return page
    .locator("[data-lakon-entrance]")
    .evaluateAll((es) =>
      es.filter((e) => e.getClientRects().length && !e.closest("[hidden]")),
    )
    .then((es) => es.length);
}
for (const width of [320, 390, 1440])
  for (const reduced of [false, true]) {
    await test(`public ${width} ${reduced ? "reduced" : "normal"}`, async () => {
      const f = await fixture({
        width,
        reduced,
        video: width === 390 && !reduced,
      });
      const { page, context, errors } = f;
      try {
        const openingMs = await open(page);
        assert(openingMs < (reduced ? 700 : 1800), "opening has no extra wait");
        await page.waitForTimeout(950);
        assert(
          await page.evaluate(() =>
            document.activeElement?.matches('[data-lakon-scene="hero"] h1'),
          ),
          "opening transfers heading focus",
        );
        const height = await page.evaluate(
          () => document.documentElement.scrollHeight,
        );
        await page.mouse.move(width / 2, 390);
        for (let y = 0; y < height; y += 540) {
          await page.mouse.wheel(0, 540);
          await page.waitForTimeout(90);
        }
        await page.waitForTimeout(1000);
        const motions = await page.evaluate(() =>
          window.__lakonMotion.map(({ id, scene, delay, duration, root }) => ({
            id,
            scene,
            delay,
            duration,
            root,
          })),
        );
        for (const type of [
          "hero",
          "couple-intro",
          "event-details",
          "countdown",
          "gallery",
          "rsvp",
          "guestbook",
          "gift",
          "closing",
        ])
          assert(
            reduced || motions.some((m) => m.scene === type),
            `entrance: ${type}`,
          );
        assert(
          new Set(motions.map((m) => m.id)).size === motions.length,
          "default reveal runs once per mount",
        );
        assert(
          !reduced || motions.length === 0,
          "reduced motion does not start WAAPI reveals",
        );
        await seek(page, "event-details");
        assert(
          (await scene(page, "event-details").locator("article").count()) === 2,
        );
        for (const card of await scene(page, "event-details")
          .locator("article")
          .all()) {
          for (const link of await card.getByRole("link").all()) {
            assert(await link.isEnabled());
            assert((await link.getAttribute("href")).startsWith("https://"));
          }
        }
        await seek(page, "rsvp");
        await scene(page, "rsvp")
          .getByRole("button", { name: "Hadir", exact: true })
          .click();
        const input = scene(page, "rsvp").locator('input[name="name"]');
        await input.focus();
        await input.pressSequentially("Tamu lokal", { delay: 40 });
        const stable = await input.boundingBox();
        await page.waitForTimeout(300);
        const after = await input.boundingBox();
        assert(
          Math.abs(stable.y - after.y) < 1,
          "form stays still while typing",
        );
        assert((await input.inputValue()) === "Tamu lokal");
        await seek(page, "gallery");
        await page.waitForTimeout(800);
        await scene(page, "gallery")
          .getByRole("button", { name: "Foto berikutnya", exact: true })
          .click();
        await page.waitForTimeout(700);
        await scene(page, "gallery")
          .getByRole("button", { name: /Perbesar foto/ })
          .click();
        assert((await page.locator("dialog[open]").count()) === 1);
        await page.keyboard.press("Escape");
        assert((await page.locator("dialog[open]").count()) === 0);
        await seek(page, "closing");
        await page.waitForTimeout(900);
        await page.screenshot({
          path: `${out}/closing-${width}-${reduced}.png`,
        });
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          "no horizontal layout jump",
        );
        assert((await visible(page)) > 10, "all resting blocks remain in flow");
        if (reduced)
          assert(
            (await page.evaluate(
              () =>
                document
                  .getAnimations()
                  .filter(
                    (a) =>
                      a.effect?.target?.closest("[data-lakon-root]") &&
                      a.playState === "running",
                  ).length,
            )) === 0,
          );
        assert.deepEqual(errors, []);
        return {
          openingMs,
          revealCount: motions.length,
          scenes: [...new Set(motions.map((m) => m.scene))],
        };
      } finally {
        await context.close();
      }
    });
  }
for (const reduced of [false, true])
  await test(`Builder native root ${reduced ? "reduced" : "normal"}`, async () => {
    const { page, context, errors } = await fixture({
      width: 1440,
      builder: true,
      reduced,
    });
    try {
      await page.locator("[data-device-scroller] [data-lakon-root]").waitFor();
      const windowY = await page.evaluate(() => scrollY);
      for (const type of [
        "hero",
        "couple-intro",
        "event-details",
        "gallery",
        "rsvp",
        "closing",
      ])
        await seek(page, type);
      await page.waitForTimeout(950);
      const motions = await page.evaluate(() =>
        window.__lakonMotion.map(({ id, scene, delay, duration, root }) => ({
          id,
          scene,
          delay,
          duration,
          root,
        })),
      );
      assert(
        reduced || motions.length > 6,
        "Builder has actual running entrance controllers",
      );
      assert(
        motions.every((m) => m.root),
        "all motion targets have Canvas owner",
      );
      const roots = await page.evaluate(() =>
        window.__lakonObservers
          .filter((o) =>
            o.nodes.some((n) =>
              n.closest?.("[data-lakon-entrance],[data-lakon-parallax]"),
            ),
          )
          .map((o) => o.root),
      );
      assert(
        roots.every(Boolean),
        "observer roots are actual DeviceFrame scrollers",
      );
      assert(
        (await page.evaluate(() => scrollY)) === windowY,
        "Builder scroll never moves public document",
      );
      assert(
        (await page
          .locator("[data-device-scroller]")
          .evaluate((e) => e.scrollTop)) > 0,
      );
      assert(!reduced || motions.length === 0);
      await page.screenshot({ path: `${out}/builder-${reduced}.png` });
      assert.deepEqual(errors, []);
      return { revealCount: motions.length, canvasObservers: roots.length };
    } finally {
      await context.close();
    }
  });
for (const missing of ["observer", "observer-throws", "animation"])
  await test(`progressive fallback ${missing}`, async () => {
    const { page, context, errors } = await fixture({ missing });
    try {
      await open(page);
      await seek(page, "closing");
      await page.waitForTimeout(800);
      assert((await visible(page)) > 10);
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  });
await test("runtime reduced motion cancels reveals and parallax", async () => {
  const { page, context, errors } = await fixture({ width: 1440 });
  try {
    await open(page);
    await page.waitForTimeout(200);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(60);
    assert(
      (await page.evaluate(
        () =>
          document
            .getAnimations()
            .filter(
              (a) => a.id === "lakon-entrance" && a.playState === "running",
            ).length,
      )) === 0,
    );
    assert(
      (
        await page
          .locator("[data-lakon-parallax]")
          .evaluateAll((es) => es.map((e) => e.style.translate))
      ).every((v) => !v),
    );
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});
await test("client navigation detaches observers, remounts once and keeps old template clean", async () => {
  const { page, context, errors } = await fixture();
  try {
    await open(page);
    await seek(page, "couple-intro");
    await page.goto(
      base + "/isolation-validation?template=lakon-kencana&open=1",
      { waitUntil: "domcontentloaded" },
    );
    await page.locator("[data-lakon-root]").waitFor();
    await page.waitForTimeout(900);
    await page.locator("[data-fixture-switch]").click();
    await page.waitForURL(
      "**/isolation-validation?template=sage-emas-klasik&open=1",
    );
    await page.waitForTimeout(900);
    assert(
      (await page
        .locator("[data-lakon-root],[data-lakon-navigation]")
        .count()) === 0,
    );
    const pending = await page.evaluate(
      () =>
        window.__lakonObservers.filter(
          (o) =>
            o.nodes.some((n) => n.closest?.("[data-lakon-root]")) &&
            !o.disconnected,
        ).length,
    );
    assert(pending === 0, "Lakon observers disconnected after client unmount");
    await page.goBack();
    await page.locator("[data-lakon-root]").waitFor();
    await page.waitForTimeout(900);
    assert((await page.locator("[data-lakon-root]").count()) === 1);
    assert.deepEqual(errors, []);
    return { pendingObserversAfterUnmount: pending };
  } finally {
    await context.close();
  }
});
for (const template of ["gerbang-puspa", "cinematic-vintage"]) {
  for (const width of [390, 1440])
    await test(`old public ${template} ${width}`, async () => {
      const { page, context, errors, requests } = await fixture({
        template,
        width,
      });
      try {
        await page
          .locator('[data-section="hero"]')
          .first()
          .waitFor({ state: "attached" });
        await page
          .locator("[data-invitation-entry][data-loading-state=complete]")
          .waitFor();
        await page.waitForTimeout(1400);
        assert((await page.locator("[data-lakon-root]").count()) === 0);
        assert(
          !requests.some((r) =>
            new URL(r.url).pathname.startsWith("/themes/lakon-kencana/"),
          ),
        );
        assert(
          await page.evaluate(
            () =>
              ![...document.styleSheets].some((sheet) => {
                try {
                  return [...sheet.cssRules].some((rule) =>
                    rule.cssText.includes("/themes/lakon-kencana/"),
                  );
                } catch {
                  return false;
                }
              }),
          ),
          "fresh old public loads no Lakon stylesheet",
        );
        await page.screenshot({
          path: `${out}/old-public-${template}-${width}.png`,
        });
        assert.deepEqual(errors, []);
      } finally {
        await context.close();
      }
    });
  await test(`old Inspector thumbnails ${template}`, async () => {
    const { page, context, errors } = await fixture({
      template,
      width: 1440,
      builder: true,
    });
    try {
      const owner = page.locator("[data-device-scroller]");
      await owner
        .locator("[data-section-id]")
        .first()
        .waitFor({ state: "attached" });
      await page.waitForTimeout(1000);
      const signature = () =>
        owner.evaluate((e) =>
          [...e.querySelectorAll("h1,h2,h3")].map((n) => {
            const c = getComputedStyle(n);
            return {
              text: n.textContent,
              color: c.color,
              font: c.font,
              margin: c.margin,
              background: c.backgroundColor,
            };
          }),
        );
      const before = await signature();
      await page
        .locator("#builder-sections")
        .getByRole("button", { name: "Rangkaian Acara", exact: true })
        .click();
      const inspector = page.locator("#builder-inspector");
      await inspector.waitFor({ state: "visible" });
      if (template === "gerbang-puspa") {
        await inspector
          .locator('[data-lakon-scene="event-details"]')
          .waitFor({ state: "attached" });
        assert(
          (await inspector.locator("[role=button][aria-pressed]").count()) > 1,
          "variant thumbnails loaded",
        );
      } else {
        assert(
          (await inspector.innerText()).includes(
            "Tampilan dikendalikan oleh template.",
          ),
          "locked cinematic core remains locked",
        );
        // Guestbook is not core: load its actual thumbnail picker as well.
        await page
          .locator("#builder-sections")
          .getByRole("button", { name: "Buku Tamu", exact: true })
          .click();
        await inspector
          .locator("[role=button][aria-pressed]")
          .first()
          .waitFor({ state: "visible" });
      }
      await page.waitForTimeout(1200);
      assert.deepEqual(
        await signature(),
        before,
        "Canvas heading styles unchanged after Inspector lazy CSS loads",
      );
      assert(
        (await owner.locator("[data-lakon-root]").count()) === 0,
        "Lakon thumbnails stay outside old Canvas",
      );
      assert(
        await owner.evaluate(
          (e) =>
            ![...e.querySelectorAll("*")].some((n) =>
              n.getAnimations().some((a) => a.id === "lakon-entrance"),
            ),
        ),
        "no Lakon motion in old Canvas",
      );
      await page.screenshot({ path: `${out}/old-inspector-${template}.png` });
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  });
}

await browser.close();
assert(
  results.every((r) => r.status === "PASS"),
  "See motion-results.json for failures",
);

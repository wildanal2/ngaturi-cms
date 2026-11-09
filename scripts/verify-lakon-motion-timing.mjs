// Local-only temporal proof: sample actual computed styles and animation progress.
// BASE_URL=http://localhost:3063 CDP_URL=http://127.0.0.1:9341 PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs LAKON_OUTPUT=/tmp/ngaturi-motion-proof node scripts/verify-lakon-motion-timing.mjs
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.BASE_URL || "http://localhost:3063";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const out = process.env.LAKON_OUTPUT || "/tmp/ngaturi-motion-proof";
await mkdir(out, { recursive: true });
const browser = await chromium.connectOverCDP(
  process.env.CDP_URL || "http://127.0.0.1:9341",
);
const results = [];
async function test(name, fn) {
  if (
    process.env.LAKON_CASES &&
    !new RegExp(process.env.LAKON_CASES).test(name)
  )
    return;
  try {
    results.push({ name, status: "PASS", detail: await fn() });
    console.log("PASS", name);
  } catch (e) {
    results.push({ name, status: "FAIL", error: e.stack });
    console.error("FAIL", name, e.message);
  }
  await writeFile(
    `${out}/timing-results.json`,
    JSON.stringify(results, null, 2),
  );
}
async function fixture(width, builder, reduced) {
  const context = await browser.newContext({
    viewport: { width, height: 844 },
    reducedMotion: reduced ? "reduce" : "no-preference",
    hasTouch: width < 500,
    ...(width === 390 && !builder && !reduced
      ? {
          recordVideo: {
            dir: out + "/video",
            size: { width: 390, height: 844 },
          },
        }
      : {}),
  });
  await context.route("**/*", (route) => {
    const req = route.request(),
      u = new URL(req.url());
    if (!["localhost", "127.0.0.1"].includes(u.hostname)) return route.abort();
    if (req.method() === "POST")
      return route.fulfill({
        contentType: req.headers()["next-action"]
          ? "text/x-component"
          : "application/json",
        body: req.headers()["next-action"]
          ? '0:{"a":{"ok":true,"slug":"local-motion"},"f":[]}\n'
          : '{"ok":true}',
      });
    if (u.pathname.startsWith("/api/"))
      return route.fulfill({ json: { messages: [], turnstileSiteKey: "" } });
    return route.continue();
  });
  await context.addInitScript(() => {
    window.__lkProof = [];
    let id = 0;
    const ids = new WeakMap();
    const style = (node) => {
      const css = getComputedStyle(node),
        box = node.getBoundingClientRect();
      return {
        t: performance.now(),
        opacity: Number(css.opacity),
        transform: css.transform,
        translate: css.translate,
        top: box.top,
        height: box.height,
        width: box.width,
      };
    };
    const original = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      const before = style(this),
        animation = original.call(this, frames, options);
      if (this.closest("[data-lakon-root]")) {
        if (!ids.has(this)) ids.set(this, ++id);
        const row = {
          id: ids.get(this),
          scene: this.closest("[data-lakon-scene]")?.dataset.lakonScene,
          root: !!this.closest("[data-device-scroller]"),
          text: this.textContent?.trim().slice(0, 45),
          delay: options?.delay || 0,
          before,
          samples: [],
        };
        window.__lkProof.push(row);
        for (const delay of [0, 60, 160, 320, 600, 950])
          setTimeout(
            () =>
              row.samples.push({
                ...style(this),
                time: animation.currentTime,
                progress: animation.effect.getComputedTiming().progress,
                state: animation.playState,
              }),
            delay,
          );
      }
      return animation;
    };
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(
    base +
      (builder
        ? process.env.LAKON_BUILDER_PATH || "/lakon-validation-shell"
        : "/lakon-validation-public?gift=1"),
    { waitUntil: "domcontentloaded" },
  );
  await page.locator("[data-lakon-root]").waitFor();
  await page.evaluate(() => document.fonts.ready);
  if (!builder)
    await page
      .locator("[data-invitation-entry][data-loading-state=complete]")
      .waitFor();
  return { page, context, errors };
}
async function move(page, type) {
  await page
    .locator(`[data-lakon-scene="${type}"]`)
    .first()
    .evaluate((e) => e.scrollIntoView({ block: "start", behavior: "instant" }));
  await page.waitForTimeout(1050);
}
async function samples(locator, duration = 750) {
  return locator.evaluate(async (el, duration) => {
    const rows = [];
    for (let t = 0; t <= duration; t += 75) {
      const c = getComputedStyle(el);
      rows.push({
        t,
        opacity: Number(c.opacity),
        transform: c.transform,
        translate: c.translate,
        animations: el.getAnimations().map((a) => ({
          name: a.animationName || a.id,
          progress: a.effect.getComputedTiming().progress,
          time: a.currentTime,
          state: a.playState,
        })),
      });
      await new Promise((r) => setTimeout(r, 75));
    }
    return rows;
  }, duration);
}
const transformsChanged = (rows) =>
  new Set(rows.map((r) => r.transform)).size > 2;
const actualReveal = (row) =>
  row.samples.some(
    (s) => s.progress > 0 && s.progress < 1 && s.opacity < 0.99,
  ) &&
  row.samples.some((s) => s.opacity > 0.99) &&
  new Set(row.samples.map((s) => s.transform)).size > 2;
for (const width of [320, 390, 1440])
  for (const builder of [false, true])
    for (const reduced of [false, true])
      await test(`${builder ? "Builder" : "public"} ${width} ${reduced ? "reduced" : "normal"} temporal`, async () => {
        const { page, context, errors } = await fixture(
          width,
          builder,
          reduced,
        );
        let details = {};
        try {
          if (!builder) {
            const cover = page.locator("[data-lakon-cover]");
            const before = await cover.evaluate(
              (e) => getComputedStyle(e).opacity,
            );
            const action = cover.getByRole("button", {
              name: "Buka Undangan",
              exact: true,
            });
            await action.click();
            details.opening = { before, samples: await samples(cover, 1000) };
            await page
              .locator("[data-lakon-root][data-state=opened]")
              .waitFor();
            if (!reduced)
              assert(
                details.opening.samples.some(
                  (s) => s.opacity > 0 && s.opacity < 0.99,
                ),
                "cover opacity actually interpolates",
              );
          }
          for (const type of [
            "hero",
            "couple-intro",
            "story",
            "event-details",
            "countdown",
            "gallery",
            "rsvp",
            "guestbook",
            "closing",
          ]) {
            await move(page, type);
            if (type === "couple-intro" && !builder) {
              const button = page
                .locator("[data-lakon-scene=couple-intro]")
                .first()
                .locator("button[aria-pressed]")
                .first();
              const flip = button.locator("span").first();
              const before = await flip.evaluate(
                (e) => getComputedStyle(e).transform,
              );
              await button.click({ force: builder });
              details.flip = { before, samples: await samples(flip) };
              if (!reduced)
                assert(
                  transformsChanged(details.flip.samples),
                  "couple rotation interpolates",
                );
            }
            if (type === "event-details") {
              const cards = page
                .locator("[data-lakon-scene=event-details]")
                .first()
                .locator("article");
              assert((await cards.count()) === 2);
              for (const card of await cards.all()) {
                await card.evaluate((e) =>
                  e.scrollIntoView({ block: "center", behavior: "instant" }),
                );
                await page.waitForTimeout(1000);
              }
            }
            if (type === "gallery") {
              const scene = page.locator("[data-lakon-scene=gallery]").first();
              const photo = scene.locator("button[data-active]");
              const before = await photo.evaluate(
                (e) => getComputedStyle(e).transform,
              );
              if (builder) {
                // Canvas click capture selects sections; keyboard carousel remains native.
                await photo.focus();
                await page.keyboard.press("ArrowRight");
              } else {
                await scene
                  .getByRole("button", { name: "Foto berikutnya", exact: true })
                  .click();
              }
              details.gallery = { before, samples: await samples(photo) };
              if (!reduced)
                assert(
                  transformsChanged(details.gallery.samples),
                  "fan transformation interpolates",
                );
              if (!builder) {
                await scene
                  .getByRole("button", { name: /Perbesar foto/ })
                  .click();
                assert((await page.locator("dialog[open]").count()) === 1);
                await page.keyboard.press("Escape");
                assert((await page.locator("dialog[open]").count()) === 0);
              }
            }
            if (
              (type === "rsvp" && !builder) ||
              (type === "guestbook" && builder)
            ) {
              const scene = page.locator(`[data-lakon-scene=${type}]`).first();
              if (!builder)
                await scene
                  .getByRole("button", { name: "Hadir", exact: true })
                  .click({ force: builder });
              const input = scene.locator("input[name=name]");
              await input.focus();
              await input.pressSequentially("Tamu lokal", { delay: 25 });
              const a = await input.boundingBox();
              await page.waitForTimeout(250);
              const z = await input.boundingBox();
              assert(Math.abs(a.y - z.y) < 1, "form stable while typing");
            }
          }
          await page.waitForTimeout(300);
          const runs = await page.evaluate(() => window.__lkProof);
          await writeFile(
            `${out}/${builder ? "builder" : "public"}-${width}-${reduced ? "reduced" : "normal"}.json`,
            JSON.stringify({ details, runs }, null, 2),
          );
          if (!reduced) {
            for (const type of [
              "hero",
              "couple-intro",
              "event-details",
              "gallery",
              "rsvp",
              "closing",
            ])
              assert(
                runs.some((r) => r.scene === type && actualReveal(r)),
                `actual opacity/transform progress: ${type}`,
              );
            assert(
              runs.filter((r) => r.scene === "event-details" && actualReveal(r))
                .length >= 3,
              "heading and both event cards interpolate",
            );
            assert(
              runs.filter((r) => r.scene === "hero").some((r) => r.delay >= 90),
              "hero stagger exists in timed effects",
            );
            assert(
              new Set(runs.map((r) => r.id)).size === runs.length,
              "once per mounted target",
            );
          } else
            assert(
              runs.length === 0,
              "reduced motion never starts an entrance",
            );
          assert(
            runs.every((r) => r.root === builder),
            "correct document/Canvas root",
          );
          // Fast bookmark/scroll changes keep the resting DOM readable and do not replay.
          const count = runs.length;
          for (const type of ["hero", "closing", "event-details", "hero"])
            await page
              .locator(`[data-lakon-scene="${type}"]`)
              .first()
              .evaluate((e) => e.scrollIntoView({ behavior: "instant" }));
          await page.waitForTimeout(1100);
          const after = await page.evaluate(() => window.__lkProof.length);
          assert(
            after >= count &&
              (await page.evaluate(
                () =>
                  new Set(window.__lkProof.map((r) => r.id)).size ===
                  window.__lkProof.length,
              )),
            "fast jumps do not replay seen targets",
          );
          const invisible = await page
            .locator("[data-lakon-entrance],[data-lakon-reveal-item]")
            .evaluateAll(
              (es) =>
                es.filter(
                  (e) =>
                    e.getClientRects().length &&
                    !e.closest("[hidden]") &&
                    Number(getComputedStyle(e).opacity) < 0.99,
                ).length,
            );
          assert(invisible === 0, "no stuck invisible content");
          // Parallax exists only when the template itself has desktop logical width.
          if (width === 1440) {
            if (builder) {
              await page
                .getByRole("combobox", { name: "Perangkat pratinjau" })
                .selectOption("desktop");
              await page.waitForTimeout(500);
              await move(page, "hero");
            } else await move(page, "hero");
            const decorations = page.locator("[data-lakon-parallax]");
            const before = await decorations.evaluateAll((es) =>
              es.map((e) => e.style.translate),
            );
            await decorations.first().evaluate((e) => {
              const o = e.closest("[data-device-scroller]") || window;
              o.scrollBy({ top: 120, behavior: "instant" });
            });
            await page.waitForTimeout(120);
            const after = await decorations.evaluateAll((es) =>
              es.map((e) => e.style.translate),
            );
            details.parallax = { before, after };
            if (!reduced)
              assert.notDeepEqual(before, after, "parallax responds");
            else
              assert(
                after.every((v) => !v),
                "reduced parallax disabled",
              );
          }
          await page.screenshot({
            path: `${out}/${builder ? "builder" : "public"}-${width}-${reduced ? "reduced" : "normal"}.png`,
          });
          assert.deepEqual(errors, []);
          return {
            revealCount: runs.length,
            provenMovingReveals: runs.filter(actualReveal).length,
            details,
          };
        } finally {
          await writeFile(
            `${out}/last-${builder ? "builder" : "public"}-${width}-${reduced}.json`,
            JSON.stringify(
              {
                details,
                runs: await page
                  .evaluate(() => window.__lkProof)
                  .catch(() => []),
              },
              null,
              2,
            ),
          );
          await context.close();
        }
      });
await browser.close();
assert(
  results.every((r) => r.status === "PASS"),
  "Review timing-results.json",
);

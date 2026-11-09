// Local production acceptance. Every API request and Server Action POST is mocked.
// BASE_URL=http://localhost:3061 CDP_URL=http://127.0.0.1:9339 PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/verify-lakon-kencana.mjs
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.BASE_URL || "http://localhost:3061";
assert(
  ["localhost", "127.0.0.1", "[::1]"].includes(new URL(base).hostname),
  "Local validation only",
);
const out = process.env.LAKON_OUTPUT || "/tmp/ngaturi-lakon-acceptance";
await mkdir(out, { recursive: true });
const browser = process.env.CDP_URL
  ? await chromium.connectOverCDP(process.env.CDP_URL)
  : await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const results = [];
let assertions = 0;
const check = (condition, message) => {
  assertions++;
  assert(condition, message);
};
async function test(name, run) {
  if (
    process.env.LAKON_CASES &&
    !new RegExp(process.env.LAKON_CASES).test(name)
  )
    return;
  const before = assertions,
    began = Date.now();
  try {
    const detail = await run();
    results.push({
      name,
      status: "PASS",
      assertions: assertions - before,
      ms: Date.now() - began,
      ...detail,
    });
    console.log("PASS", name);
  } catch (e) {
    results.push({
      name,
      status: "FAIL",
      assertions: assertions - before,
      error: e.stack,
    });
    console.error("FAIL", name, e.message);
  }
  await writeFile(
    `${out}/results.json`,
    JSON.stringify({ assertions, results }, null, 2),
  );
}
function tone() {
  const rate = 8000,
    n = rate;
  const b = Buffer.alloc(44 + n * 2);
  b.write("RIFF", 0);
  b.writeUInt32LE(36 + n * 2, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++)
    b.writeInt16LE(
      Math.round(Math.sin((i / rate) * 440 * Math.PI * 2) * 1500),
      44 + i * 2,
    );
  return b;
}
async function fixture(width = 390, height = 844, query = "", options = {}) {
  const {
    path = "/lakon-validation-public",
    state: initial = {},
    video = false,
    ...contextOptions
  } = options;
  const context = await browser.newContext({
    viewport: { width, height },
    hasTouch: width < 900,
    isMobile: width < 500,
    timezoneId: "Asia/Jakarta",
    ...contextOptions,
    ...(video
      ? {
          recordVideo: {
            dir: `${out}/video`,
            size: {
              width: Math.min(width, 1280),
              height: Math.min(height, 900),
            },
          },
        }
      : {}),
  });
  const state = {
    posts: [],
    actions: [],
    requests: [],
    rsvpFail: false,
    wishFail: false,
    loadFail: false,
    pending: false,
    pendingApproval: false,
    ...initial,
  };
  await context.route("**/*", async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    state.requests.push({ method: req.method(), url: req.url() });
    if (!["localhost", "127.0.0.1"].includes(url.hostname))
      return route.abort();
    if (
      req.method() === "GET" &&
      ["/invitations", "/login"].includes(url.pathname)
    )
      return route.fulfill({
        contentType: "text/x-component",
        body: '0:{"f":[],"b":"local-fixture"}\n',
      });
    if (req.method() === "POST" && req.headers()["next-action"]) {
      state.actions.push(req.postData());
      return route.fulfill({
        contentType: "text/x-component",
        body: '0:{"a":{"ok":true,"slug":"lakon-validation-public"},"f":[]}\n',
      });
    }
    if (url.pathname === "/__fixture-tone.wav")
      return route.fulfill({ contentType: "audio/wav", body: tone() });
    if (url.pathname.startsWith("/missing"))
      return route.fulfill({
        status: 404,
        body: "local missing media fixture",
      });
    if (url.pathname === "/api/uploads")
      return route.fulfill({
        json: { publicUrl: "/themes/lakon-kencana/demo-rings.webp" },
      });
    if (url.pathname.startsWith("/api/")) {
      if (url.pathname.includes("public-config"))
        return route.fulfill({ json: { turnstileSiteKey: "" } });
      if (req.method() === "POST") {
        state.posts.push({ path: url.pathname, body: req.postDataJSON() });
        if (state.pending)
          await new Promise((r) => {
            state.release = r;
            setTimeout(r, 12000);
          });
        const wishes = url.pathname.endsWith("guestbook"),
          fail = wishes ? state.wishFail : state.rsvpFail;
        return route.fulfill({
          status: fail ? 503 : 200,
          json: fail
            ? { error: "Koneksi uji terputus. Silakan coba lagi." }
            : wishes
              ? {
                  ok: true,
                  pending: state.pendingApproval,
                  message: state.pendingApproval
                    ? undefined
                    : {
                        id: "posted",
                        name: "Sahabat",
                        message: "Semoga selalu bahagia.",
                        createdAt: "2026-10-17T00:00:00Z",
                      },
                }
              : { ok: true },
        });
      }
      return route.fulfill({
        status: state.loadFail ? 503 : 200,
        json: {
          messages: [
            {
              id: "fixture-1",
              name: "Sahabat Keluarga",
              message:
                "Semoga selalu tumbuh bersama dalam cinta dan kebahagiaan.",
              createdAt: "2026-10-17T00:00:00Z",
            },
          ],
        },
      });
    }
    // No other POST can reach the local application either.
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method()))
      return route.abort();
    return route.continue();
  });
  await context.addInitScript(() => {
    window.__opens = 0;
    window.__reducedAnimations = [];
    document.addEventListener("animationstart", (event) => {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches)
        window.__reducedAnimations.push(event.animationName);
    });
    window.__copyFail = false;
    window.__plays = [];
    window.addEventListener("ngaturi:open", () => window.__opens++);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value) => {
          if (window.__copyFail) throw Error("local copy failure");
          window.__copied = value;
        },
      },
    });
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      window.__plays.push({
        active: navigator.userActivation.isActive,
        state: document.querySelector("[data-lakon-root]")?.dataset.state,
      });
      return play.call(this);
    };
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (/hydration|hydrating|React error #(418|423|425)/i.test(message.text()))
      errors.push(message.text());
  });
  page.on("dialog", (d) => d.dismiss());
  page.setDefaultTimeout(10000);
  await page.goto(base + path + query, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  if (path.includes("public"))
    await page
      .locator("[data-invitation-entry][data-loading-state=complete]")
      .waitFor({ timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
  return { page, context, state, errors };
}
const scene = (p, type) => p.locator(`[data-lakon-scene="${type}"]`).first();
async function seek(page, type) {
  await scene(page, type).evaluate((e) =>
    scrollTo({
      top: e.getBoundingClientRect().top + scrollY,
      behavior: "instant",
    }),
  );
  await page.waitForTimeout(700);
}
async function enter(page) {
  const t = Date.now();
  await page
    .locator("[data-lakon-cover]")
    .getByRole("button", { name: "Buka Undangan", exact: true })
    .click();
  await page.locator("[data-lakon-root][data-state=opened]").waitFor();
  await page.waitForTimeout(80);
  return Date.now() - t;
}
async function shot(page, name) {
  await page.screenshot({ path: `${out}/${name}.png` });
}
async function noOverflow(page) {
  const b = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  check(b.scroll <= b.width + 1, `horizontal overflow ${JSON.stringify(b)}`);
}
async function touchSwipe(page, locator, dx) {
  const box = await locator.boundingBox();
  const x = box.x + box.width * 0.7,
    y = box.y + box.height * 0.5;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  for (let i = 1; i <= 5; i++)
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + (dx * i) / 5, y: y + 2 * i }],
    });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await cdp.detach();
  await page.waitForTimeout(150);
}
for (const [width, height] of [
  [360, 800],
  [390, 844],
  [430, 932],
  [768, 900],
  [1440, 900],
  [360, 560],
  [844, 390],
])
  await test(`fresh journey ${width}x${height}`, async () => {
    const { page, context, errors } = await fixture(
      width,
      height,
      "?gift=1&map=1",
      { video: width === 390 },
    );
    try {
      const cta = page
          .locator("[data-lakon-cover]")
          .getByRole("button", { name: "Buka Undangan", exact: true }),
        box = await cta.boundingBox();
      check(
        box.y >= 0 && box.y + box.height <= height,
        "cover CTA within viewport",
      );
      check(
        await page.locator("[data-lakon-navigation]").isHidden(),
        "navigation hidden before entry",
      );
      check(
        await page
          .locator("[data-section=hero]")
          .first()
          .evaluate((e) => e.inert),
        "background inert",
      );
      await page.waitForTimeout(120);
      check(
        await cta.evaluate((e) => document.activeElement === e),
        "initial focus is CTA",
      );
      await page.mouse.wheel(0, 450);
      await page.waitForTimeout(80);
      check(await page.evaluate(() => scrollY < 2), "background scroll locked");
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press("Tab");
        check(
          await page.evaluate(
            () => !!document.activeElement.closest("[data-lakon-cover]"),
          ),
          "cover focus containment",
        );
      }
      await shot(page, `${width}-${height}-cover`);
      const ms = await enter(page);
      await page
        .locator("[data-lakon-cover] button")
        .last()
        .dispatchEvent("click");
      check(
        await page.evaluate(() => window.__opens === 1),
        "repeated entry is harmless",
      );
      check(
        await page.locator("[data-lakon-navigation]").isVisible(),
        "dock available after entry",
      );
      check(
        await page.evaluate(
          () => document.documentElement.style.overflow !== "hidden",
        ),
        "entry scroll lock released",
      );
      await noOverflow(page);
      await page.waitForTimeout(700);
      await shot(page, `${width}-${height}-hero`);
      for (const type of [
        "couple-intro",
        "story",
        "event-details",
        "countdown",
        "gallery",
        "rsvp",
        "gift",
        "guestbook",
        "closing",
      ]) {
        await seek(page, type);
        const b = await scene(page, type).boundingBox();
        check(
          b.height > 0 && b.width <= width + 1,
          `${type} reachable and fits`,
        );
        if (width === 390 || width === 1440)
          await shot(page, `${width}-${height}-${type}`);
      }
      check(
        (await page
          .locator("[data-lakon-scene]")
          .last()
          .getAttribute("data-lakon-scene")) === "closing",
        "Closing is actual final chapter",
      );
      await page.mouse.wheel(0, -height * 2);
      await page.waitForTimeout(150);
      check(
        await page.evaluate(
          () => scrollY < document.documentElement.scrollHeight - innerHeight,
        ),
        "reverse scroll remains available",
      );
      check(errors.length === 0, `runtime errors ${errors}`);
      return { openingMsIncludingAutomation: ms };
    } finally {
      await context.close();
    }
  });
await test("couple, story, gallery keyboard and real emulated touch", async () => {
  const { page, context, state, errors } = await fixture();
  try {
    await enter(page);
    await seek(page, "couple-intro");
    const card = page.getByRole("button", {
      name: "Kenali Bagas Pradipta",
      exact: true,
    });
    await card.click();
    await page.waitForTimeout(700);
    check(
      (await page
        .getByRole("button", { name: "Tutup Bagas Pradipta", exact: true })
        .getAttribute("aria-pressed")) === "true",
      "profile flips",
    );
    check(
      await page
        .getByText("Bapak Surya & Ibu Ratih", { exact: true })
        .isVisible(),
      "family visible on profile",
    );
    await shot(page, "couple-flipped");
    await seek(page, "story");
    const details = scene(page, "story").locator("details").first();
    await details.locator("summary").click();
    check(await details.evaluate((e) => e.open), "story expands inline");
    await details.locator("summary").click();
    check(!(await details.evaluate((e) => e.open)), "story closes inline");
    await seek(page, "gallery");
    check(
      !state.requests.some((r) => r.url.includes("-full.webp")),
      "full-resolution deferred",
    );
    const front = page.getByRole("button", {
      name: "Perbesar foto 1",
      exact: true,
    });
    await front.evaluate((e) => {
      window.__opener = e;
    });
    const y = await page.evaluate(() => scrollY);
    await front.click();
    const dialog = page.locator("[data-lakon-lightbox]");
    await dialog.waitFor();
    check(
      state.requests.some((r) => r.url.includes("-full.webp")),
      "full-resolution requested on demand",
    );
    await shot(page, "gallery-lightbox");
    await page.keyboard.press("ArrowRight");
    check((await dialog.innerText()).includes("2 / 3"), "keyboard next");
    await touchSwipe(page, dialog.locator("[data-lakon-photo]").first(), -110);
    check((await dialog.innerText()).includes("3 / 3"), "touch next");
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
      check(
        await page.evaluate(
          () => !!document.activeElement.closest("dialog[open]"),
        ),
        "lightbox focus contained",
      );
    }
    await page.keyboard.press("Escape");
    check((await dialog.count()) === 0, "Escape closes");
    check(
      Math.abs((await page.evaluate(() => scrollY)) - y) < 2,
      "gallery restores scroll",
    );
    check(
      await page.evaluate(() => document.activeElement === window.__opener),
      "gallery restores opener focus",
    );
    check(
      (await scene(page, "gallery").innerText()).includes("Foto 3 dari 3"),
      "gallery preserves selected index",
    );
    check(errors.length === 0, `runtime errors ${errors}`);
  } finally {
    await context.close();
  }
});
for (const status of ["attending", "not_attending", "maybe"])
  await test(`RSVP contract and local states ${status}`, async () => {
    const { page, context, state, errors } = await fixture(
      390,
      844,
      "?stress=1",
    );
    try {
      await enter(page);
      await seek(page, "rsvp");
      const section = scene(page, "rsvp");
      await section
        .getByRole("button", {
          name: {
            attending: "Hadir",
            not_attending: "Berhalangan",
            maybe: "Masih ragu",
          }[status],
          exact: true,
        })
        .click();
      await section
        .getByRole("button", { name: "Kirim Konfirmasi", exact: true })
        .click();
      check(state.posts.length === 0, "empty name rejected in browser");
      await section.locator("input[name=name]").fill("Tamu Fixture");
      if (status === "attending") {
        await section.locator("select[name=guest_count]").selectOption("5");
        check(
          (await section.locator("select[name=guest_count] option").count()) ===
            5,
          "configured guest limit",
        );
      } else
        check(
          (await section.locator("select[name=guest_count]").count()) === 0,
          "non-attending guest count hidden",
        );
      await section
        .locator("textarea")
        .fill("Catatan privat untuk tuan rumah.");
      state.pending = true;
      state.rsvpFail = true;
      await section
        .getByRole("button", { name: "Kirim Konfirmasi", exact: true })
        .click();
      await section
        .getByRole("button", { name: "Mengirim…", exact: true })
        .waitFor();
      check(
        await section
          .getByRole("button", { name: "Mengirim…", exact: true })
          .isDisabled(),
        "pending disabled",
      );
      await section.locator("form").evaluate((f) => f.requestSubmit());
      await page.waitForTimeout(80);
      check(state.posts.length === 1, "duplicate submit suppressed");
      state.pending = false;
      state.release();
      await section.getByRole("alert").waitFor();
      check(
        (await section.innerText()).includes("Koneksi uji terputus"),
        "error clear and retryable",
      );
      state.rsvpFail = false;
      await section
        .getByRole("button", { name: "Kirim Konfirmasi", exact: true })
        .click();
      await section.getByText("Konfirmasi diterima", { exact: true }).waitFor();
      check(state.posts.length === 2, "one retry");
      check(state.posts[1].body.status === status, "API attendance value");
      check(
        Number(state.posts[1].body.guest_count) ===
          (status === "attending" ? 5 : 1),
        "API guest-count invariant",
      );
      check(
        state.posts[1].body.message === "Catatan privat untuk tuan rumah.",
        "private RSVP note preserved",
      );
      check(
        !state.posts.some((p) => p.path.endsWith("guestbook")),
        "RSVP does not post a public wish",
      );
      await shot(page, `rsvp-${status}-success`);
      check(errors.length === 0, `runtime errors ${errors}`);
    } finally {
      await context.close();
    }
  });
await test("wishes load retry, pending, failure and moderation", async () => {
  const { page, context, state, errors } = await fixture(390, 844, "", {
    state: { loadFail: true },
  });
  try {
    await enter(page);
    await seek(page, "guestbook");
    const section = scene(page, "guestbook");
    check(
      (await section.innerText()).includes("Ucapan belum dapat dimuat"),
      "load failure",
    );
    state.loadFail = false;
    await section
      .getByRole("button", { name: "Coba Lagi", exact: true })
      .click();
    await section.getByText("Sahabat Keluarga", { exact: true }).waitFor();
    await section.locator("input[name=name]").fill("Sahabat");
    await section.locator("textarea").fill("Semoga selalu bahagia.");
    state.wishFail = true;
    await section
      .getByRole("button", { name: "Kirim Pangestu", exact: true })
      .click();
    await section.getByRole("alert").waitFor();
    check(
      (await section.locator("textarea").inputValue()) ===
        "Semoga selalu bahagia.",
      "failed wish keeps draft",
    );
    state.wishFail = false;
    state.pending = true;
    state.pendingApproval = true;
    await section
      .getByRole("button", { name: "Kirim Pangestu", exact: true })
      .click();
    await section
      .getByRole("button", { name: "Mengirim…", exact: true })
      .waitFor();
    await section.locator("form").evaluate((f) => f.requestSubmit());
    await page.waitForTimeout(80);
    check(state.posts.length === 2, "wish duplicate suppressed");
    state.pending = false;
    state.release();
    await section.getByRole("status").waitFor();
    check(
      (await section.innerText()).includes("menunggu persetujuan"),
      "moderation success semantics",
    );
    check(
      (await section.locator("input[name=name]").getAttribute("maxlength")) ===
        "25",
      "API name length",
    );
    check(
      (await section.locator("textarea").getAttribute("maxlength")) === "255",
      "API message length",
    );
    check(
      (await section.innerText()).includes("Ucapan bersifat publik"),
      "public semantics visible",
    );
    await shot(page, "wishes-moderated");
    check(errors.length === 0, `runtime errors ${errors}`);
  } finally {
    await context.close();
  }
});
await test("gift copy success and failure", async () => {
  const { page, context, state, errors } = await fixture(390, 844, "?gift=1");
  try {
    await enter(page);
    await seek(page, "gift");
    const gift = scene(page, "gift");
    await gift.locator("summary").focus();
    await page.keyboard.press("Enter");
    check(
      await gift.locator("details").evaluate((e) => e.open),
      "envelope keyboard opens",
    );
    await gift
      .getByRole("button", { name: "Salin rekening Bank Uji", exact: true })
      .click();
    check(
      await page.evaluate(() => window.__copied === "0000000000"),
      "copy correct account",
    );
    check(
      (await gift.innerText()).includes("Nomor rekening tersalin"),
      "copy feedback",
    );
    await page.evaluate(() => (window.__copyFail = true));
    await gift
      .getByRole("button", { name: "Salin rekening Bank Uji", exact: true })
      .click();
    check(
      (await gift.innerText()).includes("Salinan gagal"),
      "copy failure feedback",
    );
    check(state.posts.length === 0, "gift makes no transaction");
    await shot(page, "gift-open");
    check(errors.length === 0, `runtime errors ${errors}`);
  } finally {
    await context.close();
  }
});
await test("empty, absent cover/navigation and broken media", async () => {
  for (const query of ["?empty=1", "?nocover=1&nonav=1", "?broken=1"]) {
    const { page, context, errors } = await fixture(360, 560, query);
    try {
      if (!query.includes("nocover")) await enter(page);
      if (query.includes("empty"))
        for (const type of [
          "story",
          "gallery",
          "gift",
          "quote",
          "map-location",
        ])
          check(
            (await scene(page, type).count()) === 0,
            `empty ${type} absent`,
          );
      if (query.includes("nonav"))
        check(
          (await page.locator("[data-lakon-navigation]").count()) === 0,
          "disabled navigation absent",
        );
      if (query.includes("broken")) {
        check(
          (await scene(page, "hero").innerText()).includes(
            "Foto belum tersedia",
          ),
          "broken hero fallback",
        );
        await seek(page, "gallery");
        await page
          .getByRole("button", { name: "Perbesar foto 1", exact: true })
          .click();
        check(
          (await page.locator("dialog[open]").innerText()).includes(
            "Foto belum tersedia",
          ),
          "broken lightbox fallback",
        );
        await page.keyboard.press("Escape");
        check(
          (await page
            .locator("[data-lakon-root]")
            .getAttribute("data-state")) === "opened",
          "audio failure never blocks entry",
        );
        await shot(page, "broken-media");
      }
      await noOverflow(page);
      check(errors.length === 0, `runtime errors ${errors}`);
    } finally {
      await context.close();
    }
  }
});
await test("configured music within opening user gesture", async () => {
  const { page, context, errors } = await fixture(390, 844, "?audio=1");
  try {
    check(
      await page.locator("[data-lakon-music]").isHidden(),
      "music control hidden before entry",
    );
    await enter(page);
    await page.waitForTimeout(200);
    const plays = await page.evaluate(() => window.__plays);
    check(
      plays.some((p) => p.active && p.state === "closed"),
      "shared player called in opening gesture",
    );
    check(
      await page.locator("[data-lakon-music]").isVisible(),
      "music available after entry",
    );
    await page.locator("[data-lakon-music] button").click();
    check(errors.length === 0, `runtime errors ${errors}`);
    return { playCalls: plays };
  } finally {
    await context.close();
  }
});
await test("reduced motion", async () => {
  const { page, context, errors } = await fixture(390, 844, "", {
    reducedMotion: "reduce",
  });
  try {
    await enter(page);
    check(
      await page.evaluate(
        () =>
          document.getAnimations().filter((a) => a.playState === "running")
            .length === 0,
      ),
      "no running motion",
    );
    check(
      await page.evaluate(() => window.__reducedAnimations.length === 0),
      "loading and entry respect reduced motion",
    );
    await seek(page, "couple-intro");
    await page
      .getByRole("button", { name: "Kenali Bagas Pradipta", exact: true })
      .click();
    check(
      (await page
        .getByRole("button", { name: "Tutup Bagas Pradipta", exact: true })
        .getAttribute("aria-pressed")) === "true",
      "profile works without flip motion",
    );
    await seek(page, "closing");
    await shot(page, "reduced-motion-closing");
    check(errors.length === 0, `runtime errors ${errors}`);
  } finally {
    await context.close();
  }
});
await test("resize, form editing and interrupted navigation", async () => {
  const { page, context, errors } = await fixture(390, 844, "?stress=1");
  try {
    await enter(page);
    await seek(page, "event-details");
    await page.mouse.wheel(0, 250);
    await page.waitForTimeout(100);
    const at = () =>
      page.evaluate(
        () =>
          [...document.querySelectorAll("[data-lakon-scene]")].find((e) => {
            const b = e.getBoundingClientRect();
            return b.top <= innerHeight * 0.16 && b.bottom > innerHeight * 0.16;
          })?.dataset.lakonScene,
      );
    const before = await at();
    for (const width of [768, 1440, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await page.waitForTimeout(160);
      check((await at()) === before, `reading anchor after resize ${width}`);
      await noOverflow(page);
    }
    await seek(page, "rsvp");
    const form = scene(page, "rsvp");
    await form.getByRole("button", { name: "Hadir", exact: true }).click();
    const name = form.locator("input[name=name]");
    await name.fill("Nama tetap saat keyboard berubah");
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(120);
    check(
      (await name.inputValue()) === "Nama tetap saat keyboard berubah",
      "draft preserved after orientation/keyboard-sized resize",
    );
    check(
      await name.evaluate((e) => e === document.activeElement),
      "editing focus preserved",
    );
    await name.blur();
    const nav = page.locator("[data-lakon-navigation]");
    await nav.getByRole("button", { name: "Awal", exact: true }).click();
    await page.waitForTimeout(70);
    await page.mouse.wheel(0, 150);
    await page.waitForTimeout(200);
    const y = await page.evaluate(() => scrollY);
    await page.waitForTimeout(700);
    check(
      Math.abs((await page.evaluate(() => scrollY)) - y) < 3,
      "user input cancels automatic travel",
    );
    await seek(page, "event-details");
    check(
      (await scene(page, "event-details").locator("article").count()) === 4,
      "multiple schedules present",
    );
    for (const link of await scene(page, "event-details")
      .locator('a[href*="calendar"]')
      .all())
      check(
        new URL(await link.getAttribute("href")).searchParams
          .get("dates")
          .startsWith("20271112"),
        "calendar uses editable event date",
      );
    await noOverflow(page);
    check(errors.length === 0, `runtime errors ${errors}`);
  } finally {
    await context.close();
  }
});
await test("Builder Canvas, Inspector, images, date and section visibility", async () => {
  const { page, context, errors } = await fixture(1440, 1000, "", {
    path: "/lakon-validation-builder",
  });
  try {
    await page.locator("[data-device-scroller] [data-lakon-root]").waitFor();
    check(
      (await page
        .locator("[data-device-scroller] [data-invitation-cover]")
        .count()) === 0,
      "Builder cover inline",
    );
    await page.locator("[data-fixture-select=hero]").click();
    const inspector = page.locator("[data-fixture-inspector]");
    await inspector
      .locator("label")
      .filter({ has: page.locator("span") })
      .count();
    const name = inspector.getByLabel(/^Nama/).first();
    await name.fill("Alya & Ilham");
    check(
      (await scene(page, "hero").innerText()).includes("Alya"),
      "text edit appears in Canvas",
    );
    check(
      (await page.locator("[data-fixture-dirty]").innerText()) === "dirty",
      "existing dirty tracking",
    );
    const upload = inspector.locator("input[type=file]").first();
    await upload.setInputFiles(
      resolve("public/themes/lakon-kencana/demo-rings.webp"),
    );
    await page
      .getByRole("button", { name: "Pakai tanpa crop", exact: true })
      .click();
    await page.waitForTimeout(200);
    check(
      (await scene(page, "hero")
        .locator("[data-lakon-photo] img")
        .getAttribute("src")) === "/themes/lakon-kencana/demo-rings.webp",
      "image editor reaches Canvas",
    );
    await page.locator("[data-fixture-select=event-details]").click();
    await inspector
      .locator("input[type=datetime-local]")
      .first()
      .fill("2027-12-25T08:00");
    await page.waitForTimeout(100);
    check(
      (await scene(page, "hero").innerText()).includes("25 Desember 2027"),
      "event edit updates primary date",
    );
    const row = page
      .locator("[data-fixture-sections] li")
      .filter({
        has: page.getByRole("button", { name: "Galeri", exact: true }),
      })
      .first();
    await row
      .getByRole("button", { name: "Tampil/sembunyi", exact: true })
      .click();
    check(
      (await page
        .locator("[data-device-scroller] [data-section-visible=false]")
        .count()) > 0,
      "section toggles through existing store",
    );
    await page.locator("[data-fixture-device=desktop]").click();
    await page.waitForTimeout(150);
    check(
      (await page
        .locator("[data-device-frame-viewport]")
        .evaluate((e) => e.clientWidth)) === 1280,
      "desktop Canvas layout",
    );
    await shot(page, "builder-inspector");
    check(errors.length === 0, `runtime errors ${errors}`);
  } finally {
    await context.close();
  }
});
await test("native BuilderShell autosave uses existing handler with mocked transport", async () => {
  const { page, context, state, errors } = await fixture(1440, 1000, "", {
    path: "/lakon-validation-shell",
  });
  try {
    await page.locator("[data-device-scroller] [data-lakon-root]").waitFor();
    const list = page.locator("aside").first();
    await list
      .getByRole("button", { name: "Sampul / Pembuka", exact: true })
      .click();
    const inspector = page.locator("aside").last();
    await inspector.getByLabel(/^Nama/).first().fill("Alya & Ilham");
    await page.waitForTimeout(1900);
    check(
      state.actions.length === 1,
      "autosave used existing server action transport once",
    );
    check(
      state.actions[0].includes("lakon-kencana") &&
        state.actions[0].includes("Alya & Ilham"),
      "autosave serialized template and edit",
    );
    check(
      (await page.locator("header").first().innerText()).includes("Tersimpan"),
      "existing save UI accepts mocked result",
    );
    await shot(page, "builder-shell");
    check(errors.length === 0, `runtime errors ${errors}`);
  } finally {
    await context.close();
  }
});
for (const id of ["gerbang-puspa", "cinematic-vintage", "serambi-delima"])
  await test(`existing template ${id}`, async () => {
    const { page, context, errors } = await fixture(390, 844, "", {
      path: `/templates/${id}/preview`,
    });
    try {
      await page
        .locator("[data-invitation-entry][data-loading-state=complete]")
        .waitFor({ timeout: 15000 });
      const cta = page
        .locator("[data-invitation-cover]")
        .getByRole("button", { name: /Buka Undangan/i })
        .first();
      if (await cta.count()) await cta.click();
      await page.waitForTimeout(1500);
      check(
        (await page.locator("[data-lakon-root]").count()) === 0,
        "new presentation isolated",
      );
      check(
        (await page.locator("[data-lakon-navigation]").count()) === 0,
        "new chrome isolated",
      );
      check(errors.length === 0, `runtime errors ${errors}`);
    } finally {
      await context.close();
    }
  });
await test("catalog registration and native preview", async () => {
  const { page, context, errors } = await fixture(1440, 900, "", {
    path: "/templates",
  });
  try {
    check(
      (await page.getByText("Lakon Kencana", { exact: true }).count()) > 0,
      "catalog includes template name",
    );
    check(
      (await page
        .locator('a[href="/templates/lakon-kencana/preview"]')
        .count()) > 0,
      "catalog preview destination",
    );
    await page.goto(base + "/templates/lakon-kencana/preview");
    await page
      .locator("[data-invitation-entry][data-loading-state=complete]")
      .waitFor();
    await enter(page);
    check(
      (await page.locator("[data-lakon-root]").evaluate((e) => e.clientWidth)) >
        1100,
      "native desktop preview has full composition width",
    );
    check(
      (await page
        .getByRole("link", { name: "Pakai template", exact: true })
        .getAttribute("href")) === "/templates/lakon-kencana/use",
      "selection uses existing template action route",
    );
    check(
      (await page.locator("[data-lakon-scene=gift]").count()) === 0,
      "empty gift absent from real preset",
    );
    const response = await context.request.get(
      base + "/templates/lakon-kencana/card",
    );
    check(
      response.ok() &&
        (response.headers()["content-type"] || "").includes("image/webp"),
      "representative catalog image served locally",
    );
    check(errors.length === 0, `runtime errors ${errors}`);
  } finally {
    await context.close();
  }
});
await test("gunungan gesture, reload and history", async () => {
  const { page, context, errors } = await fixture();
  try {
    const art = page.getByRole("button", {
      name: "Buka dengan gunungan, atau geser ke atas",
      exact: true,
    });
    const box = await art.boundingBox();
    const cdp = await context.newCDPSession(page);
    const x = box.x + box.width * 0.5,
      y = box.y + box.height * 0.7;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    for (let i = 1; i <= 6; i++)
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y: y - i * 17 }],
      });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await cdp.detach();
    await page.locator("[data-lakon-root][data-state=opened]").waitFor();
    check(
      await page.evaluate(() => window.__opens === 1),
      "gesture opens exactly once",
    );
    await seek(page, "gallery");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page
      .locator("[data-invitation-entry][data-loading-state=complete]")
      .waitFor();
    await page.waitForTimeout(100);
    check(
      (await page.locator("[data-lakon-root]").getAttribute("data-state")) ===
        "closed",
      "reload returns to coherent closed cover",
    );
    check(await page.evaluate(() => scrollY < 2), "reload cover starts at top");
    await enter(page);
    await page.goto(base + "/lakon-validation-public?nocover=1&nonav=1");
    await page
      .locator("[data-invitation-entry][data-loading-state=complete]")
      .waitFor();
    check(
      await page.evaluate(
        () => document.documentElement.style.overflow !== "hidden",
      ),
      "route replacement releases old locks",
    );
    await page.goBack({ waitUntil: "commit" });
    await page
      .locator("[data-invitation-entry][data-loading-state=complete]")
      .waitFor();
    const stage = await page
      .locator("[data-lakon-root]")
      .getAttribute("data-state");
    check(
      ["closed", "opened"].includes(stage),
      "history has a stable entry state",
    );
    if (stage === "closed")
      check(
        await page.evaluate(() => scrollY < 2),
        "history closed cover starts at top",
      );
    check(errors.length === 0, `runtime errors ${errors}`);
  } finally {
    await context.close();
  }
});
await test("native slow and fast scroll without animation API", async () => {
  const { page, context, errors } = await fixture();
  try {
    await page.evaluate(() => {
      Element.prototype.animate = undefined;
    });
    await enter(page);
    for (let i = 0; i < 28; i++) {
      await page.mouse.wheel(0, i < 8 ? 260 : 850);
      await page.waitForTimeout(100);
      if (i === 7) {
        const y = await page.evaluate(() => scrollY);
        await page.waitForTimeout(600);
        check(
          Math.abs((await page.evaluate(() => scrollY)) - y) < 2,
          "resting position remains stable",
        );
        await page.mouse.wheel(0, -180);
      }
    }
    const closing = await scene(page, "closing").boundingBox();
    check(
      closing.y < 844 && closing.y + closing.height > 0,
      "ordinary scrolling reaches closing",
    );
    await page.mouse.wheel(0, -1200);
    await page.waitForTimeout(200);
    check(
      await page.evaluate(
        () => scrollY < document.documentElement.scrollHeight - innerHeight,
      ),
      "reverse direction remains usable",
    );
    await noOverflow(page);
    check(
      errors.length === 0,
      `content survives missing animation API ${errors}`,
    );
  } finally {
    await context.close();
  }
});
await test("large gallery returns focus to the visible selected image", async () => {
  const { page, context, errors } = await fixture(390, 844, "?gallery7=1");
  try {
    await enter(page);
    await seek(page, "gallery");
    await page
      .getByRole("button", { name: "Perbesar foto 1", exact: true })
      .click();
    for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
    check(
      (await page.locator("dialog[open]").innerText()).includes("4 / 7"),
      "large gallery advances index",
    );
    await page.keyboard.press("Escape");
    check(
      await page
        .getByRole("button", { name: "Perbesar foto 4", exact: true })
        .evaluate((e) => document.activeElement === e),
      "focus restores to visible photo when original trigger is hidden",
    );
    check(errors.length === 0, `runtime errors ${errors}`);
  } finally {
    await context.close();
  }
});
await test("long names on short and landscape covers", async () => {
  for (const [width, height] of [
    [360, 560],
    [844, 390],
  ]) {
    const { page, context, errors } = await fixture(width, height, "?stress=1");
    try {
      const cta = page
        .locator("[data-lakon-cover]")
        .getByRole("button", { name: "Buka Undangan", exact: true });
      const box = await cta.boundingBox();
      check(
        box.y >= 0 && box.y + box.height <= height,
        "long-name CTA remains within the short viewport",
      );
      await noOverflow(page);
      await shot(page, `long-cover-${width}-${height}`);
      await enter(page);
      check(
        (await scene(page, "event-details").locator("article").count()) === 4,
        "all schedules remain rendered",
      );
      check(errors.length === 0, `runtime errors ${errors}`);
    } finally {
      await context.close();
    }
  }
});
await test("committed mobile Builder drawers, bookmark, editing and autosave", async () => {
  for (const width of [360, 390, 768]) {
    const { page, context, state, errors } = await fixture(width, 844, "", {
      path: "/lakon-validation-shell",
    });
    try {
      const preview = page.locator("main").first(),
        inspector = page.locator("#builder-inspector");
      await page.locator("[data-device-scroller] [data-lakon-root]").waitFor();
      await noOverflow(page);
      check(
        (await preview.isVisible()) && (await inspector.isHidden()),
        "mobile starts with a visible preview panel",
      );
      check(
        (await page
          .getByRole("combobox", { name: "Perangkat pratinjau" })
          .inputValue()) === "galaxy-s25",
        "committed default device is preserved without a template override",
      );
      await page
        .getByRole("button", { name: "Buka panel Bagian", exact: true })
        .click();
      await page
        .locator("#builder-sections")
        .getByRole("button", { name: "Sampul / Pembuka", exact: true })
        .click();
      await inspector.waitFor({ state: "visible" });
      check(await inspector.isVisible(), "selection opens Inspector on mobile");
      await inspector.getByLabel(/^Nama/).first().fill("Alya & Ilham");
      await page.waitForTimeout(1700);
      check(
        state.actions.length === 1 && state.actions[0].includes("Alya & Ilham"),
        "mobile edit uses existing autosave",
      );
      check(
        (
          await page
            .getByRole("navigation", { name: "Aksi Builder" })
            .locator("..")
            .innerText()
        ).includes("Tersimpan"),
        "mobile save state visible",
      );
      await page.keyboard.press("Escape");
      await page.waitForTimeout(600);
      check(
        (await scene(page, "hero").innerText()).includes("Alya"),
        "edited content appears in mobile preview",
      );
      const heroBox = await scene(page, "hero").boundingBox(),
        frameBox = await page
          .locator("[data-device-frame-viewport]")
          .boundingBox();
      check(
        heroBox.y < frameBox.y + frameBox.height &&
          heroBox.y + heroBox.height > frameBox.y,
        "bookmark reaches selected chapter after panel switch",
      );
      const trigger = page.getByRole("button", {
        name: "Buka panel Editor",
        exact: true,
      });
      await trigger.click();
      await page.keyboard.press("Tab");
      check(
        await inspector.evaluate((e) => e.contains(document.activeElement)),
        "committed drawer contains keyboard focus",
      );
      await page.keyboard.press("Escape");
      check(
        await trigger.evaluate((e) => e === document.activeElement),
        "Escape restores drawer trigger focus",
      );
      await noOverflow(page);
      await shot(page, `builder-mobile-${width}`);
      check(errors.length === 0, `runtime errors ${errors}`);
    } finally {
      await context.close();
    }
  }
});
for (const id of ["gerbang-puspa", "cinematic-vintage"])
  await test(`existing Builder desktop ${id}`, async () => {
    const { page, context, errors } = await fixture(
      1440,
      1000,
      `?template=${id}`,
      { path: "/lakon-validation-shell" },
    );
    try {
      await page
        .locator("[data-device-scroller] [data-section-id]")
        .first()
        .waitFor();
      check(
        await page.locator("#builder-sections").isVisible(),
        "desktop section panel preserved",
      );
      check(
        await page.locator("main").first().isVisible(),
        "desktop preview preserved",
      );
      check(
        await page.locator("#builder-inspector").isVisible(),
        "desktop inspector preserved",
      );
      check(
        await page.getByRole("navigation", { name: "Aksi Builder" }).isHidden(),
        "committed mobile dock stays out of desktop layout",
      );
      check(errors.length === 0, `runtime errors ${errors}`);
    } finally {
      await context.close();
    }
  });
await test("existing mobile Builder drawers preserve the preview owner", async () => {
  for (const id of ["gerbang-puspa", "cinematic-vintage"]) {
    const { page, context, errors } = await fixture(
      390,
      844,
      `?template=${id}`,
      { path: "/lakon-validation-shell" },
    );
    try {
      await page
        .locator("[data-device-scroller] [data-section-id]")
        .first()
        .waitFor();
      await page
        .getByRole("button", { name: "Buka panel Bagian", exact: true })
        .click();
      await page
        .locator("#builder-sections")
        .getByRole("button", { name: "Sampul / Pembuka", exact: true })
        .click();
      await page.locator("#builder-inspector").waitFor({ state: "visible" });
      check(
        (await page.locator("#builder-inspector").getByLabel(/^Nama/).count()) >
          0,
        `${id} fields remain editable`,
      );
      await page.keyboard.press("Escape");
      await page.waitForTimeout(600);
      check(
        await page.locator("main").first().isVisible(),
        `${id} preview returns`,
      );
      check(
        await page
          .locator("[data-device-scroller]")
          .evaluate((e) => e.clientWidth > 0 && e.clientHeight > 0),
        `${id} keeps a measurable scroll owner`,
      );
      await noOverflow(page);
      check(errors.length === 0, `runtime errors ${errors}`);
    } finally {
      await context.close();
    }
  }
});
await browser.close();
console.log(
  JSON.stringify({
    assertions,
    passed: results.filter((r) => r.status === "PASS").length,
    failed: results.filter((r) => r.status === "FAIL").length,
    output: out,
  }),
);
if (results.some((r) => r.status === "FAIL")) process.exitCode = 1;

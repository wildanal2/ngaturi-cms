import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createRunner,
  dueTasks,
  parseCrontab,
} from "../ops/production/scheduler.mjs";

const source = readFileSync(
  new URL("../ops/production/scheduler.crontab", import.meta.url),
  "utf8",
);
const jobs = parseCrontab(source);
const healthy = () => new Response("ok", { status: 200 });

test("existing schedules run in UTC without invented timings", () => {
  assert.deepEqual(dueTasks(jobs, new Date("2026-10-01T08:00:00+07:00")), [
    "lock-expired-edits",
    "reconcile-doku-payments",
  ]);
  assert.deepEqual(dueTasks(jobs, new Date("2026-10-01T01:30:00Z")), [
    "archive-expired",
    "reconcile-doku-payments",
  ]);
  assert.deepEqual(dueTasks(jobs, new Date("2026-10-01T01:31:00Z")), []);
  assert.deepEqual(dueTasks(jobs, new Date("2026-10-01T12:05:00Z")), [
    "reconcile-doku-payments",
  ]);
});

test("configuration fails closed for duplicate/missing/unknown jobs", () => {
  assert.throws(() =>
    parseCrontab(source + "\n*/5 * * * * reconcile-doku-payments"),
  );
  assert.throws(() => parseCrontab("0 1 * * * lock-expired-edits"));
  assert.throws(() =>
    parseCrontab(source.replace("archive-expired", "arbitrary-shell-command")),
  );
  assert.throws(() => parseCrontab(source.replace("0 1", "60 1")));
  assert.throws(() => createRunner({ secret: "" }));
});

test("requests use protected private endpoints and bounded deadlines, without secret logs", async () => {
  const calls = [],
    logs = [];
  const runner = createRunner({
    secret: "fixture-secret",
    log: (x) => logs.push(x),
    fetcher: async (url, options) => {
      calls.push({ url, options });
      return healthy();
    },
  });
  await runner.run("archive-expired");
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, "http://app:8080/api/health");
  assert.equal(calls[1].url, "http://app:8080/api/cron/archive-expired");
  assert.equal(calls[1].options.headers.Authorization, "Bearer fixture-secret");
  assert.equal(calls[1].options.redirect, "error");
  assert(calls[1].options.signal instanceof AbortSignal);
  assert(!logs.join("").includes("fixture-secret"));
  assert(logs.some((x) => x.includes('"completed"')));
});

test("overlap skips a second invocation and stop drains in-flight work", async () => {
  let finish;
  const pending = new Promise((resolve) => {
    finish = resolve;
  });
  const calls = [],
    logs = [];
  const runner = createRunner({
    secret: "x",
    log: (x) => logs.push(x),
    fetcher: async (url) => {
      calls.push(url);
      return url.endsWith("/health") ? healthy() : pending;
    },
  });
  const first = runner.run("lock-expired-edits");
  await runner.run("lock-expired-edits");
  let drained = false;
  const stop = runner.stop().then(() => {
    drained = true;
  });
  await runner.run("archive-expired");
  await new Promise((r) => setImmediate(r));
  assert.equal(drained, false);
  finish(healthy());
  await first;
  await stop;
  assert.equal(calls.filter((x) => x.includes("/cron/")).length, 1);
  assert(logs.some((x) => x.includes("overlap_or_uncertain_completion")));
  assert(logs.some((x) => x.includes("stopping")));
});

test("unhealthy app skips jobs; HTTP failure is logged with no immediate retry", async () => {
  let calls = 0;
  const runner = createRunner({
    secret: "x",
    log: () => {},
    fetcher: async () => {
      calls++;
      return new Response("", { status: 503 });
    },
  });
  await runner.run("archive-expired");
  assert.equal(calls, 1);
  const logs = [];
  calls = 0;
  const failure = createRunner({
    secret: "x",
    log: (x) => logs.push(x),
    fetcher: async (url) => {
      calls++;
      return url.endsWith("/health")
        ? healthy()
        : new Response("", { status: 502 });
    },
  });
  await failure.run("reconcile-doku-payments");
  assert.equal(calls, 2);
  assert(logs.some((x) => x.includes('"status":502')));
});

test("timeout/uncertain completion blocks future invocations until coordinated restart", async () => {
  let calls = 0;
  const logs = [];
  const runner = createRunner({
    secret: "x",
    timeoutMs: 10,
    log: (x) => logs.push(x),
    fetcher: async (url, options) => {
      calls++;
      if (url.endsWith("/health")) return healthy();
      return new Promise((_resolve, reject) =>
        options.signal.addEventListener(
          "abort",
          () => reject(new Error("timeout")),
          { once: true },
        ),
      );
    },
  });
  // AbortSignal.timeout uses an unref'd timer; keep the test event loop alive.
  const keepAlive = setTimeout(() => {}, 100);
  await runner.run("reconcile-doku-payments");
  await runner.run("reconcile-doku-payments");
  clearTimeout(keepAlive);
  assert.equal(calls, 2);
  assert(
    logs.some((x) =>
      x.includes("completion_unknown_restart_app_and_scheduler"),
    ),
  );
});

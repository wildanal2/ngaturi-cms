import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const TASKS = new Set([
  "lock-expired-edits",
  "archive-expired",
  "reconcile-doku-payments",
]);

function field(value, maximum) {
  if (value === "*") return () => true;
  if (/^\*\/[1-9][0-9]?$/.test(value)) {
    const step = Number(value.slice(2));
    if (step <= maximum) return (number) => number % step === 0;
  }
  if (/^(0|[1-9][0-9]?)$/.test(value) && Number(value) <= maximum) {
    return (number) => number === Number(value);
  }
  throw new Error("Unsupported minute/hour in scheduler.crontab");
}

// Deliberately supports only the daily/every-N-minute schedules used here.
export function parseCrontab(source) {
  const jobs = [];
  const seen = new Set();
  for (const line of source.split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const [minute, hour, day, month, weekday, task, extra] = line
      .trim()
      .split(/\s+/);
    if (
      extra ||
      day !== "*" ||
      month !== "*" ||
      weekday !== "*" ||
      !TASKS.has(task) ||
      seen.has(task)
    ) {
      throw new Error("Invalid or duplicate task in scheduler.crontab");
    }
    seen.add(task);
    jobs.push({ task, minute: field(minute, 59), hour: field(hour, 23) });
  }
  if (seen.size !== TASKS.size)
    throw new Error("All three maintenance tasks are required");
  return jobs;
}

export function dueTasks(jobs, date) {
  return jobs
    .filter(
      (job) => job.minute(date.getUTCMinutes()) && job.hour(date.getUTCHours()),
    )
    .map((job) => job.task);
}

export function createRunner({
  secret,
  fetcher = fetch,
  log = console.log,
  timeoutMs = 240000,
}) {
  if (!secret) throw new Error("CRON_SECRET is required");
  const running = new Map();
  const blocked = new Set();
  let stopping = false;
  const emit = (task, event, details = {}) =>
    log(
      JSON.stringify({
        at: new Date().toISOString(),
        task,
        event,
        ...details,
      }),
    );

  function run(task) {
    if (!TASKS.has(task)) throw new Error("Unknown scheduler task");
    if (stopping || running.has(task) || blocked.has(task)) {
      emit(task, "skipped", {
        reason: stopping ? "stopping" : "overlap_or_uncertain_completion",
      });
      return Promise.resolve();
    }
    const work = (async () => {
      let invoked = false;
      try {
        const health = await fetcher("http://app:8080/api/health", {
          signal: AbortSignal.timeout(3000),
          redirect: "error",
        });
        await health.body?.cancel();
        if (health.status !== 200) {
          emit(task, "skipped", { reason: "app_unhealthy" });
          return;
        }
        emit(task, "started");
        invoked = true;
        const response = await fetcher(`http://app:8080/api/cron/${task}`, {
          headers: { Authorization: `Bearer ${secret}` },
          signal: AbortSignal.timeout(timeoutMs),
          redirect: "error",
        });
        // Wait for completion, not just response headers; never log response data/secrets.
        await response.arrayBuffer();
        emit(task, response.ok ? "completed" : "failed", {
          status: response.status,
        });
      } catch {
        // An aborted client does not prove server work stopped. Do not reissue
        // this task until the app and scheduler have been restarted together.
        if (invoked) blocked.add(task);
        emit(task, "failed", {
          reason: invoked
            ? "completion_unknown_restart_app_and_scheduler"
            : "app_unavailable",
        });
      } finally {
        running.delete(task);
      }
    })();
    running.set(task, work);
    return work;
  }
  return {
    run,
    async stop() {
      stopping = true;
      await Promise.all(running.values());
    },
  };
}

async function main() {
  if (process.env.SCHEDULER_ENABLED !== "true") {
    throw new Error(
      "Scheduler activation requires SCHEDULER_ENABLED=true after old owners stop",
    );
  }
  const jobs = parseCrontab(
    await readFile(new URL("./scheduler.crontab", import.meta.url), "utf8"),
  );
  const runner = createRunner({ secret: process.env.CRON_SECRET });
  let timer;
  let stopping = false;
  let lastMinute;
  const tick = () => {
    if (stopping) return;
    const now = new Date();
    const minute = Math.floor(now.getTime() / 60000);
    if (minute !== lastMinute) {
      lastMinute = minute;
      for (const task of dueTasks(jobs, now)) void runner.run(task);
    }
    timer = setTimeout(tick, 60000 - (Date.now() % 60000));
  };
  // No catch-up run on start/restart; wait for the next UTC minute boundary.
  timer = setTimeout(tick, 60000 - (Date.now() % 60000));
  console.log(
    JSON.stringify({
      event: "scheduler_started",
      timezone: "UTC",
      jobs: jobs.map((j) => j.task),
    }),
  );
  for (const signal of ["SIGTERM", "SIGINT"]) {
    process.once(signal, async () => {
      stopping = true;
      clearTimeout(timer);
      await runner.stop();
      console.log(JSON.stringify({ event: "scheduler_drained" }));
    });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

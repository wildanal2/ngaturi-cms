const secret = process.env.CRON_SECRET;
if (!secret) {
  console.error("DOKU reconciliation cron: CRON_SECRET is missing");
  process.exit(1);
}

const baseUrl = process.env.NGATURI_CRON_BASE_URL ?? "http://127.0.0.1:3009";
const target = new URL("/api/cron/reconcile-doku-payments", baseUrl);

try {
  const response = await fetch(target, {
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(240_000),
  });
  const payload = await response.json().catch(() => ({}));
  const safeResult = {
    timestamp: new Date().toISOString(),
    httpStatus: response.status,
    selected: payload.selected,
    checked: payload.checked,
    transitioned: payload.transitioned,
    fulfilled: payload.fulfilled,
    statuses: payload.statuses,
    errors: payload.errors,
    truncated: payload.truncated,
    error: payload.error,
  };
  console.log(JSON.stringify(safeResult));
  if (!response.ok) process.exitCode = 1;
} catch {
  console.error("DOKU reconciliation cron: localhost request failed");
  process.exitCode = 1;
}

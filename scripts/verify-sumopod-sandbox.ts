import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "dotenv";
import { providerRequest } from "../src/lib/payments/http";
import { PaymentProviderError } from "../src/lib/payments/provider";
import {
  normalizeSumopodPayment,
  parseSumopodCreatedPayment,
  SUMOPOD_SANDBOX_BASE_URL,
} from "../src/lib/payments/sumopod";

// Explicit sandbox-only contract probe. No database access, simulation, retries, or live endpoint.
// Run: npx tsx scripts/verify-sumopod-sandbox.ts /path/to/ignored/sandbox.env
async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("sandbox_environment_file_required");
  const config = parse(await readFile(file));
  if (
    config.SUMOPOD_BASE_URL !== SUMOPOD_SANDBOX_BASE_URL ||
    !config.SUMOPOD_API_KEY
  ) {
    throw new Error("sandbox_configuration_invalid");
  }
  const previous = process.argv[3]
    ? JSON.parse(await readFile(process.argv[3], "utf8"))
    : null;
  if (previous && previous.environment !== "sandbox")
    throw new Error("sandbox_evidence_required");
  const reference =
    previous?.reference ??
    `NGTEST-${randomUUID().replaceAll("-", "").slice(0, 20)}`;
  const amount = previous?.amount ?? 49_000;
  const callback = `https://example.invalid/payment/callback?invoice=${reference}`;
  let data;
  if (previous) {
    data = {
      payment_id: previous.paymentId,
      payment_link_url: previous.redirectUrl,
      order_id: previous.reference,
      amount: previous.amount,
      status: previous.providerStatus,
    };
    console.log(
      JSON.stringify({
        scenario: "existing_sandbox_create_evidence",
        noCreationRequest: true,
      }),
    );
  } else {
    const { response, rawBody } = await providerRequest(
      `${SUMOPOD_SANDBOX_BASE_URL}/api/v1/payments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": config.SUMOPOD_API_KEY,
        },
        body: JSON.stringify({
          order_id: reference,
          amount,
          currency: "IDR",
          expires_in_hours: 24,
          success_return_url: callback,
          cancel_return_url: callback,
          payment_method_type_code: "QRIS",
        }),
      },
    );
    console.log(
      JSON.stringify({
        scenario: "official_sandbox_create",
        httpStatus: response.status,
      }),
    );
    if (!response.ok) throw new Error("sandbox_create_not_accepted");
    data = JSON.parse(rawBody);
  }
  const directory = await mkdtemp(join(tmpdir(), "ngaturi-sumopod-sandbox-"));
  // Retain the accepted sandbox identity even when a documented-contract validator rejects it.
  await writeFile(
    join(directory, "evidence.json"),
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        environment: "sandbox",
        reference,
        paymentId: data.payment_id,
        redirectUrl: data.payment_link_url,
        amount: data.amount,
        providerStatus: data.status,
        expiresAt: typeof data.expires_at === "string" ? data.expires_at : null,
        webhookConfiguredLocally: Boolean(
          config.SUMOPOD_WEBHOOK_SECRET || config.SUMOPOD_WEBHOOK_TOKEN,
        ),
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  console.log(
    JSON.stringify({
      scenario: "observed_sandbox_response",
      fields: Object.keys(data),
      checkoutHost: new URL(data.payment_link_url).hostname,
      status: data.status,
      evidenceDirectory: directory,
    }),
  );
  const created = parseSumopodCreatedPayment(
    { merchantReference: reference, amount: String(amount), currency: "IDR" },
    data,
  );
  const observation = normalizeSumopodPayment(data);
  console.log(
    JSON.stringify({
      scenario: "create_response_validation",
      passed: true,
      status: observation.status,
      checkoutHost: new URL(created.redirectUrl).hostname,
      evidenceDirectory: directory,
    }),
  );
  try {
    const hosted = await fetch(created.redirectUrl, {
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });
    console.log(
      JSON.stringify({
        scenario: "hosted_checkout_http",
        httpStatus: hosted.status,
        html:
          hosted.headers.get("content-type")?.includes("text/html") ?? false,
      }),
    );
  } catch {
    console.log(
      JSON.stringify({
        scenario: "hosted_checkout_http",
        passed: false,
        category: "network_unavailable",
      }),
    );
  }
}

main().catch((error) => {
  // Never print provider response bodies, headers, environment, or arbitrary error messages.
  const code =
    error instanceof PaymentProviderError ? error.code : "sandbox_probe_failed";
  console.error(
    JSON.stringify({
      scenario: "sandbox_probe",
      passed: false,
      category: code,
    }),
  );
  process.exitCode = 1;
});

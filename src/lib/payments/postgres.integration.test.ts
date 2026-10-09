import { createHash, createHmac, randomUUID } from "node:crypto";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  copyFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { and, eq } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { Database } from "@/lib/db";

let database: Database;
let fixtureUser: string;
vi.mock("@/lib/db", () => ({ db: {}, getDb: () => database }));
vi.mock("@/lib/auth/helpers", () => ({
  getSession: async () => ({
    user: {
      id: fixtureUser,
      name: "Payment test",
      email: "isolated-test@example.invalid",
    },
  }),
}));

import * as schema from "@/lib/db/schema";
import { env } from "@/lib/env";
import { reservePaymentAttempt } from "./checkout";
import { applyPaymentObservation } from "./grant";
import { normalizeDokuResult } from "./doku-provider";
import { normalizeSumopodPayment } from "./sumopod";
import { persistProviderReference } from "./reference";
import { resolvePaymentProvider } from "./registry";
import { resolvePaymentCallback } from "./callback";
import { loadUnresolvedPayments, reconcilePayments } from "./reconcile";
import { POST as createPayment } from "@/app/api/payments/create/route";
import { POST as sumopodWebhook } from "@/app/payment/webhook/sumopod/route";
import { POST as dokuWebhook } from "@/app/payment/webhook/doku/route";
import { PaymentProviderError, type PaymentObservation } from "./provider";

const url = process.env.PAYMENTS_TEST_DATABASE_URL;
if (url) {
  const parsed = new URL(url);
  if (
    process.env.PAYMENTS_TEST_ISOLATED !== "1" ||
    parsed.hostname !== "127.0.0.1" ||
    parsed.pathname !== "/ngaturi_payment_test"
  ) {
    throw new Error(
      "Payment integration tests require the disposable loopback test database runner",
    );
  }
}
const suite = url ? describe : describe.skip;
const client = url
  ? postgres(url, { max: 10, connection: { TimeZone: "UTC" } })
  : undefined;
let invitationId: string;
const originalEnv = {
  PAYMENT_PROVIDER: env.PAYMENT_PROVIDER,
  SUMOPOD_BASE_URL: env.SUMOPOD_BASE_URL,
  SUMOPOD_API_KEY: env.SUMOPOD_API_KEY,
  SUMOPOD_WEBHOOK_TOKEN: env.SUMOPOD_WEBHOOK_TOKEN,
  SUMOPOD_WEBHOOK_SECRET: env.SUMOPOD_WEBHOOK_SECRET,
  DOKU_CLIENT_ID: env.DOKU_CLIENT_ID,
  DOKU_SECRET_KEY: env.DOKU_SECRET_KEY,
};

async function storedPayment(
  overrides: Partial<typeof schema.payments.$inferInsert> = {},
) {
  const [row] = await database
    .insert(schema.payments)
    .values({
      userId: fixtureUser,
      invitationId,
      provider: "sumopod",
      providerOrderId: `NGTEST-${randomUUID()}`,
      providerPaymentId: randomUUID(),
      amount: "49000.00",
      currency: "IDR",
      status: "pending",
      kind: "invitation_unlock",
      planTier: "basic",
      createdAt: new Date("2020-01-01"),
      ...overrides,
    })
    .returning();
  return row;
}
function paidObservation(
  payment: typeof schema.payments.$inferSelect,
): PaymentObservation {
  if (payment.provider === "sumopod")
    return normalizeSumopodPayment({
      payment_id: payment.providerPaymentId,
      order_id: payment.providerOrderId,
      amount: payment.amount,
      status: "completed",
    });
  return normalizeDokuResult({
    invoiceNumber: payment.providerOrderId!,
    amount: payment.amount,
    currency: "IDR",
    status: "SUCCESS",
  });
}
async function row(id: string) {
  return (
    await database
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.id, id))
  )[0];
}
async function quota() {
  const [profile] = await database
    .select()
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.userId, fixtureUser));
  return profile?.invitationQuotaBonus ?? 0;
}
function sumopodEvent(
  payment: typeof schema.payments.$inferSelect,
  status = "completed",
) {
  return new Request("https://app.example/payment/webhook/sumopod", {
    method: "POST",
    headers: { "x-webhook-token": "test-webhook-token" },
    body: JSON.stringify({
      event_type: `payment.${status}`,
      data: {
        payment_id: payment.providerPaymentId,
        order_id: payment.providerOrderId,
        amount: payment.amount,
        status,
      },
    }),
  });
}
function dokuEvent(reference: string) {
  const raw = JSON.stringify({
    order: { invoice_number: reference, amount: 49_000, currency: "IDR" },
    transaction: { status: "SUCCESS" },
  });
  const path = "/payment/webhook/doku";
  const signature = createHmac("sha256", "test-doku-secret")
    .update(
      [
        "Client-Id:test-doku-client",
        "Request-Id:test-request",
        "Request-Timestamp:2026-09-21T07:00:00Z",
        `Request-Target:${path}`,
        `Digest:${createHash("sha256").update(raw).digest("base64")}`,
      ].join("\n"),
    )
    .digest("base64");
  return new Request(`https://app.example${path}`, {
    method: "POST",
    headers: {
      "Client-Id": "test-doku-client",
      "Request-Id": "test-request",
      "Request-Timestamp": "2026-09-21T07:00:00Z",
      Signature: `HMACSHA256=${signature}`,
    },
    body: raw,
  });
}
function checkoutRequest() {
  return new Request("https://app.example/api/payments/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      invitationId,
      kind: "invitation_unlock",
      plan: "basic",
      amount: 1,
    }),
  });
}

suite(
  "isolated PostgreSQL payment locking and recovery (provider HTTP is simulated)",
  () => {
    beforeAll(async () => {
      database = drizzle(client!, { schema });
      const folder = "src/lib/db/migrations";
      const journal = JSON.parse(
        await readFile(`${folder}/meta/_journal.json`, "utf8"),
      );
      const baseline = await mkdtemp(
        join(tmpdir(), "ngaturi-payment-baseline-"),
      );
      await mkdir(join(baseline, "meta"));
      const entries = journal.entries.filter(
        (entry: { idx: number }) => entry.idx < 8,
      );
      await writeFile(
        join(baseline, "meta/_journal.json"),
        JSON.stringify({ ...journal, entries }),
      );
      for (const entry of entries)
        await copyFile(
          `${folder}/${entry.tag}.sql`,
          join(baseline, `${entry.tag}.sql`),
        );
      await migrate(database, { migrationsFolder: baseline });
    }, 30_000);
    beforeEach(async () => {
      fixtureUser = `payment-test-${randomUUID()}`;
      await database.insert(schema.users).values({
        id: fixtureUser,
        name: "Isolated payment test",
        email: `${fixtureUser}@example.invalid`,
      });
      const [invitation] = await database
        .insert(schema.invitations)
        .values({ userId: fixtureUser, slug: `payment-test-${randomUUID()}` })
        .returning({ id: schema.invitations.id });
      invitationId = invitation.id;
      env.PAYMENT_PROVIDER = "sumopod";
      env.SUMOPOD_BASE_URL = "https://api-pay-sandbox.sumopod.com";
      env.SUMOPOD_API_KEY = "test-sandbox-key";
      env.SUMOPOD_WEBHOOK_TOKEN = "test-webhook-token";
      env.SUMOPOD_WEBHOOK_SECRET = undefined;
      env.DOKU_CLIENT_ID = "test-doku-client";
      env.DOKU_SECRET_KEY = "test-doku-secret";
      vi.stubGlobal(
        "fetch",
        vi.fn(() => {
          throw new Error(
            "Unexpected external request in isolated PostgreSQL test",
          );
        }),
      );
      vi.spyOn(console, "info").mockImplementation(() => {});
      vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(console, "error").mockImplementation(() => {});
    });
    afterEach(async () => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
      await database
        .delete(schema.payments)
        .where(eq(schema.payments.userId, fixtureUser));
      await database
        .delete(schema.userProfiles)
        .where(eq(schema.userProfiles.userId, fixtureUser));
      await database
        .delete(schema.invitations)
        .where(eq(schema.invitations.userId, fixtureUser));
      await database
        .delete(schema.users)
        .where(eq(schema.users.id, fixtureUser));
    });
    afterAll(async () => {
      Object.assign(env, originalEnv);
      await client?.end();
    });

    it("validates enum deployment ordering and commits additive migration before Sumopod persistence", async () => {
      const historical = await storedPayment({ provider: "doku" });
      await expect(
        client!`select 'sumopod'::public.payment_provider`,
      ).rejects.toMatchObject({ code: "22P02" });
      const migration = await readFile(
        "src/lib/db/migrations/0008_payment_provider_sumopod.sql",
        "utf8",
      );
      await expect(
        client!.begin(async (tx) => {
          await tx.unsafe(migration);
          await tx`select 'sumopod'::public.payment_provider`;
        }),
      ).rejects.toMatchObject({ code: "55P04" });
      await migrate(database, { migrationsFolder: "src/lib/db/migrations" });
      expect((await row(historical.id)).provider).toBe("doku");
      expect((await storedPayment()).provider).toBe("sumopod");
      await client!.unsafe(migration); // IF NOT EXISTS is repeatable.
      expect(
        (
          await client!`select count(*)::integer as count from drizzle.__drizzle_migrations`
        )[0].count,
      ).toBe(9);
    });
    it("serializes concurrent DOKU/Sumopod reservation into one unresolved same-kind attempt", async () => {
      const attempts = await Promise.allSettled(
        ["doku", "sumopod"].map((provider) =>
          reservePaymentAttempt(
            {
              userId: fixtureUser,
              invitationId,
              kind: "invitation_unlock",
              provider: provider as "doku" | "sumopod",
              merchantReference: `RACE-${randomUUID()}`,
            },
            database,
          ),
        ),
      );
      expect(
        attempts.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        attempts.find((result) => result.status === "rejected"),
      ).toMatchObject({ reason: { message: "payment_in_progress" } });
      expect(
        await database
          .select()
          .from(schema.payments)
          .where(eq(schema.payments.invitationId, invitationId)),
      ).toHaveLength(1);
    });
    it("blocks old pending DOKU attempts after switching new checkout to Sumopod", async () => {
      const existing = await storedPayment({ provider: "doku" });
      expect((await createPayment(checkoutRequest())).status).toBe(409);
      expect((await row(existing.id)).status).toBe("pending");
      expect(fetch).not.toHaveBeenCalled();
    });
    it("recovers historical locally expired DOKU success and blocks replacement until resolution", async () => {
      const existing = await storedPayment({
        provider: "doku",
        status: "expired",
        rawWebhook: null,
      });
      expect((await createPayment(checkoutRequest())).status).toBe(409);
      expect(
        await applyPaymentObservation(
          paidObservation(existing),
          { source: "reconciliation", paymentId: existing.id },
          database,
        ),
      ).toMatchObject({ status: "paid", fulfilled: true });
      expect(await quota()).toBe(1);
    });
    it.each([
      ["wrong_provider", { provider: "doku" }],
      ["merchant_reference_mismatch", { merchantReference: "another" }],
      ["provider_payment_id_mismatch", { providerPaymentId: "different" }],
      ["amount_mismatch", { amount: "49000.01" }],
      ["currency_mismatch", { currency: "USD" }],
      ["unsupported_refund", { status: "refunded" }],
    ] as const)(
      "rejects %s under the real payment row lock",
      async (code, override) => {
        const payment = await storedPayment();
        await expect(
          applyPaymentObservation(
            { ...paidObservation(payment), ...override },
            { source: "webhook", paymentId: payment.id },
            database,
          ),
        ).rejects.toMatchObject({ code });
        expect((await row(payment.id)).status).toBe("pending");
        expect(await quota()).toBe(0);
      },
    );
    it("processes concurrent duplicate Sumopod deliveries exactly once after selector switches to DOKU", async () => {
      const payment = await storedPayment();
      env.PAYMENT_PROVIDER = "doku";
      const responses = await Promise.all(
        Array.from({ length: 12 }, () => sumopodWebhook(sumopodEvent(payment))),
      );
      expect(responses.every((response) => response.status === 200)).toBe(true);
      expect((await row(payment.id)).status).toBe("paid");
      expect(await quota()).toBe(1);
    });
    it("serializes callback-before-webhook and webhook-before-callback for historical DOKU", async () => {
      const payment = await storedPayment({ provider: "doku" });
      vi.spyOn(
        resolvePaymentProvider("doku"),
        "getPaymentStatus",
      ).mockResolvedValue(paidObservation(payment));
      const [callback, webhook] = await Promise.all([
        resolvePaymentCallback(payment.providerOrderId!, database),
        dokuWebhook(dokuEvent(payment.providerOrderId!)),
      ]);
      expect(callback?.status).toBe("paid");
      expect(webhook.status).toBe(200);
      expect(await quota()).toBe(1);
      expect(
        (await resolvePaymentCallback(payment.providerOrderId!, database))
          ?.status,
      ).toBe("paid");
      expect(await quota()).toBe(1);
    });
    it("persists Sumopod reference without resetting settlement when webhook precedes create response", async () => {
      const paymentId = randomUUID();
      let release: (response: Response) => void = () => {};
      let reference = "";
      vi.stubGlobal(
        "fetch",
        vi.fn(async (_url, init) => {
          reference = JSON.parse(init.body).order_id;
          return new Promise<Response>((resolve) => {
            release = resolve;
          });
        }),
      );
      const creation = createPayment(checkoutRequest());
      await vi.waitFor(() => expect(reference).not.toBe(""));
      const [pending] = await database
        .select()
        .from(schema.payments)
        .where(eq(schema.payments.providerOrderId, reference));
      expect(pending.provider).toBe("sumopod");
      expect(pending.amount).toBe("49000.00");
      expect(
        (
          await sumopodWebhook(
            sumopodEvent({ ...pending, providerPaymentId: paymentId }),
          )
        ).status,
      ).toBe(200);
      const paidAt = (await row(pending.id)).paidAt;
      release(
        Response.json({
          payment_id: paymentId,
          order_id: reference,
          amount: 49_000,
          status: "pending",
          payment_link_url: `https://pay.sumopod.com/pay/${paymentId}`,
        }),
      );
      expect((await creation).status).toBe(200);
      expect(await row(pending.id)).toMatchObject({
        providerPaymentId: paymentId,
        status: "paid",
        paidAt,
      });
      expect(await quota()).toBe(1);
    });
    it("persists a late DOKU create reference after settlement even when webhook has no provider ID", async () => {
      const payment = await storedPayment({
        provider: "doku",
        providerPaymentId: null,
      });
      expect(
        (await dokuWebhook(dokuEvent(payment.providerOrderId!))).status,
      ).toBe(200);
      const paidAt = (await row(payment.id)).paidAt;
      await persistProviderReference(
        payment.id,
        "doku",
        payment.providerOrderId!,
        "late-doku-session",
        database,
      );
      expect(await row(payment.id)).toMatchObject({
        status: "paid",
        providerPaymentId: "late-doku-session",
        paidAt,
      });
      await expect(
        persistProviderReference(
          payment.id,
          "doku",
          payment.providerOrderId!,
          "different",
          database,
        ),
      ).rejects.toMatchObject({ code: "provider_payment_id_mismatch" });
      expect(await quota()).toBe(1);
    });
    it("retains financial success and a durable review when create and early webhook IDs conflict", async () => {
      const webhookId = randomUUID(),
        createId = randomUUID();
      let release: (response: Response) => void = () => {},
        reference = "";
      vi.stubGlobal(
        "fetch",
        vi.fn(async (_url, init) => {
          reference = JSON.parse(init.body).order_id;
          return new Promise<Response>((resolve) => {
            release = resolve;
          });
        }),
      );
      const creation = createPayment(checkoutRequest());
      await vi.waitFor(() => expect(reference).not.toBe(""));
      const [pending] = await database
        .select()
        .from(schema.payments)
        .where(eq(schema.payments.providerOrderId, reference));
      expect(
        (
          await sumopodWebhook(
            sumopodEvent({ ...pending, providerPaymentId: webhookId }),
          )
        ).status,
      ).toBe(200);
      release(
        Response.json({
          payment_id: createId,
          order_id: reference,
          amount: 49_000,
          status: "pending",
          payment_link_url: `https://pay.sumopod.com/pay/${createId}`,
        }),
      );
      expect((await creation).status).toBe(502);
      expect(await row(pending.id)).toMatchObject({
        status: "paid",
        providerPaymentId: webhookId,
        rawWebhook: {
          processing: {
            reviewRequired: true,
            category: "provider_reference_persistence_failed",
          },
        },
      });
      expect(await quota()).toBe(1);
    });
    it("rejects unknown browser references before any provider query", async () => {
      expect(
        await resolvePaymentCallback(`UNKNOWN-${randomUUID()}`, database),
      ).toBeNull();
      expect(fetch).not.toHaveBeenCalled();
    });
    it.each(["callback", "webhook"])(
      "fulfills once with %s arriving first for historical DOKU",
      async (first) => {
        const payment = await storedPayment({ provider: "doku" });
        vi.spyOn(
          resolvePaymentProvider("doku"),
          "getPaymentStatus",
        ).mockResolvedValue(paidObservation(payment));
        const callback = () =>
          resolvePaymentCallback(payment.providerOrderId!, database);
        const webhook = () => dokuWebhook(dokuEvent(payment.providerOrderId!));
        if (first === "callback") {
          await callback();
          await webhook();
        } else {
          await webhook();
          await callback();
        }
        expect((await row(payment.id)).status).toBe("paid");
        expect(await quota()).toBe(1);
      },
    );
    it("records two financial successes with one unlock under concurrent invitation locking", async () => {
      const a = await storedPayment({ planTier: "premium", amount: "99000" });
      const b = await storedPayment({ provider: "doku" });
      const results = await Promise.all(
        [a, b].map((payment) =>
          applyPaymentObservation(
            paidObservation(payment),
            { source: "webhook" },
            database,
          ),
        ),
      );
      expect(results.filter((result) => result.fulfilled)).toHaveLength(1);
      expect(results.filter((result) => result.reviewRequired)).toHaveLength(1);
      expect((await row(a.id)).status).toBe("paid");
      expect((await row(b.id)).status).toBe("paid");
      expect(await quota()).toBe(1);
      const winner = results[0].fulfilled ? a : b;
      expect(
        (
          await database
            .select()
            .from(schema.invitations)
            .where(eq(schema.invitations.id, invitationId))
        )[0].plan,
      ).toBe(winner.planTier);
    });
    it("does not downgrade premium or grant quota for a distinct late basic unlock", async () => {
      const premium = await storedPayment({
        amount: "99000",
        planTier: "premium",
      });
      const basic = await storedPayment({ provider: "doku" });
      await applyPaymentObservation(
        paidObservation(premium),
        { source: "webhook" },
        database,
      );
      expect(
        await applyPaymentObservation(
          paidObservation(basic),
          { source: "webhook" },
          database,
        ),
      ).toMatchObject({
        status: "paid",
        fulfilled: false,
        reviewRequired: true,
      });
      expect((await row(basic.id)).rawWebhook).toMatchObject({
        processing: {
          category: "duplicate_successful_unlock",
          duplicateSuccessfulUnlock: true,
        },
      });
      await applyPaymentObservation(
        {
          ...paidObservation(basic),
          status: "expired",
          providerStatus: "EXPIRED",
        },
        { source: "reconciliation" },
        database,
      );
      expect((await row(basic.id)).rawWebhook).toMatchObject({
        processing: {
          category: "contradictory_terminal_evidence",
          duplicateSuccessfulUnlock: true,
        },
      });
      expect(
        (
          await database
            .select()
            .from(schema.invitations)
            .where(eq(schema.invitations.id, invitationId))
        )[0].plan,
      ).toBe("premium");
      expect(await quota()).toBe(1);
    });
    it("stacks valid distinct renewals across providers under real invitation locks", async () => {
      const expiry = new Date(Date.now() + 10 * 86_400_000);
      await database
        .update(schema.invitations)
        .set({
          isPaid: true,
          plan: "premium",
          expiresAt: expiry,
          status: "published",
        })
        .where(eq(schema.invitations.id, invitationId));
      const a = await storedPayment({
        kind: "invitation_renewal",
        amount: "25000",
        planTier: "premium",
      });
      const b = await storedPayment({
        provider: "doku",
        kind: "invitation_renewal",
        amount: "25000",
        planTier: "premium",
      });
      const results = await Promise.all(
        [a, b].map((payment) =>
          applyPaymentObservation(
            paidObservation(payment),
            { source: "webhook" },
            database,
          ),
        ),
      );
      expect(results.every((result) => result.fulfilled)).toBe(true);
      const [inv] = await database
        .select()
        .from(schema.invitations)
        .where(eq(schema.invitations.id, invitationId));
      expect(inv.expiresAt!.getTime()).toBe(
        expiry.getTime() + 180 * 86_400_000,
      );
      expect(await quota()).toBe(0);
      expect((await row(a.id)).grantUntil).not.toEqual(
        (await row(b.id)).grantUntil,
      );
    });
    it("leaves a create timeout pending and blocks all replacement providers", async () => {
      const create = vi
        .spyOn(resolvePaymentProvider("sumopod"), "createPayment")
        .mockRejectedValue(new PaymentProviderError("provider_timeout"));
      expect((await createPayment(checkoutRequest())).status).toBe(502);
      const [pending] = await database
        .select()
        .from(schema.payments)
        .where(eq(schema.payments.invitationId, invitationId));
      expect(pending.status).toBe("pending");
      env.PAYMENT_PROVIDER = "doku";
      expect((await createPayment(checkoutRequest())).status).toBe(409);
      expect(create).toHaveBeenCalledOnce();
      expect(fetch).not.toHaveBeenCalled();
      const summary = await reconcilePayments({
        database,
        now: new Date(Date.now() + 3 * 60_000),
      });
      expect(summary).toMatchObject({
        checked: 0,
        unavailableProvider: 1,
        reviewRequired: 1,
        errors: 1,
      });
      expect((await row(pending.id)).status).toBe("pending");
      expect((await row(pending.id)).rawWebhook).toMatchObject({
        reconciliation: { category: "sumopod_status_contract_missing" },
      });
    });
    it("rotates stuck oldest rows so newer and never-attempted payments reach the next bounded batch", async () => {
      const refs: string[] = [];
      for (let i = 0; i < 56; i++)
        refs.push(
          (
            await storedPayment({
              provider: "doku",
              createdAt: new Date(Date.UTC(2020, 0, 1, 0, i)),
            })
          ).providerOrderId!,
        );
      vi.spyOn(
        resolvePaymentProvider("doku"),
        "getPaymentStatus",
      ).mockImplementation(async ({ providerOrderId }) =>
        normalizeDokuResult({
          invoiceNumber: providerOrderId,
          amount: "49000.00",
          status: "PENDING",
        }),
      );
      const first = await reconcilePayments({ database });
      expect(first).toMatchObject({
        selected: 50,
        checked: 50,
        aged: 50,
        truncated: true,
      });
      const next = await loadUnresolvedPayments(
        { newestCreatedAt: new Date(), limit: 50 },
        database,
      );
      expect(
        next.slice(0, 6).map((candidate) => candidate.providerOrderId),
      ).toEqual(refs.slice(50));
      expect((await reconcilePayments({ database })).checked).toBe(50);
      expect(
        await database
          .select()
          .from(schema.payments)
          .where(
            and(
              eq(schema.payments.userId, fixtureUser),
              eq(schema.payments.status, "pending"),
            ),
          ),
      ).toHaveLength(56);
    });
    it("does not silently discard contradictory authoritative terminal evidence", async () => {
      const payment = await storedPayment({
        provider: "doku",
        status: "expired",
        rawWebhook: { transaction: { status: "EXPIRED" } },
      });
      expect(
        await applyPaymentObservation(
          paidObservation(payment),
          { source: "reconciliation" },
          database,
        ),
      ).toMatchObject({
        status: "expired",
        fulfilled: false,
        reviewRequired: true,
      });
      expect((await row(payment.id)).rawWebhook).toMatchObject({
        processing: {
          category: "contradictory_terminal_evidence",
          conflictingObservation: { status: "paid" },
        },
      });
      expect((await createPayment(checkoutRequest())).status).toBe(409);
      expect(await quota()).toBe(0);
    });
    it("preserves financial-only DOKU refund semantics after fulfillment", async () => {
      const payment = await storedPayment({ provider: "doku" });
      await applyPaymentObservation(
        paidObservation(payment),
        { source: "webhook" },
        database,
      );
      const paidAt = (await row(payment.id)).paidAt;
      const refund = normalizeDokuResult({
        invoiceNumber: payment.providerOrderId!,
        amount: "49000.00",
        status: "REFUNDED",
        refund: { id: "refund-test", amount: 49_000 },
      });
      expect(
        await applyPaymentObservation(refund, { source: "webhook" }, database),
      ).toMatchObject({ status: "refunded", fulfilled: false });
      expect(
        await applyPaymentObservation(
          paidObservation(payment),
          { source: "status_query" },
          database,
        ),
      ).toMatchObject({ status: "refunded", fulfilled: false });
      expect((await row(payment.id)).paidAt).toEqual(paidAt);
      expect(await quota()).toBe(1);
      expect(
        (
          await database
            .select()
            .from(schema.invitations)
            .where(eq(schema.invitations.id, invitationId))
        )[0].isPaid,
      ).toBe(true);
    });
    it("uses persisted provider on callback and retains webhook-paid Sumopod when lookup is unavailable", async () => {
      const payment = await storedPayment();
      await sumopodWebhook(sumopodEvent(payment));
      env.PAYMENT_PROVIDER = "doku";
      expect(
        await resolvePaymentCallback(payment.providerOrderId!, database),
      ).toMatchObject({ provider: "sumopod", status: "paid" });
      expect(
        await resolvePaymentCallback("unknown-browser-reference", database),
      ).toBeNull();
      expect(fetch).not.toHaveBeenCalled();
    });
  },
  30_000,
);

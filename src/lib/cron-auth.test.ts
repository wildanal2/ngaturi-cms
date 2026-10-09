import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  lock: vi.fn(),
  archive: vi.fn(),
  reconcile: vi.fn(),
}));
vi.mock("@/lib/env", () => ({ env: { CRON_SECRET: "fixture-cron-secret" } }));
vi.mock("@/lib/db", () => ({ getDb: vi.fn() }));
vi.mock("@/lib/invitation/cron", () => ({
  lockExpiredEdits: mocks.lock,
  archiveExpired: mocks.archive,
}));
vi.mock("@/lib/payments/doku", () => ({ isPaymentConfigured: () => true }));
vi.mock("@/lib/payments/reconcile", () => ({
  reconcilePayments: mocks.reconcile,
}));

import { isAuthorizedCron } from "./cron-auth";
import { GET as lock } from "@/app/api/cron/lock-expired-edits/route";
import { GET as archive } from "@/app/api/cron/archive-expired/route";
import { GET as reconcile } from "@/app/api/cron/reconcile-doku-payments/route";

beforeEach(() => vi.clearAllMocks());
describe("production scheduler endpoint protection", () => {
  it("accepts only the exact protected bearer header", () => {
    expect(
      isAuthorizedCron(
        new Request("http://app:8080", {
          headers: { Authorization: "Bearer fixture-cron-secret" },
        }),
      ),
    ).toBe(true);
    for (const header of [
      "",
      "Bearer wrong",
      "Basic fixture-cron-secret",
      "bearer fixture-cron-secret",
    ]) {
      expect(
        isAuthorizedCron(
          new Request("http://app:8080", {
            headers: { Authorization: header },
          }),
        ),
      ).toBe(false);
    }
  });
  it.each([lock, archive, reconcile])(
    "rejects unauthenticated and wrong-secret requests before task work",
    async (handler) => {
      for (const value of ["", "Bearer wrong"]) {
        const headers = new Headers();
        if (value) headers.set("Authorization", value);
        const response = await handler(
          new Request("http://app:8080/api/cron/task", { headers }),
        );
        expect(response.status).toBe(401);
      }
      expect(mocks.lock).not.toHaveBeenCalled();
      expect(mocks.archive).not.toHaveBeenCalled();
      expect(mocks.reconcile).not.toHaveBeenCalled();
    },
  );
});

import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
vi.mock("@/lib/db", () => ({ db: {} }));
import { authorizeGuest } from "./guest-authorization";

function database(rows: object[]) {
  const lock = vi.fn(async () => rows);
  const where = vi.fn((condition: import("drizzle-orm").SQL | undefined) => {
    void condition;
    return { limit: () => Object.assign(Promise.resolve(rows), { for: lock }) };
  });
  return {
    db: {
      select: () => ({ from: () => ({ where }) }),
    } as unknown as Parameters<typeof authorizeGuest>[3],
    where,
    lock,
  };
}
describe("guest bearer authorization", () => {
  it("does not treat a name or public guest ID as authorization", async () => {
    const { db, where } = database([]);
    expect(await authorizeGuest("inv", undefined, "Alice", db)).toBeUndefined();
    expect(where).not.toHaveBeenCalled();
  });
  it("scopes the secret token to the target invitation", async () => {
    const { db, where } = database([]);
    expect(
      await authorizeGuest("other-inv", "alice-token", "Alice", db),
    ).toBeUndefined();
    const query = new PgDialect().sqlToQuery(where.mock.calls[0][0]!);
    expect(query.sql).toContain('"invitation_id"');
    expect(query.sql).toContain('"slug_token"');
    expect(query.params).toEqual(["other-inv", "alice-token"]);
  });
  it("accepts the legitimate link and locks when requested", async () => {
    const guest = { id: "alice", guestName: "Alice" };
    const { db, lock } = database([guest]);
    expect(
      await authorizeGuest("inv", "alice-token", "Alice", db, true),
    ).toEqual(guest);
    expect(lock).toHaveBeenCalledWith("update");
  });
  it("rejects another guest's name despite a valid token", async () => {
    const { db } = database([{ id: "alice", guestName: "Alice" }]);
    expect(
      await authorizeGuest("inv", "alice-token", "Bob", db),
    ).toBeUndefined();
  });
});

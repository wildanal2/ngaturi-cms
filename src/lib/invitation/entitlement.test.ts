import { describe, expect, it } from "vitest";
import type { Invitation } from "./entitlement";
import {
  FREE_TRIAL_EDIT_DAYS,
  editExpiresAtFor,
  hasWatermark,
  isEditLocked,
  maxInvitationsFor,
} from "./entitlement";

const inv = (o: Partial<Invitation>) => o as Invitation;

describe("maxInvitationsFor", () => {
  it("free account gets 1", () => {
    expect(maxInvitationsFor(0)).toBe(1);
    expect(maxInvitationsFor(null)).toBe(1);
    expect(maxInvitationsFor(undefined)).toBe(1);
  });
  it("each paid package adds one slot", () => {
    expect(maxInvitationsFor(1)).toBe(2);
    expect(maxInvitationsFor(3)).toBe(4);
  });
  it("clamps negative bonus", () => {
    expect(maxInvitationsFor(-5)).toBe(1);
  });
});

describe("editExpiresAtFor", () => {
  it("gives free trials a 3-day window", () => {
    expect(FREE_TRIAL_EDIT_DAYS).toBe(3);
    const base = new Date("2026-01-01T00:00:00Z");
    const out = editExpiresAtFor("free_trial", base);
    expect(out?.toISOString()).toBe("2026-01-04T00:00:00.000Z");
  });
  it("returns null for paid plans", () => {
    expect(editExpiresAtFor("basic")).toBeNull();
    expect(editExpiresAtFor("premium")).toBeNull();
  });
});

describe("isEditLocked", () => {
  const past = new Date(Date.now() - 86_400_000);
  const future = new Date(Date.now() + 86_400_000);

  it("locks an expired unpaid free trial", () => {
    expect(isEditLocked(inv({ plan: "free_trial", isPaid: false, editExpiresAt: past }))).toBe(true);
  });
  it("does not lock while still within the window", () => {
    expect(isEditLocked(inv({ plan: "free_trial", isPaid: false, editExpiresAt: future }))).toBe(false);
  });
  it("never locks a paid invitation", () => {
    expect(isEditLocked(inv({ plan: "free_trial", isPaid: true, editExpiresAt: past }))).toBe(false);
    expect(isEditLocked(inv({ plan: "basic", isPaid: true, editExpiresAt: past }))).toBe(false);
  });
});

describe("hasWatermark", () => {
  it("only unpaid free trials carry a watermark", () => {
    expect(hasWatermark(inv({ plan: "free_trial", isPaid: false }))).toBe(true);
    expect(hasWatermark(inv({ plan: "free_trial", isPaid: true }))).toBe(false);
    expect(hasWatermark(inv({ plan: "basic", isPaid: true }))).toBe(false);
  });
});

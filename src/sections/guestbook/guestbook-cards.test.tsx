import { Children, isValidElement } from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { SectionRenderProps } from "../types";
const mocks = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("../public-form", () => ({ postInvitationForm: mocks.post }));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: (value: unknown) => [value, vi.fn()],
  useEffect: vi.fn(),
}));
import { GuestbookCards } from "./guestbook-cards";
beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());
function submit(preview = false) {
  const fields = { fixture: "form-data" };
  vi.stubGlobal(
    "FormData",
    class {
      constructor() {
        return fields;
      }
    },
  );
  const element = GuestbookCards({
    invitationId: "inv",
    isPreview: preview,
  } as SectionRenderProps);
  const form = Children.toArray(element.props.children).find(
    (node) => isValidElement(node) && node.type === "form",
  ) as React.ReactElement<{ onSubmit: (e: unknown) => Promise<void> }>;
  const reset = vi.fn();
  return {
    fields,
    reset,
    run: () =>
      form.props.onSubmit({
        preventDefault: vi.fn(),
        currentTarget: { reset },
      }),
  };
}
describe("cards guestbook personal-link submission", () => {
  it("uses shared authorized transport rather than dropping the personal token", async () => {
    mocks.post.mockResolvedValue({
      pending: false,
      message: { id: "new", name: "QA", message: "Hello" },
    });
    const s = submit();
    await s.run();
    expect(mocks.post).toHaveBeenCalledWith("inv", "guestbook", s.fields);
    expect(s.reset).toHaveBeenCalledOnce();
  });
  it("keeps entered data on server rejection", async () => {
    mocks.post.mockRejectedValue(new Error("Unauthorized"));
    const s = submit();
    await expect(s.run()).resolves.toBeUndefined();
    expect(s.reset).not.toHaveBeenCalled();
  });
  it("does not submit a preview", async () => {
    const s = submit(true);
    await s.run();
    expect(mocks.post).not.toHaveBeenCalled();
  });
});

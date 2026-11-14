import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getSession: vi.fn(), redirect: vi.fn() }));
vi.mock("@/lib/auth/helpers", () => ({ getSession: mocks.getSession }));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/auth/client", () => ({ signIn: { social: vi.fn() } }));
import LoginPage from "./page";
import { LoginForm } from "./login-form";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.redirect.mockImplementation((path: string) => {
    throw new Error(`redirect:${path}`);
  });
});
describe("login session guard", () => {
  it("preserves a safe explicit destination for a signed-in user", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "user-1" } });
    await expect(
      LoginPage({
        searchParams: Promise.resolve({ next: "/builder/123?tab=music" }),
      }),
    ).rejects.toThrow("redirect:/builder/123?tab=music");
  });
  it("keeps legacy redirect parameters but rejects external destinations", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "user-1" } });
    await expect(
      LoginPage({
        searchParams: Promise.resolve({
          redirect: "/templates/lakon-kencana/use",
        }),
      }),
    ).rejects.toThrow("redirect:/templates/lakon-kencana/use");
    await expect(
      LoginPage({
        searchParams: Promise.resolve({ next: "https://evil.example" }),
      }),
    ).rejects.toThrow("redirect:/invitations");
  });
  it("renders login for absent/expired sessions with a sanitized callback", async () => {
    mocks.getSession.mockResolvedValue(null);
    const result = await LoginPage({
      searchParams: Promise.resolve({ next: "/login" }),
    });
    expect(result.type).toBe(LoginForm);
    expect(result.props.next).toBe("/invitations");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
  it("redirects an already authenticated user instead of rendering login", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "user-1" } });
    await expect(
      Promise.resolve().then(() =>
        Reflect.apply(LoginPage, null, [{ searchParams: Promise.resolve({}) }]),
      ),
    ).rejects.toThrow("redirect:/invitations");
  });
});

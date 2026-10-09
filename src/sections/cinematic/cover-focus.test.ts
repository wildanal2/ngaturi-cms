import { afterEach, describe, expect, it, vi } from "vitest";
import { containCinematicCover } from "./cover-focus";

class Node extends EventTarget {
  inert = false;
  children: Node[] = [];
  root: Node | null = null;
  focus = vi.fn();
  scrollIntoView = vi.fn();
  contains(node: Node): boolean {
    return this === node || this.children.some((child) => child.contains(node));
  }
  closest() { return this.root; }
  querySelector() { return this.children[0]; }
}
afterEach(() => vi.unstubAllGlobals());

describe("Cinematic opening focus", () => {
  it("contains Tab behind the gate and restores existing inert states on open/unmount", () => {
    vi.stubGlobal("HTMLElement", Node);
    const invitation = new Node();
    const scene = new Node();
    const hiddenScene = new Node();
    hiddenScene.inert = true;
    const wrapper = new Node();
    const gate = new Node();
    const button = new Node();
    wrapper.children = [gate];
    gate.children = [button];
    gate.root = invitation;
    invitation.children = [scene, hiddenScene, wrapper];
    const cleanup = containCinematicCover(gate as unknown as HTMLElement);
    expect(scene.inert).toBe(true);
    expect(wrapper.inert).toBe(false);
    expect(button.focus).toHaveBeenCalledWith({ preventScroll: true });
    for (const shiftKey of [false, true]) {
      const event = Object.assign(new Event("keydown", { cancelable: true }), {
        key: "Tab", shiftKey,
      });
      gate.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    }
    expect(button.scrollIntoView).toHaveBeenCalledTimes(2);
    cleanup?.();
    expect(scene.inert).toBe(false);
    expect(hiddenScene.inert).toBe(true);
    const event = Object.assign(new Event("keydown", { cancelable: true }), { key: "Tab" });
    gate.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it("leaves standalone/Builder rendering alone", () => {
    const gate = new Node();
    expect(containCinematicCover(gate as unknown as HTMLElement)).toBeUndefined();
    expect(gate.focus).not.toHaveBeenCalled();
  });
});

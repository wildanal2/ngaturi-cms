import { describe, expect, it } from "vitest";
import { lockLightboxScroll } from "./lightbox-scroll";

class Style {
  values = new Map<string, [string, string]>();
  getPropertyValue(property: string) {
    return this.values.get(property)?.[0] ?? "";
  }
  getPropertyPriority(property: string) {
    return this.values.get(property)?.[1] ?? "";
  }
  setProperty(property: string, value: string, priority = "") {
    this.values.set(property, [value, priority]);
  }
  removeProperty(property: string) {
    this.values.delete(property);
  }
}
function fixture() {
  const html = new Style(),
    body = new Style();
  html.setProperty("overflow", "auto", "important");
  body.setProperty("padding-right", "4px");
  const document = {
    documentElement: { style: html, clientWidth: 980 },
    body: { style: body },
    defaultView: {
      innerWidth: 1000,
      getComputedStyle: () => ({ paddingRight: "4px" }),
    },
  } as unknown as Document;
  return { document, html, body };
}
describe("Serambi lightbox scroll ownership", () => {
  it("restores exact existing styles and priorities after the last owner closes", () => {
    const { document, html, body } = fixture();
    const releaseFirst = lockLightboxScroll(document),
      releaseSecond = lockLightboxScroll(document);
    expect(html.getPropertyValue("overflow")).toBe("hidden");
    expect(body.getPropertyValue("padding-right")).toBe("24px");
    releaseFirst();
    releaseFirst();
    expect(html.getPropertyValue("overflow")).toBe("hidden");
    releaseSecond();
    expect(html.getPropertyValue("overflow")).toBe("auto");
    expect(html.getPropertyPriority("overflow")).toBe("important");
    expect(body.getPropertyValue("overflow")).toBe("");
    expect(body.getPropertyValue("padding-right")).toBe("4px");
  });
  it("does not retain locks across repeated opens or independent documents", () => {
    const a = fixture(),
      b = fixture();
    for (let i = 0; i < 3; i++) {
      const closeA = lockLightboxScroll(a.document),
        closeB = lockLightboxScroll(b.document);
      closeA();
      expect(a.html.getPropertyValue("overflow")).toBe("auto");
      expect(b.html.getPropertyValue("overflow")).toBe("hidden");
      closeB();
      expect(b.html.getPropertyValue("overflow")).toBe("auto");
    }
  });
});

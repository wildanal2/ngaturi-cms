import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "./json-ld";

describe("JSON-LD script serialization", () => {
  it.each([
    "</script><script>alert(1)</script>",
    "<script src=evil></script>",
    "<!--</script><img src=x onerror=alert(1)>",
    "<\/script> & \u2028 \u2029",
  ])("keeps hostile invitation content inside valid JSON: %s", (payload) => {
    const value = {
      "@context": "https://schema.org",
      "@type": "Event",
      name: payload,
    };
    const output = serializeJsonLd(value);
    expect(JSON.parse(output)).toEqual(value);
    expect(output).not.toContain("<");
    expect(output).not.toContain(">");
    expect(output).not.toContain("&");
    expect(output).not.toMatch(/<\/script/i);
  });
});

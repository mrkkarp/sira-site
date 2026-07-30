import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "./json-ld";

describe("serializeJsonLd", () => {
  it("produces valid JSON that round-trips", () => {
    const data = { "@type": "Product", name: "Умивальник", price: 4200 };
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
  });

  it("escapes < > & so a payload can never break out of a <script> tag", () => {
    const out = serializeJsonLd({
      name: "</script><img src=x onerror=alert(1)>",
    });
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
    expect(out).toContain("\\u003c");
    expect(out).toContain("\\u003e");
    // still valid JSON with the original string intact after parsing
    expect(JSON.parse(out).name).toBe("</script><img src=x onerror=alert(1)>");
  });

  it("escapes ampersands", () => {
    const out = serializeJsonLd({ name: "Tom & Jerry" });
    expect(out).not.toContain("&");
    expect(out).toContain("\\u0026");
    expect(JSON.parse(out).name).toBe("Tom & Jerry");
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";
import { findLegacyRedirect } from "./legacy-redirects";

const findMock = vi.fn();

vi.mock("@/lib/payload-client", () => ({
  getPayloadClient: async () => ({ find: findMock }),
}));

describe("findLegacyRedirect", () => {
  beforeEach(() => {
    findMock.mockReset();
  });

  it("returns the stored toPath/statusCode for an active matching row", async () => {
    findMock.mockResolvedValueOnce({
      docs: [{ toPath: "/products/monro", statusCode: "301" }],
    });

    const result = await findLegacyRedirect("/monro");

    expect(result).toEqual({ toPath: "/products/monro", statusCode: 301 });
    expect(findMock).toHaveBeenCalledWith({
      collection: "redirects",
      where: {
        and: [{ fromPath: { equals: "/monro" } }, { active: { equals: true } }],
      },
      limit: 1,
      depth: 0,
    });
  });

  it("maps a stored '302' statusCode to a numeric 302", async () => {
    findMock.mockResolvedValueOnce({
      docs: [{ toPath: "/products/monro", statusCode: "302" }],
    });

    const result = await findLegacyRedirect("/monro");

    expect(result).toEqual({ toPath: "/products/monro", statusCode: 302 });
  });

  it("returns null when no row matches", async () => {
    findMock.mockResolvedValueOnce({ docs: [] });

    const result = await findLegacyRedirect("/no-such-path");

    expect(result).toBeNull();
  });

  it("fails safe (returns null) if the lookup throws", async () => {
    findMock.mockRejectedValueOnce(new Error("db unavailable"));

    const result = await findLegacyRedirect("/monro");

    expect(result).toBeNull();
  });
});

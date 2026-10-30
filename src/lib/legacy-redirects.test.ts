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

    const result = await findLegacyRedirect("/monro-302");

    expect(result).toEqual({ toPath: "/products/monro", statusCode: 302 });
  });

  it("returns null when no row matches", async () => {
    findMock.mockResolvedValueOnce({ docs: [] });

    const result = await findLegacyRedirect("/no-such-path");

    expect(result).toBeNull();
  });

  it("fails safe (returns null) if the lookup throws", async () => {
    findMock.mockRejectedValueOnce(new Error("db unavailable"));

    const result = await findLegacyRedirect("/monro-down");

    expect(result).toBeNull();
  });

  /**
   * The database is on a capped free plan and wakes for every query, so the
   * paths bots probe for — none of which can be an old-site page — must
   * never reach it.
   */
  it.each([
    "/wp-login.php",
    "/xmlrpc.php",
    "/.env",
    "/.well-known/security.txt",
    "/wp-content/plugins/x/readme.txt",
    "/wordpress",
    "/cgi-bin/luci",
    "/sitemap.xml",
  ])("answers %s without querying the database", async (path) => {
    expect(await findLegacyRedirect(path)).toBeNull();
    expect(findMock).not.toHaveBeenCalled();
  });

  it("asks the database once for a path asked about twice", async () => {
    findMock.mockResolvedValueOnce({ docs: [] });

    expect(await findLegacyRedirect("/asked-twice")).toBeNull();
    expect(await findLegacyRedirect("/asked-twice")).toBeNull();

    expect(findMock).toHaveBeenCalledTimes(1);
  });

  it("does not remember a failed lookup", async () => {
    findMock.mockRejectedValueOnce(new Error("db unavailable"));
    expect(await findLegacyRedirect("/riflo-retry")).toBeNull();

    findMock.mockResolvedValueOnce({
      docs: [{ toPath: "/products/riflo", statusCode: "301" }],
    });
    expect(await findLegacyRedirect("/riflo-retry")).toEqual({
      toPath: "/products/riflo",
      statusCode: 301,
    });
    expect(findMock).toHaveBeenCalledTimes(2);
  });
});

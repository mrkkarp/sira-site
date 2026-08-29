import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  findLegacyRedirect,
  resetLegacyRedirectCache,
} from "./legacy-redirects";

const findMock = vi.fn();

vi.mock("@/lib/payload-client", () => ({
  getPayloadClient: async () => ({ find: findMock }),
}));

const rows = (...docs: unknown[]) => ({ docs });

describe("findLegacyRedirect", () => {
  beforeEach(() => {
    findMock.mockReset();
    resetLegacyRedirectCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the stored toPath/statusCode for an active matching row", async () => {
    findMock.mockResolvedValueOnce(
      rows({ fromPath: "/monro", toPath: "/products/monro", statusCode: "301" }),
    );

    const result = await findLegacyRedirect("/monro");

    expect(result).toEqual({ toPath: "/products/monro", statusCode: 301 });
  });

  it("reads the active rows once, whole, rather than querying per path", async () => {
    /* The point of the whole exercise: `proxy.ts` sends every unknown path
       here, and unknown paths are mostly vulnerability scanners. One read has
       to answer all of them. */
    findMock.mockResolvedValueOnce(
      rows({ fromPath: "/monro", toPath: "/products/monro", statusCode: "301" }),
    );

    await findLegacyRedirect("/monro");
    await findLegacyRedirect("/wp-login.php");
    await findLegacyRedirect("/.env");
    await findLegacyRedirect("/monro");

    expect(findMock).toHaveBeenCalledTimes(1);
    expect(findMock).toHaveBeenCalledWith({
      collection: "redirects",
      where: { active: { equals: true } },
      limit: 5000,
      depth: 0,
    });
  });

  it("shares one read between lookups that race", async () => {
    let release: (value: unknown) => void = () => {};
    findMock.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );

    const first = findLegacyRedirect("/monro");
    const second = findLegacyRedirect("/pro-nas");
    release(
      rows({ fromPath: "/monro", toPath: "/products/monro", statusCode: "301" }),
    );

    expect(await first).toEqual({ toPath: "/products/monro", statusCode: 301 });
    expect(await second).toBeNull();
    expect(findMock).toHaveBeenCalledTimes(1);
  });

  it("maps a stored '302' statusCode to a numeric 302", async () => {
    findMock.mockResolvedValueOnce(
      rows({ fromPath: "/monro", toPath: "/products/monro", statusCode: "302" }),
    );

    expect(await findLegacyRedirect("/monro")).toEqual({
      toPath: "/products/monro",
      statusCode: 302,
    });
  });

  it("returns null when no row matches", async () => {
    findMock.mockResolvedValueOnce(rows());

    expect(await findLegacyRedirect("/no-such-path")).toBeNull();
  });

  it("fails safe (returns null) if the lookup throws", async () => {
    findMock.mockRejectedValueOnce(new Error("db unavailable"));

    expect(await findLegacyRedirect("/monro")).toBeNull();
  });

  it("keeps serving the loaded table when a later refresh fails", async () => {
    findMock.mockResolvedValueOnce(
      rows({ fromPath: "/monro", toPath: "/products/monro", statusCode: "301" }),
    );
    await findLegacyRedirect("/monro");

    // Past the TTL, so the next lookup goes back to the database — and fails.
    vi.advanceTimersByTime(16 * 60 * 1000);
    findMock.mockRejectedValueOnce(new Error("db unavailable"));

    expect(await findLegacyRedirect("/monro")).toEqual({
      toPath: "/products/monro",
      statusCode: 301,
    });
  });

  it("does not hammer the database while it is failing", async () => {
    findMock.mockRejectedValue(new Error("db unavailable"));

    await findLegacyRedirect("/monro");
    await findLegacyRedirect("/monro");
    await findLegacyRedirect("/monro");

    /* Nothing is cached yet, so a naive implementation would retry on every
       request — the one thing a struggling database does not need. The
       failure holds for its own back-off window. */
    expect(findMock).toHaveBeenCalledTimes(1);
  });

  it("goes back to the database once the TTL is up", async () => {
    findMock.mockResolvedValueOnce(
      rows({ fromPath: "/monro", toPath: "/old", statusCode: "301" }),
    );
    await findLegacyRedirect("/monro");

    vi.advanceTimersByTime(16 * 60 * 1000);
    findMock.mockResolvedValueOnce(
      rows({ fromPath: "/monro", toPath: "/new", statusCode: "301" }),
    );

    expect(await findLegacyRedirect("/monro")).toEqual({
      toPath: "/new",
      statusCode: 301,
    });
    expect(findMock).toHaveBeenCalledTimes(2);
  });

  it("skips rows with no fromPath instead of keying the table on nothing", async () => {
    findMock.mockResolvedValueOnce(
      rows(
        { fromPath: "", toPath: "/products/monro", statusCode: "301" },
        { fromPath: "/monro", toPath: "/products/monro", statusCode: "301" },
      ),
    );

    expect(await findLegacyRedirect("")).toBeNull();
    expect(await findLegacyRedirect("/monro")).not.toBeNull();
  });
});

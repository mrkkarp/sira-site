import { describe, expect, it } from "vitest";
import type { Payload } from "payload";
import {
  seedStaticLegacyRedirects,
  STATIC_LEGACY_REDIRECTS,
} from "./legacy-static-redirects";

function fakePayload(seed: Record<string, unknown>[] = []) {
  const store: Record<string, unknown>[] = [...seed];
  let nextId = 1;

  const payload = {
    async find({
      where,
      limit,
    }: {
      where?: { fromPath?: { equals?: unknown } };
      limit?: number;
    }) {
      let docs = store;
      const target = where?.fromPath?.equals;
      if (target !== undefined) {
        docs = docs.filter(
          (doc) => (doc as { fromPath?: unknown }).fromPath === target,
        );
      }
      if (limit) docs = docs.slice(0, limit);
      return { docs, totalDocs: docs.length };
    },
    async create({ data }: { data: Record<string, unknown> }) {
      const doc = { id: nextId++, ...data };
      store.push(doc);
      return doc;
    },
  };

  return { payload: payload as unknown as Payload, store };
}

describe("seedStaticLegacyRedirects", () => {
  it("creates one row per static mapping when none exist yet", async () => {
    const { payload, store } = fakePayload();

    const result = await seedStaticLegacyRedirects(payload);

    expect(result).toEqual({
      created: STATIC_LEGACY_REDIRECTS.length,
      skippedExisting: 0,
    });
    expect(store).toHaveLength(STATIC_LEGACY_REDIRECTS.length);
    for (const { fromPath, toPath } of STATIC_LEGACY_REDIRECTS) {
      expect(store).toContainEqual(
        expect.objectContaining({
          fromPath,
          toPath,
          statusCode: "301",
          active: true,
        }),
      );
    }
  });

  it("contains no redirect chains or loops (every target is a final destination)", () => {
    // A chain (A→B, B→C) or loop (A→B, B→A) makes crawlers follow multiple
    // 301s — wasted crawl budget and a soft-404 risk if any hop breaks. Guard:
    // no `toPath` may itself be a `fromPath`. Compare on the path *before* any
    // query string, since a target like `/about?x=1` still resolves to the
    // `/about` route.
    const sources = new Set(STATIC_LEGACY_REDIRECTS.map((r) => r.fromPath));
    const offenders = STATIC_LEGACY_REDIRECTS.filter((r) =>
      sources.has(r.toPath.split("?")[0].replace(/\/$/, "") || "/"),
    );
    expect(offenders).toEqual([]);
  });

  it("has unique source paths (no two mappings claim the same fromPath)", () => {
    const sources = STATIC_LEGACY_REDIRECTS.map((r) => r.fromPath);
    expect(new Set(sources).size).toBe(sources.length);
  });

  it("is idempotent: re-running skips already-seeded rows instead of duplicating them", async () => {
    const { payload, store } = fakePayload();

    await seedStaticLegacyRedirects(payload);
    const secondResult = await seedStaticLegacyRedirects(payload);

    expect(secondResult).toEqual({
      created: 0,
      skippedExisting: STATIC_LEGACY_REDIRECTS.length,
    });
    expect(store).toHaveLength(STATIC_LEGACY_REDIRECTS.length);
  });

  it("does not touch a pre-existing hand-edited row for the same fromPath", async () => {
    const { payload, store } = fakePayload([
      {
        id: 99,
        fromPath: "/pro-nas",
        toPath: "/about?custom=1",
        statusCode: "302",
        active: true,
      },
    ]);

    const result = await seedStaticLegacyRedirects(payload);

    expect(result.skippedExisting).toBe(1);
    expect(store).toContainEqual(
      expect.objectContaining({
        id: 99,
        fromPath: "/pro-nas",
        toPath: "/about?custom=1",
        statusCode: "302",
      }),
    );
  });
});

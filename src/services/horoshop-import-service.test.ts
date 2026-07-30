import { describe, expect, it } from "vitest";
import type { Payload } from "payload";
import type { ProductSourceRow } from "@/lib/schemas/product";
import {
  runHoroshopImport,
  type DownloadedPhoto,
} from "./horoshop-import-service";

/**
 * Hand-rolled in-memory fake `Payload` — same "no Payload, no Postgres"
 * approach as `order-service.test.ts`/`cart-service.test.ts`, generalised
 * across whichever collections the importer touches (`products`,
 * `categories`, `media`, `redirects`, `import-batches`, `import-warnings`).
 * Only supports the exact `find`/`create`/`update` shapes
 * `horoshop-import-service.ts` actually calls (a `where: {field: {equals}}`
 * filter, `limit`, and plain `data` merges) — not a general Payload
 * simulator.
 */
function fakePayload(seed: Record<string, Record<string, unknown>[]> = {}) {
  const store: Record<string, Record<string, unknown>[]> = {
    products: [],
    categories: [],
    media: [],
    redirects: [],
    "import-batches": [],
    "import-warnings": [],
    ...seed,
  };
  const nextId: Record<string, number> = {};
  const idFor = (collection: string) => {
    nextId[collection] = (nextId[collection] ?? 0) + 1;
    return nextId[collection];
  };

  const payload = {
    async find({
      collection,
      where,
      limit,
    }: {
      collection: string;
      where?: Record<string, { equals?: unknown }>;
      limit?: number;
    }) {
      let docs = store[collection] ?? [];
      if (where) {
        docs = docs.filter((doc) =>
          Object.entries(where).every(([field, cond]) =>
            cond && "equals" in cond ? doc[field] === cond.equals : true,
          ),
        );
      }
      if (limit) docs = docs.slice(0, limit);
      return { docs, totalDocs: docs.length };
    },
    async create({
      collection,
      data,
    }: {
      collection: string;
      data: Record<string, unknown>;
    }) {
      const doc = { id: idFor(collection), ...data };
      store[collection].push(doc);
      return doc;
    },
    async update({
      collection,
      id,
      data,
    }: {
      collection: string;
      id: number;
      data: Record<string, unknown>;
    }) {
      const index = store[collection].findIndex((doc) => doc.id === id);
      if (index === -1)
        throw new Error(`fakePayload: ${collection} #${id} not found`);
      store[collection][index] = { ...store[collection][index], ...data };
      return store[collection][index];
    },
  };

  return { payload: payload as unknown as Payload, store };
}

const row = (overrides: Partial<ProductSourceRow> = {}): ProductSourceRow => ({
  sku: "TEST-1",
  parentSku: "",
  name: "Тестовий товар",
  category: "Раковини/Підлогові",
  price: 5000,
  photo: "https://example.com/photo.jpg",
  gallery: [],
  alias: "test-1",
  shortDesc: "Короткий опис",
  fullDesc: "Повний опис",
  color: "Сірий базовий",
  ...overrides,
});

const noPhoto = async (): Promise<DownloadedPhoto | null> => null;
const fixedNow = () => new Date("2026-01-15T12:00:00.000Z");

describe("runHoroshopImport", () => {
  it("creates a new product, its category, and a redirect from the row's alias", async () => {
    const { payload, store } = fakePayload();
    const result = await runHoroshopImport(
      { mode: "live" },
      { payload, sourceRows: [row()], now: fixedNow, fetchPhoto: noPhoto },
    );

    expect(result.status).toBe("completed");
    expect(result.totals).toEqual({
      createdCount: 1,
      updatedCount: 0,
      skippedCount: 0,
      conflictCount: 0,
      failedCount: 0,
    });
    expect(store.products).toHaveLength(1);
    expect(store.products[0].sku).toBe("TEST-1");
    expect(store.products[0].legacy).toMatchObject({
      legacySource: "horoshop",
      legacyId: "TEST-1",
      migrationStatus: "imported",
    });
    expect(store.categories).toHaveLength(1);
    expect(store.categories[0].slug).toBe("sinks");
    expect(store.redirects).toHaveLength(1);
    expect(store.redirects[0]).toMatchObject({
      fromPath: "/test-1",
      toPath: "/products/test-1",
    });
  });

  it("dryRun creates real ImportBatch bookkeeping but writes no Products/Categories/Redirects", async () => {
    const { payload, store } = fakePayload();
    const result = await runHoroshopImport(
      { mode: "dryRun" },
      { payload, sourceRows: [row()], now: fixedNow, fetchPhoto: noPhoto },
    );

    expect(result.totals.createdCount).toBe(1);
    expect(store.products).toHaveLength(0);
    expect(store.categories).toHaveLength(0);
    expect(store.redirects).toHaveLength(0);
    expect(store["import-batches"]).toHaveLength(1);
    expect(store["import-batches"][0].status).toBe("completed");
  });

  it("skips (no write) when the source is unchanged since the last import", async () => {
    const { payload, store } = fakePayload();
    // First pass populates a real `legacy.sourceChecksum` to compare against.
    await runHoroshopImport(
      { mode: "live" },
      { payload, sourceRows: [row()], now: fixedNow, fetchPhoto: noPhoto },
    );
    const afterFirstRun = store.products[0];

    const result = await runHoroshopImport(
      { mode: "live" },
      { payload, sourceRows: [row()], now: fixedNow, fetchPhoto: noPhoto },
    );

    expect(result.totals).toEqual({
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 1,
      conflictCount: 0,
      failedCount: 0,
    });
    expect(store.products).toHaveLength(1);
    expect(store.products[0]).toEqual(afterFirstRun);
  });

  it("updates (not re-creates) when the source changed since the last import", async () => {
    const { payload, store } = fakePayload();
    await runHoroshopImport(
      { mode: "live" },
      { payload, sourceRows: [row()], now: fixedNow, fetchPhoto: noPhoto },
    );

    const result = await runHoroshopImport(
      { mode: "live" },
      {
        payload,
        sourceRows: [row({ price: 5500 })],
        now: fixedNow,
        fetchPhoto: noPhoto,
      },
    );

    expect(result.totals).toEqual({
      createdCount: 0,
      updatedCount: 1,
      skippedCount: 0,
      conflictCount: 0,
      failedCount: 0,
    });
    expect(store.products).toHaveLength(1);
    expect(store.products[0].basePrice).toBe(5500);
    expect(store.products[0].legacy).toMatchObject({
      migrationStatus: "updated",
    });
  });

  it("logs a warning (but still updates) when price moves more than 50%", async () => {
    const { payload, store } = fakePayload();
    // A successful photo download on the first run means the product
    // already has a `mainImage` by the second run, isolating the
    // assertion below to just the price-change warning (no repeated
    // "photo failed to download" warning on every run).
    const photo = async (): Promise<DownloadedPhoto | null> => ({
      data: Buffer.from("x"),
      mimetype: "image/jpeg",
      name: "photo.jpg",
      size: 1,
    });
    await runHoroshopImport(
      { mode: "live" },
      {
        payload,
        sourceRows: [row({ price: 1000 })],
        now: fixedNow,
        fetchPhoto: photo,
      },
    );

    const result = await runHoroshopImport(
      { mode: "live" },
      {
        payload,
        sourceRows: [row({ price: 2000 })],
        now: fixedNow,
        fetchPhoto: photo,
      },
    );

    expect(result.totals.updatedCount).toBe(1);
    expect(store["import-warnings"]).toHaveLength(1);
    expect(store["import-warnings"][0]).toMatchObject({ severity: "warning" });
  });

  it("conflicts (skips, never overwrites) a hand-authored product with no legacy import metadata", async () => {
    const { payload, store } = fakePayload({
      products: [
        { id: 1, sku: "TEST-1", slug: "hand-authored", basePrice: 100 },
      ],
    });

    const result = await runHoroshopImport(
      { mode: "live" },
      { payload, sourceRows: [row()], now: fixedNow, fetchPhoto: noPhoto },
    );

    expect(result.totals).toEqual({
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      conflictCount: 1,
      failedCount: 0,
    });
    // The hand-authored doc is untouched.
    expect(store.products).toEqual([
      { id: 1, sku: "TEST-1", slug: "hand-authored", basePrice: 100 },
    ]);
    expect(store["import-warnings"]).toHaveLength(1);
    expect(store["import-warnings"][0]).toMatchObject({ severity: "error" });
    // No redirect either — never guesses a target for a document the
    // importer never resolved a real slug for.
    expect(store.redirects).toHaveLength(0);
  });

  it("pairs a base row with its custom-colour sibling into one product with two variants", async () => {
    const { payload, store } = fakePayload();
    const baseRow = row({
      sku: "PAIR-1",
      parentSku: "",
      color: "Сірий базовий",
      alias: "pair-1",
    });
    const customRow = row({
      sku: "PAIR-1-custom",
      parentSku: "PAIR-1",
      color: "Свій колір",
      alias: "pair-1-custom",
      price: 6000,
    });

    await runHoroshopImport(
      { mode: "live" },
      {
        payload,
        sourceRows: [baseRow, customRow],
        now: fixedNow,
        fetchPhoto: noPhoto,
      },
    );

    expect(store.products).toHaveLength(1);
    const variants = store.products[0].variants as Array<{ sku: string }>;
    expect(variants.map((v) => v.sku)).toEqual(["PAIR-1", "PAIR-1-custom"]);
    // Both the base and custom-colour row's own alias become real redirects.
    expect((store.redirects.map((r) => r.fromPath) as string[]).sort()).toEqual(
      ["/pair-1-custom", "/pair-1"].sort(),
    );
  });

  it("attaches downloaded media as mainImage when fetchPhoto succeeds", async () => {
    const { payload, store } = fakePayload();
    const fetchPhoto = async (): Promise<DownloadedPhoto | null> => ({
      data: Buffer.from("fake-image-bytes"),
      mimetype: "image/jpeg",
      name: "photo.jpg",
      size: 16,
    });

    await runHoroshopImport(
      { mode: "live" },
      { payload, sourceRows: [row()], now: fixedNow, fetchPhoto },
    );

    expect(store.media).toHaveLength(1);
    expect(store.products[0].mainImage).toBe(store.media[0].id);
  });

  it("logs a warning (not a failure) and proceeds without mainImage when the photo download fails", async () => {
    const { payload, store } = fakePayload();
    const result = await runHoroshopImport(
      { mode: "live" },
      { payload, sourceRows: [row()], now: fixedNow, fetchPhoto: noPhoto },
    );

    expect(result.totals.failedCount).toBe(0);
    expect(store.products[0].mainImage).toBeUndefined();
    expect(store["import-warnings"]).toHaveLength(1);
    expect(store["import-warnings"][0]).toMatchObject({ severity: "warning" });
  });

  it("only maps real shopCategory values actually present among source rows, never pre-creating unrelated categories", async () => {
    const { payload, store } = fakePayload();
    await runHoroshopImport(
      { mode: "live" },
      {
        payload,
        sourceRows: [
          row({ sku: "A", category: "Раковини/Підлогові" }),
          row({ sku: "B", category: "Вазони/Вуличні" }),
        ],
        now: fixedNow,
        fetchPhoto: noPhoto,
      },
    );

    expect(store.categories.map((c) => c.slug).sort()).toEqual([
      "planters",
      "sinks",
    ]);
  });

  it("counts a failed product without aborting the rest of the batch", async () => {
    const { payload, store } = fakePayload();
    const fetchPhoto = async (): Promise<DownloadedPhoto | null> => {
      throw new Error("boom");
    };

    const result = await runHoroshopImport(
      { mode: "live" },
      {
        payload,
        sourceRows: [row({ sku: "OK-1" }), row({ sku: "FAILS-1" })],
        now: fixedNow,
        fetchPhoto,
      },
    );

    expect(result.totals.failedCount).toBe(2);
    expect(store["import-warnings"]).toHaveLength(2);
    expect(store["import-warnings"].every((w) => w.severity === "error")).toBe(
      true,
    );
  });
});

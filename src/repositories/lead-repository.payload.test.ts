import { describe, expect, it } from "vitest";
import {
  mapPayloadLeadToDomain,
  buildLeadData,
} from "./lead-repository.payload";
import type { Lead as PayloadLead } from "@/payload-types";
import type { NewLeadRequest } from "./lead-repository";
import { ProductId } from "@/domain/shared/ids";

const commonDoc = {
  id: 1,
  status: "new",
  locale: "uk",
  sourcePath: "/products/odri-60",
  name: "Іван Іванов",
  phone: "+380501234567",
  updatedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
} satisfies Partial<PayloadLead>;

describe("mapPayloadLeadToDomain", () => {
  it("maps a contact lead", () => {
    const lead = mapPayloadLeadToDomain({
      ...commonDoc,
      type: "contact",
      message: "Питання щодо доставки",
    } as PayloadLead);
    expect(lead).toMatchObject({
      type: "contact",
      id: "1",
      status: "new",
      locale: "uk",
      name: "Іван Іванов",
      phone: "+380501234567",
      message: "Питання щодо доставки",
    });
  });

  it("maps a quote lead with a product/variant reference", () => {
    const lead = mapPayloadLeadToDomain({
      ...commonDoc,
      type: "quote",
      productId: 42,
      variantSku: "ODRI-60-GREY",
      quantity: 3,
      message: "Потрібна ціна на 3 шт.",
    } as PayloadLead);
    expect(lead).toMatchObject({
      type: "quote",
      productId: "42",
      variantId: "ODRI-60-GREY",
      quantity: 3,
      message: "Потрібна ціна на 3 шт.",
    });
  });

  it("maps a warranty lead's photoIds relationship array down to bare ids", () => {
    const lead = mapPayloadLeadToDomain({
      ...commonDoc,
      type: "warranty",
      issueDescription: "Тріщина на поверхні",
      photoIds: [11, 12],
    } as PayloadLead);
    expect(lead).toMatchObject({
      type: "warranty",
      issueDescription: "Тріщина на поверхні",
    });
    if (lead.type === "warranty") {
      expect(lead.photoIds).toEqual(["11", "12"]);
    }
  });

  it("maps a sample lead's required address and productIds", () => {
    const lead = mapPayloadLeadToDomain({
      ...commonDoc,
      type: "sample",
      address: "вул. Хрещатик 1, Київ",
      productIds: [42, 43],
    } as PayloadLead);
    expect(lead).toMatchObject({
      type: "sample",
      address: "вул. Хрещатик 1, Київ",
    });
    if (lead.type === "sample") {
      expect(lead.productIds).toEqual(["42", "43"]);
    }
  });

  it("maps a callback lead's optional preferredTime", () => {
    const lead = mapPayloadLeadToDomain({
      ...commonDoc,
      type: "callback",
      preferredTime: "після 18:00",
    } as PayloadLead);
    expect(lead).toMatchObject({
      type: "callback",
      preferredTime: "після 18:00",
    });
  });
});

describe("buildLeadData", () => {
  const commonInput = {
    status: "new",
    locale: "uk",
    sourcePath: "/products/odri",
    name: "Марко",
    phone: "+380671112233",
  } as const;

  it("drops a non-numeric productId (a slug, in horoshop-snapshot mode) instead of writing NaN", () => {
    const data = buildLeadData({
      ...commonInput,
      type: "quote",
      productId: ProductId.parse("odri"),
      message: "Odri (Odri color)",
    } as NewLeadRequest);
    expect(data).toMatchObject({
      variantSku: undefined,
      message: "Odri (Odri color)",
    });
    expect("productId" in data ? data.productId : undefined).toBeUndefined();
  });

  it("keeps a genuinely numeric productId (a real future Payload relation id)", () => {
    const data = buildLeadData({
      ...commonInput,
      type: "quote",
      productId: ProductId.parse("42"),
      message: "Odri (Odri color)",
    } as NewLeadRequest);
    expect("productId" in data ? data.productId : undefined).toBe(42);
  });

  it("filters non-numeric ids out of a sample lead's productIds", () => {
    const data = buildLeadData({
      ...commonInput,
      type: "sample",
      address: "вул. Хрещатик 1, Київ",
      productIds: [ProductId.parse("odri"), ProductId.parse("42")],
    } as NewLeadRequest);
    expect("productIds" in data ? data.productIds : undefined).toEqual([42]);
  });
});

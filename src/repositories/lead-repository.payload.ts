import "server-only";
import type { Lead as PayloadLead } from "@/payload-types";
import { getPayloadClient } from "@/lib/payload-client";
import { LeadId, ProductId, VariantId, MediaId } from "@/domain/shared/ids";
import {
  LeadRequestSchema,
  type LeadRequest,
} from "@/domain/leads/lead-request";
import type { LeadStatus } from "@/domain/leads/lead-status";
import type { LeadSubmissionLocale } from "@/domain/leads/lead-common";
import type { LeadRepository, NewLeadRequest } from "./lead-repository";

function relationId(
  value: number | { id: number } | null | undefined,
): string | null {
  if (value == null) return null;
  return String(typeof value === "number" ? value : value.id);
}

function relationIds(
  values: (number | { id: number })[] | null | undefined,
): string[] {
  return (values ?? [])
    .map((v) => relationId(v))
    .filter((id): id is string => Boolean(id));
}

/**
 * `ProductId`/`VariantId` are plain branded strings and, in the current
 * `CATALOG_SOURCE=horoshop-snapshot` bridge mode (see
 * `product-repository.horoshop-snapshot.ts`), that string is the
 * product's real *slug* (e.g. `"odri"`), not a Payload document id —
 * there are no real `products` documents to relate to yet in that mode
 * (Phase G's Horoshop importer is what will eventually populate them).
 * `Leads.productId`/`productIds` are Payload relationship fields, which
 * require a numeric id, so a slug can't be stored there. Rather than
 * writing `NaN` (or Payload rejecting the write outright), this drops
 * the reference silently — the human-readable summary in `message`
 * already carries the real product/variant info for staff — and picks
 * it back up automatically once Phase G makes `ProductId` a real
 * Payload id.
 */
function toPayloadRelationId(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * The two qualification answers, as the domain wants them.
 *
 * Both are nullable columns holding an optional field, so Postgres `NULL`,
 * Payload's `null` and the domain's `undefined` all mean the same thing here —
 * "not answered" — and this is the one place that translation happens. Spread
 * rather than assigned so an unanswered question leaves the key off entirely
 * instead of setting it to `undefined`: `LeadRequestSchema.parse` accepts both,
 * but only the former round-trips to the same object it was given, which is
 * what the repository tests compare.
 */
function qualification(doc: PayloadLead) {
  return {
    ...(doc.projectType ? { projectType: doc.projectType } : {}),
    ...(doc.timeline ? { timeline: doc.timeline } : {}),
  };
}

/**
 * Payload/Postgres-backed mapper: the one flat `Leads` collection ->
 * the `LeadRequest` discriminated union, reconstructed from `doc.type`.
 * Every field the target variant requires but Payload only stores as
 * optional text (e.g. `message` on `contact`/`quote`, `issueDescription`
 * on `warranty`) is passed through as-is and left for `LeadRequestSchema
 * .parse()` at the end to reject loudly if a stored document is somehow
 * incomplete — that would mean the write path (Phase E's forms API)
 * failed to validate before saving, which is a bug to surface, not
 * paper over here.
 */
export function mapPayloadLeadToDomain(doc: PayloadLead): LeadRequest {
  const common = {
    id: LeadId.parse(String(doc.id)),
    status: doc.status as LeadStatus,
    locale: doc.locale as LeadSubmissionLocale,
    sourcePath: doc.sourcePath ?? undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };

  const mapped: LeadRequest = ((): LeadRequest => {
    switch (doc.type) {
      case "contact":
        return {
          ...common,
          type: "contact",
          name: doc.name,
          phone: doc.phone,
          email: doc.email ?? undefined,
          message: doc.message ?? "",
        };
      case "callback":
        return {
          ...common,
          type: "callback",
          name: doc.name,
          phone: doc.phone,
          preferredTime: doc.preferredTime ?? undefined,
        };
      case "quote":
        return {
          ...common,
          type: "quote",
          name: doc.name,
          phone: doc.phone,
          email: doc.email ?? undefined,
          productId: relationId(doc.productId)
            ? ProductId.parse(relationId(doc.productId) as string)
            : undefined,
          variantId: doc.variantSku
            ? VariantId.parse(doc.variantSku)
            : undefined,
          quantity: doc.quantity ?? undefined,
          message: doc.message ?? "",
          ...qualification(doc),
        };
      case "designer":
        return {
          ...common,
          type: "designer",
          name: doc.name,
          phone: doc.phone,
          email: doc.email ?? "",
          companyName: doc.companyName ?? undefined,
          portfolioUrl: doc.portfolioUrl ?? undefined,
          message: doc.message ?? undefined,
          ...qualification(doc),
        };
      case "warranty":
        return {
          ...common,
          type: "warranty",
          name: doc.name,
          phone: doc.phone,
          email: doc.email ?? undefined,
          orderNumber: doc.orderNumber ?? undefined,
          productId: relationId(doc.productId)
            ? ProductId.parse(relationId(doc.productId) as string)
            : undefined,
          issueDescription: doc.issueDescription ?? "",
          photoIds: relationIds(doc.photoIds).map((id) => MediaId.parse(id)),
        };
      case "sample":
        return {
          ...common,
          type: "sample",
          name: doc.name,
          phone: doc.phone,
          email: doc.email ?? undefined,
          address: doc.address ?? "",
          productIds: relationIds(doc.productIds).map((id) =>
            ProductId.parse(id),
          ),
          message: doc.message ?? undefined,
        };
    }
  })();

  return LeadRequestSchema.parse(mapped);
}

export function buildLeadData(input: NewLeadRequest) {
  const base = {
    type: input.type,
    status: input.status,
    locale: input.locale,
    sourcePath: input.sourcePath,
    name: input.name,
    phone: input.phone,
  };

  switch (input.type) {
    case "contact":
      return { ...base, email: input.email, message: input.message };
    case "callback":
      return { ...base, preferredTime: input.preferredTime };
    case "quote":
      return {
        ...base,
        email: input.email,
        productId: toPayloadRelationId(input.productId),
        variantSku: input.variantId,
        quantity: input.quantity,
        message: input.message,
        projectType: input.projectType,
        timeline: input.timeline,
      };
    case "designer":
      return {
        ...base,
        email: input.email,
        companyName: input.companyName,
        portfolioUrl: input.portfolioUrl,
        message: input.message,
        projectType: input.projectType,
        timeline: input.timeline,
      };
    case "warranty":
      return {
        ...base,
        email: input.email,
        orderNumber: input.orderNumber,
        productId: toPayloadRelationId(input.productId),
        issueDescription: input.issueDescription,
        photoIds: input.photoIds?.map((id) => Number(id)),
      };
    case "sample":
      return {
        ...base,
        email: input.email,
        address: input.address,
        productIds: input.productIds
          .map((id) => toPayloadRelationId(id))
          .filter((id): id is number => id !== undefined),
        // The only thing that survives the relationship-id drop above while
        // the catalogue is keyed by slug: which finishes the customer asked
        // for, in their own words. Same role `message` plays for `quote`.
        message: input.message,
      };
  }
}

export class PayloadLeadRepository implements LeadRepository {
  async findById(id: LeadId): Promise<LeadRequest | null> {
    const payload = await getPayloadClient();
    const doc = await payload.findByID({
      collection: "leads",
      id: Number(id),
      depth: 0,
      disableErrors: true,
      overrideAccess: true,
    });
    return doc ? mapPayloadLeadToDomain(doc as unknown as PayloadLead) : null;
  }

  async create(input: NewLeadRequest): Promise<LeadRequest> {
    const payload = await getPayloadClient();
    const created = await payload.create({
      collection: "leads",
      data: buildLeadData(input),
      overrideAccess: true,
    });
    return mapPayloadLeadToDomain(created as unknown as PayloadLead);
  }
}

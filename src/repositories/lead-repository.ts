import "server-only";
import type { LeadRequest } from "@/domain/leads/lead-request";
import type { LeadId } from "@/domain/shared/ids";

/**
 * `Omit` over a discriminated union collapses to the members' common
 * keys only (TS doesn't distribute a plain `Omit` across a union) —
 * this variant forces distribution so each `LeadRequest` member keeps
 * its own type-specific fields (`message`, `productId`, `address`, ...)
 * after stripping the generated audit fields.
 */
type DistributiveOmit<T, K extends keyof T> = T extends unknown
  ? Omit<T, K>
  : never;

export type NewLeadRequest = DistributiveOmit<
  LeadRequest,
  "id" | "createdAt" | "updatedAt"
>;

/**
 * `LeadRepository` (Prompt 8 §2.4/§12/§15.2, Phase B). Storefront forms
 * (Phase E) only ever `create` — a submitted lead is never edited by
 * the customer after the fact. Status triage (`new -> inProgress -> ...`)
 * happens through the `/admin` UI directly against the `Leads`
 * collection, not through this application-facing repository, so no
 * `updateStatus` is exposed here (unlike `OrderRepository`, which does
 * need one because the order service itself drives status transitions).
 */
export interface LeadRepository {
  findById(id: LeadId): Promise<LeadRequest | null>;
  create(input: NewLeadRequest): Promise<LeadRequest>;
}

let cachedRepository: LeadRepository | null = null;

export async function getLeadRepository(): Promise<LeadRepository> {
  if (cachedRepository) return cachedRepository;
  const { PayloadLeadRepository } = await import("./lead-repository.payload");
  cachedRepository = new PayloadLeadRepository();
  return cachedRepository;
}

/** Test-only escape hatch. */
export function __resetLeadRepositoryForTests(): void {
  cachedRepository = null;
}

// Top-level barrel for the Prompt 8 §2 domain model layer. Prefer
// importing from the specific domain area (`@/domain/catalog`,
// `@/domain/content`, `@/domain/ecommerce`, `@/domain/leads`,
// `@/domain/shared`, `@/domain/import`) where practical — this barrel exists mainly for
// call sites (e.g. the repository layer, Phase B) that need types
// spanning multiple domain areas at once.
export * from "./shared";
export * from "./catalog";
export * from "./content";
export * from "./ecommerce";
export * from "./leads";
export * from "./import";

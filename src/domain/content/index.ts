// `LocaleContent` and `SEOData` are listed under §2.2 "Контент" in the
// spec, but are defined once in `../shared` (see that folder's index)
// because both catalog and content entities need them — re-exported
// here so `import { LocaleContent, SEOData } from "@/domain/content"`
// still resolves, without a second definition existing anywhere.
export {
  LocaleContentSchema,
  resolveLocaleContent,
} from "../shared/locale-content";
export type { LocaleContent } from "../shared/locale-content";
export { SEODataSchema } from "../shared/seo";
export type { SEOData } from "../shared/seo";

export * from "./page";
export * from "./project";
export * from "./article";
export * from "./faq";
export * from "./stockist";
export * from "./resource";
export * from "./navigation";

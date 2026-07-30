import type { LocaleContent } from "@/domain/shared/locale-content";

/**
 * A Payload `localized: true` field's runtime shape when the query was
 * made with `locale: "all"` — every locale at once, as an object,
 * rather than the single active-locale string the generated
 * `payload-types.ts` assumes (Payload's type generator has no
 * `locale: "all"` mode, so the static types are always "wrong" for
 * this one query shape; this file is the single place that gap is
 * bridged, so no repository has to know about it directly).
 */
export type LocaleAllValue =
  | string
  | { en?: string | null; pl?: string | null; uk?: string | null }
  | null
  | undefined;

/** For a field the domain model requires (`LocaleContent.uk` is non-optional) — falls back to `fallback` (never to `undefined`) if `uk` came back empty, since Payload can't itself guarantee a legacy/incomplete document actually has `uk` populated. */
export function localeAllToLocaleContent(
  value: LocaleAllValue,
  fallback = "",
): LocaleContent {
  if (value && typeof value === "object") {
    return {
      uk: value.uk ?? fallback,
      en: value.en ?? undefined,
      pl: value.pl ?? undefined,
    };
  }
  return {
    uk: typeof value === "string" && value.length > 0 ? value : fallback,
  };
}

/** For a field the domain model treats as optional (e.g. `shortDescription`) — `undefined` in, `undefined` out, rather than manufacturing an empty-string `LocaleContent`. */
export function localeAllToOptionalLocaleContent(
  value: LocaleAllValue,
): LocaleContent | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "object" && !value.uk && !value.en && !value.pl)
    return undefined;
  return localeAllToLocaleContent(value);
}

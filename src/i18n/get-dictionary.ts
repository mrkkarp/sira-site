import "server-only";
import type { Locale } from "./config";

const dictionaries = {
  uk: () => import("./dictionaries/uk.json").then((m) => m.default),
  en: () => import("./dictionaries/en.json").then((m) => m.default),
  pl: () => import("./dictionaries/pl.json").then((m) => m.default),
} satisfies Record<Locale, () => Promise<Dictionary>>;

export type Dictionary = typeof import("./dictionaries/uk.json");

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}

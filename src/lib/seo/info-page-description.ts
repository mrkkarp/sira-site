import type { InfoPageContent } from "@/content/info-pages";

/** Max length of a generated meta description before it's truncated. Search
 * engines typically render ~150–160 chars; we cap a little under that and cut
 * on a word boundary so the snippet never ends mid-word. */
const MAX_LENGTH = 160;

/**
 * Derives a plain-text meta `description` for an INFO page from its own body
 * content — the first non-empty paragraph, truncated on a word boundary. This
 * keeps the description verbatim from the transcribed source (never invented)
 * while staying within a sensible snippet length.
 */
export function buildInfoPageDescription(content: InfoPageContent): string {
  const firstParagraph = content.sections
    .flatMap((section) => section.paragraphs)
    .find((paragraph) => paragraph.trim().length > 0);

  if (!firstParagraph) return "";

  const text = firstParagraph.trim();
  if (text.length <= MAX_LENGTH) return text;

  const truncated = text.slice(0, MAX_LENGTH);
  const lastSpace = truncated.lastIndexOf(" ");
  const clipped = lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
  return `${clipped.replace(/[.,;:–-]+$/, "").trim()}…`;
}

/**
 * Serialize a JSON-LD object for safe embedding inside
 * `<script type="application/ld+json" dangerouslySetInnerHTML>`.
 *
 * Prompt 9 §11 (security hardening): plain `JSON.stringify` does not escape
 * `<`, so a stray `</script>` in owner-supplied product/collection data would
 * break out of the script element. Escaping `<`, `>`, and `&` to their
 * `\uXXXX` forms keeps the payload valid JSON while making script-tag
 * breakout impossible, regardless of what the imported catalog contains.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

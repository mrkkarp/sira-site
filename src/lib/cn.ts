/** Joins truthy class-name fragments. No conflict resolution (no Tailwind
 * class ordering logic) — keep component default classes minimal enough
 * that callers rarely need to override the same property twice. */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Minimal `{placeholder}` interpolation for dictionary strings — this
 * project doesn't use a full ICU/i18n formatting library, so plural rules
 * aren't handled specially (the Ukrainian/Polish copy is deliberately
 * phrased to read naturally for any count, e.g. "Знайдено виробів: {count}"
 * rather than "{count} виробів знайдено").
 */
export function formatTemplate(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

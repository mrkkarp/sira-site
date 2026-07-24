import type { Dictionary } from "@/i18n/get-dictionary";

/**
 * Shared shell for routes that are architecturally wired up but not yet
 * designed/populated with content. Do not add ad-hoc layout per stub page —
 * extend this component instead once real content is ready.
 */
export function PlaceholderPage({
  title,
  dictionary,
}: {
  title: string;
  dictionary: Dictionary;
}) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-3xl flex-col items-start justify-center px-6 py-24">
      <p className="type-eyebrow text-text-muted">
        {dictionary.placeholder.title}
      </p>
      <h1 className="type-h1 text-text mt-3">{title}</h1>
      <p className="type-body text-text-muted mt-4">
        {dictionary.placeholder.body}
      </p>
    </div>
  );
}

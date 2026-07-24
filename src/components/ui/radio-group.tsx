export type RadioOption = { value: string; label: string };

export function RadioGroup({
  name,
  legend,
  options,
  value,
  onChange,
}: {
  name: string;
  legend: string;
  options: RadioOption[];
  value?: string;
  /** Optional — omit for an uncontrolled group (native `defaultChecked` via `options`). */
  onChange?: (value: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-(--space-2xs)">
      <legend className="type-label text-text mb-(--space-3xs)">
        {legend}
      </legend>
      {options.map((option) => {
        const id = `${name}-${option.value}`;
        return (
          <label
            key={option.value}
            htmlFor={id}
            className="type-body-sm text-text inline-flex items-center gap-(--space-2xs)"
          >
            <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
              <input
                id={id}
                type="radio"
                name={name}
                value={option.value}
                checked={onChange ? value === option.value : undefined}
                defaultChecked={onChange ? undefined : value === option.value}
                onChange={onChange ? () => onChange(option.value) : undefined}
                className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              <span
                aria-hidden="true"
                className="border-border-strong peer-checked:border-text pointer-events-none absolute inset-0 rounded-full border peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--color-focus)"
              />
              <span
                aria-hidden="true"
                className="bg-text pointer-events-none relative h-2 w-2 scale-0 rounded-full peer-checked:scale-100"
              />
            </span>
            {option.label}
          </label>
        );
      })}
    </fieldset>
  );
}

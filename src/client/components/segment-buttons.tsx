import { useId } from "react";

type Props<T extends string | number> = {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
};

/** One row of 2 to 5 choices. Active: primary fill. Inactive: surface-2. */
export function SegmentButtons<T extends string | number>({ label, options, value, onChange, disabled }: Props<T>) {
  const id = useId();
  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend id={id} className="mb-2 text-body font-medium">
        {label}
      </legend>
      <div className="flex gap-2" role="radiogroup" aria-labelledby={id}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={`focus-ring min-h-12 min-w-0 flex-1 rounded-chip px-1 text-small font-semibold transition-transform duration-100 enabled:active:scale-95 disabled:opacity-45 ${active ? "bg-primary text-white" : "bg-surface-2 text-text"}`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

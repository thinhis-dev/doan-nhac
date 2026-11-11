import { useId } from "react";
import { vi } from "../lib/strings-vi";

type Props = {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

/** A switch: a 52 by 32 px track with a visible "Bật" or "Tắt" label. */
export function Toggle({ label, hint, checked, onChange, disabled }: Props) {
  const id = useId();
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <label htmlFor={id} className="block text-body font-medium">
          {label}
        </label>
        {hint ? (
          <p id={`${id}-hint`} className="text-small text-text-muted">
            {hint}
          </p>
        ) : null}
      </div>
      <span className="text-small font-semibold text-text-muted" aria-hidden>
        {checked ? vi.common.on : vi.common.off}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={hint ? `${id}-hint` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="focus-ring relative flex h-12 w-[52px] shrink-0 items-center disabled:opacity-45"
      >
        <span
          className={`h-8 w-[52px] rounded-full border-2 transition-colors duration-100 ${checked ? "border-primary bg-primary" : "border-outline bg-surface-2"}`}
        />
        <span
          className={`absolute top-1/2 left-1 size-6 -translate-y-1/2 rounded-full bg-text transition-transform duration-200 ease-pop ${checked ? "translate-x-5" : ""}`}
        />
      </button>
    </div>
  );
}

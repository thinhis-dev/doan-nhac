import { Check } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
  small?: boolean;
};

/** A selectable chip: 40 px high inside a 48 px touch area. Selected: primary fill and a tick. */
export function Chip({ selected = false, onClick, disabled, children, small }: Props) {
  if (small) {
    return (
      <span className="inline-flex items-center rounded-chip bg-surface-2 px-2 py-0.5 text-small text-text-muted">
        {children}
      </span>
    );
  }
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className="focus-ring group inline-flex min-h-12 items-center rounded-chip disabled:opacity-45"
    >
      <span
        className={`inline-flex min-h-10 items-center gap-1.5 rounded-chip border-2 px-3 text-small font-semibold transition-transform duration-100 group-enabled:group-active:scale-95 ${selected ? "border-primary bg-primary text-white" : "border-outline bg-surface-2 text-text"}`}
      >
        {selected ? <Check size={20} strokeWidth={2.25} aria-hidden /> : null}
        {children}
      </span>
    </button>
  );
}

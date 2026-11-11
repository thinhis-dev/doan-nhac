import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "./spinner";

export type ButtonVariant = "cta" | "primary" | "ghost" | "danger";

const VARIANTS: Record<ButtonVariant, string> = {
  cta: "min-h-14 bg-cta text-ink shadow-button-cta enabled:active:translate-y-1 enabled:active:shadow-button-pressed-cta",
  primary:
    "min-h-[52px] bg-primary text-white shadow-button-primary enabled:active:translate-y-1 enabled:active:shadow-button-pressed-primary",
  ghost: "min-h-12 border-2 border-outline text-text enabled:active:bg-surface-2",
  danger: "min-h-12 border-2 border-danger text-danger enabled:active:bg-surface-2",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  icon?: LucideIcon;
  loading?: boolean;
  full?: boolean;
  children: ReactNode;
};

/**
 * The game button. States: default, pressed (moves down 4 px, edge shrinks),
 * focus-visible ring, disabled (45% opacity, no motion), loading (spinner
 * replaces the icon, label stays).
 */
export function GameButton({
  variant = "primary",
  icon: Icon,
  loading = false,
  full = false,
  disabled,
  className = "",
  children,
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`focus-ring inline-flex items-center justify-center gap-3 rounded-button px-5 py-2 font-display text-button font-bold transition-[transform,box-shadow] duration-100 ease-out select-none disabled:opacity-45 ${full ? "w-full" : ""} ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {loading ? <Spinner size={24} /> : Icon ? <Icon size={24} strokeWidth={2.25} aria-hidden /> : null}
      <span>{children}</span>
    </button>
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string };

/** An icon-only button with a Vietnamese aria-label and a 48 px touch area. */
export function IconButton({ icon: Icon, label, className = "", type = "button", ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`focus-ring inline-flex size-12 shrink-0 items-center justify-center rounded-chip text-text enabled:active:bg-surface-2 disabled:opacity-45 ${className}`}
      {...rest}
    >
      <Icon size={24} strokeWidth={2.25} aria-hidden />
    </button>
  );
}

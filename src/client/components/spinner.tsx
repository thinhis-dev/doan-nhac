import { LoaderCircle } from "lucide-react";

export function Spinner({ size = 24, label }: { size?: number; label?: string }) {
  return (
    <LoaderCircle
      size={size}
      strokeWidth={2.25}
      className="animate-spin shrink-0"
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "status" : undefined}
    />
  );
}

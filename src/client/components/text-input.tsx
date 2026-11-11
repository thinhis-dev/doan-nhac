import { forwardRef, type InputHTMLAttributes, useId } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label: string;
  help?: string;
  error?: string | null;
  hideLabel?: boolean;
};

/** A text field: visible label above, helper or error text below, 52 px high, 16 px text. */
export const TextInput = forwardRef<HTMLInputElement, Props>(function TextInput(
  { label, help, error, hideLabel, className = "", id: idProp, ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const noteId = `${id}-note`;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "text-body font-medium"}>
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={help || error ? noteId : undefined}
        className={`focus-ring min-h-[52px] w-full rounded-chip border-2 bg-surface-2 px-4 text-body text-text placeholder:text-text-muted disabled:opacity-45 ${error ? "border-danger" : "border-outline"}`}
        {...rest}
      />
      {error ? (
        <p id={noteId} className="text-small font-semibold text-danger" role="alert">
          {error}
        </p>
      ) : help ? (
        <p id={noteId} className="text-small text-text-muted">
          {help}
        </p>
      ) : null}
    </div>
  );
});

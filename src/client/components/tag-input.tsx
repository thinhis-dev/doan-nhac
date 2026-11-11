import { X } from "lucide-react";
import { type KeyboardEvent, useId, useMemo, useState } from "react";
import { normalizeText } from "../../shared/song";
import { vi } from "../lib/strings-vi";
import { Chip } from "./chip";

type Props = { label: string; values: string[]; suggestions: string[]; onChange: (v: string[]) => void };

const SUGGESTION_LIMIT = 12;

/** A list of values. Enter or a comma creates a value. Existing values are suggested as chips. */
export function TagInput({ label, values, suggestions, onChange }: Props) {
  const id = useId();
  const [text, setText] = useState("");
  const has = (v: string) => values.some((x) => normalizeText(x) === normalizeText(v));

  const add = (raw: string) => {
    const v = raw.trim();
    if (v && !has(v)) onChange([...values, v]);
    setText("");
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(text);
    } else if (e.key === "Backspace" && !text && values.length) {
      onChange(values.slice(0, -1));
    }
  };

  const shown = useMemo(() => {
    const q = normalizeText(text);
    return suggestions.filter((s) => !has(s) && (!q || normalizeText(s).includes(q))).slice(0, SUGGESTION_LIMIT);
    // biome-ignore lint/correctness/useExhaustiveDependencies: has depends on values
  }, [suggestions, text, values]);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-body font-medium">
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-2 rounded-chip border-2 border-outline bg-surface-2 p-2 focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-outline">
        {values.map((v) => (
          <span key={v} className="inline-flex min-h-10 items-center gap-1 rounded-chip bg-primary pl-3 text-small font-semibold text-white">
            {v}
            <button
              type="button"
              aria-label={vi.edit.removeTag(v)}
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="focus-ring inline-flex size-10 items-center justify-center rounded-chip"
            >
              <X size={20} strokeWidth={2.25} aria-hidden />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={text}
          onChange={(e) => {
            const v = e.target.value;
            if (v.endsWith(",")) add(v.slice(0, -1));
            else setText(v);
          }}
          onKeyDown={onKey}
          onBlur={() => text && add(text)}
          enterKeyHint="enter"
          aria-describedby={`${id}-hint`}
          className="min-h-10 min-w-24 flex-1 bg-transparent px-2 text-body text-text outline-none"
        />
      </div>
      <p id={`${id}-hint`} className="text-small text-text-muted">
        {vi.edit.tagHint}
      </p>
      {shown.length ? (
        <div className="flex flex-wrap gap-x-2">
          {shown.map((s) => (
            <Chip key={s} onClick={() => add(s)}>
              {s}
            </Chip>
          ))}
        </div>
      ) : null}
    </div>
  );
}

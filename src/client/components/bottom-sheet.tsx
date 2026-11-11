import { X } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
import { vi } from "../lib/strings-vi";
import { IconButton } from "./game-button";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** "dialog" layer for confirmations, "sheet" for forms. */
  layer?: "sheet" | "dialog";
};

/**
 * A modal built on the native <dialog>: it traps focus, closes on Escape and
 * returns focus to the trigger. It slides from the bottom on a phone and is
 * a centered dialog from 768 px.
 */
export function BottomSheet({ open, title, onClose, children, footer, layer = "sheet" }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnTo = useRef<Element | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnTo.current = document.activeElement;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
      if (returnTo.current instanceof HTMLElement) returnTo.current.focus();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={`${layer === "dialog" ? "z-dialog" : "z-sheet"} m-0 mt-auto max-h-[92dvh] w-full max-w-none animate-enter rounded-t-sheet bg-surface p-0 text-text backdrop:bg-scrim md:m-auto md:max-w-[520px] md:rounded-sheet`}
    >
      {open ? (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-center gap-2 px-4 pt-3 md:px-6">
            <h2 className="flex-1 font-display text-h2 font-bold">{title}</h2>
            <IconButton icon={X} label={vi.common.close} onClick={onClose} className="-mr-2" />
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4 md:px-6">{children}</div>
          {footer ? (
            <div className="flex flex-col gap-3 border-t-2 border-surface-2 px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] md:px-6">
              {footer}
            </div>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
}

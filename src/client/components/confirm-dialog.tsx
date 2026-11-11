import { vi } from "../lib/strings-vi";
import { BottomSheet } from "./bottom-sheet";
import { GameButton } from "./game-button";

type Props = {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** A destructive confirmation uses the danger style. */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({ open, title, body, confirmLabel, cancelLabel, danger = true, onConfirm, onCancel }: Props) {
  return (
    <BottomSheet
      open={open}
      title={title}
      onClose={onCancel}
      layer="dialog"
      footer={
        <>
          <GameButton variant="primary" full onClick={onCancel}>
            {cancelLabel ?? vi.common.cancel}
          </GameButton>
          <GameButton variant={danger ? "danger" : "ghost"} full onClick={onConfirm}>
            {confirmLabel}
          </GameButton>
        </>
      }
    >
      <p className="text-body text-text-muted">{body}</p>
    </BottomSheet>
  );
}

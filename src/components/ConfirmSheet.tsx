import { BottomSheet } from './BottomSheet';
import { Button } from './Button';

interface ConfirmSheetProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmation for destructive actions. */
export function ConfirmSheet({ open, title, message, confirmLabel, onConfirm, onCancel }: ConfirmSheetProps) {
  return (
    <BottomSheet open={open} onClose={onCancel} title={title}>
      {message && <p className="text-sm text-muted">{message}</p>}
      <div className="mt-5 flex flex-col gap-2">
        <Button variant="danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </BottomSheet>
  );
}

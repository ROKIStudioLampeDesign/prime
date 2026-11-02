import { useEffect, useEffectEvent, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useKeyboardInset } from './useKeyboardInset';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name; also shown as the sheet heading unless `header` is given. */
  title: string;
  header?: ReactNode;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, title, header, children }: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const keyboardInset = useKeyboardInset();
  // An effect event, so callers can pass inline closures without re-running the open effect
  // (which would steal focus from inputs inside the sheet on every render).
  const onEscape = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  });

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus({ preventScroll: true });
    document.addEventListener('keydown', onEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEscape);
      document.body.style.overflow = '';
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 motion-safe:animate-fade-in" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={{ bottom: keyboardInset }}
        className="absolute inset-x-0 mx-auto flex max-h-[90dvh] max-w-lg flex-col rounded-t-3xl bg-surface pb-safe outline-none motion-safe:animate-sheet-in"
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line" aria-hidden="true" />
        <div className="shrink-0 px-5 pt-3">
          {header ?? <h2 className="text-lg font-semibold">{title}</h2>}
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 pt-4 pb-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

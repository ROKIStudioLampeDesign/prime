import { useEffect, useEffectEvent, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useKeyboardInset } from './useKeyboardInset';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Marks every other child of <body> inert (unreachable by Tab, taps and screen readers); returns the undo. */
function inertSiblings(root: HTMLElement): () => void {
  const marked = [...document.body.children].filter(
    (el): el is HTMLElement => el instanceof HTMLElement && el !== root && !el.hasAttribute('inert'),
  );
  for (const el of marked) el.setAttribute('inert', '');
  return () => {
    for (const el of marked) el.removeAttribute('inert');
  };
}

/** Open sheets: page scroll stays locked until the last one closes (sheets can stack). */
let openSheets = 0;

function lockScroll(): () => void {
  openSheets++;
  document.body.style.overflow = 'hidden';
  return () => {
    openSheets--;
    if (openSheets === 0) document.body.style.overflow = '';
  };
}

/** Wraps Tab / Shift+Tab around the sheet's focusable elements. */
function trapFocus(e: KeyboardEvent, panel: HTMLElement) {
  const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!first || !last) {
    e.preventDefault();
    return;
  }
  const active = document.activeElement;
  if (e.shiftKey && (active === first || active === panel)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name; also shown as the sheet heading unless `header` is given. */
  title: string;
  header?: ReactNode;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, title, header, children }: BottomSheetProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const keyboardInset = useKeyboardInset();
  // An effect event, so callers can pass inline closures without re-running the open effect
  // (which would steal focus from inputs inside the sheet on every render).
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    // A sheet opened above this one made it inert: only the topmost sheet reacts.
    if (rootRef.current?.hasAttribute('inert')) return;
    if (e.key === 'Escape') onClose();
    else if (e.key === 'Tab' && panelRef.current) trapFocus(e, panelRef.current);
  });

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus({ preventScroll: true });
    const restoreSiblings = rootRef.current ? inertSiblings(rootRef.current) : () => {};
    document.addEventListener('keydown', onKeyDown);
    const unlockScroll = lockScroll();
    return () => {
      restoreSiblings();
      document.removeEventListener('keydown', onKeyDown);
      unlockScroll();
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div ref={rootRef} className="fixed inset-0 z-50">
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

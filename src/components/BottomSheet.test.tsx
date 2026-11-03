/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../test/utils';
import { BottomSheet } from './BottomSheet';
import { ConfirmSheet } from './ConfirmSheet';

function Harness({ onClose = () => {} }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Ouvrir
      </button>
      <BottomSheet
        open={open}
        title="Quantité"
        onClose={() => {
          onClose();
          setOpen(false);
        }}
      >
        <input aria-label="Grammes" />
      </BottomSheet>
    </>
  );
}

describe('BottomSheet', () => {
  it('renders nothing while closed', () => {
    render(<BottomSheet open={false} title="Quantité" onClose={() => {}} children="x" />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens as a labelled modal dialog and moves focus into it', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Ouvrir' }));
    const dialog = screen.getByRole('dialog', { name: 'Quantité' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('closes on Escape and gives focus back to the opener', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const opener = screen.getByRole('button', { name: 'Ouvrir' });
    await user.click(opener);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('locks page scroll while open', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Ouvrir' }));
    expect(document.body.style.overflow).toBe('hidden');
    await user.keyboard('{Escape}');
    expect(document.body.style.overflow).toBe('');
  });

  it('has no accessibility violations', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Ouvrir' }));
    expect(await axeViolations()).toEqual([]);
  });
});

describe('ConfirmSheet', () => {
  it('confirms or cancels', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmSheet
        open
        title="Supprimer ?"
        message="Action définitive."
        confirmLabel="Supprimer"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByRole('dialog', { name: 'Supprimer ?' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(onCancel).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'Supprimer' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});

describe('BottomSheet focus containment', () => {
  function Form() {
    const [open, setOpen] = useState(true);
    return (
      <>
        <main>
          <button type="button">Derrière</button>
        </main>
        <BottomSheet open={open} title="Portion" onClose={() => setOpen(false)}>
          <input aria-label="Grammes" />
          <button type="button">Ajouter</button>
        </BottomSheet>
      </>
    );
  }

  it('keeps Tab and Shift+Tab inside the sheet', async () => {
    const user = userEvent.setup();
    render(<Form />);
    const first = screen.getByLabelText('Grammes');
    const last = screen.getByRole('button', { name: 'Ajouter' });
    last.focus();
    await user.tab();
    expect(document.activeElement).toBe(first);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(last);
  });

  it('makes the page behind inert while open, and restores it on close', async () => {
    const user = userEvent.setup();
    render(<Form />);
    const behind = screen.getByRole('main', { hidden: true }).closest('div');
    expect(behind?.hasAttribute('inert')).toBe(true);
    await user.keyboard('{Escape}');
    expect(behind?.hasAttribute('inert')).toBe(false);
  });
});

describe('nested sheets (a confirmation over a sheet)', () => {
  function Nested() {
    const [outer, setOuter] = useState(true);
    const [confirm, setConfirm] = useState(false);
    return (
      <>
        <main>
          <button type="button">Derrière</button>
        </main>
        <BottomSheet open={outer} title="Produit" onClose={() => setOuter(false)}>
          <button type="button" onClick={() => setConfirm(true)}>
            Supprimer
          </button>
        </BottomSheet>
        <ConfirmSheet
          open={confirm}
          title="Supprimer ?"
          message="Action définitive."
          confirmLabel="Supprimer définitivement"
          onConfirm={() => setConfirm(false)}
          onCancel={() => setConfirm(false)}
        />
      </>
    );
  }

  it('only the top sheet reacts, and the page stays locked until the last one closes', async () => {
    const user = userEvent.setup();
    render(<Nested />);
    const outer = screen.getByRole('dialog', { name: 'Produit' });
    const outerRoot = outer.parentElement;
    await user.click(screen.getByRole('button', { name: 'Supprimer' }));
    expect(outerRoot?.hasAttribute('inert')).toBe(true);

    // Escape closes the confirmation only; the sheet below becomes usable again.
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Supprimer ?' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Produit' })).toBeTruthy();
    expect(outerRoot?.hasAttribute('inert')).toBe(false);
    expect(document.body.style.overflow).toBe('hidden');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('');
    expect(screen.getByRole('main').closest('div')?.hasAttribute('inert')).toBe(false);
  });
});

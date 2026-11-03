/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../test/utils';
import { NumericInput } from './NumericInput';
import { SegmentedControl } from './SegmentedControl';
import { TextField } from './TextField';

describe('TextField', () => {
  it('links its label, hint and error to the input', () => {
    const { rerender } = render(<TextField label="Poids" suffix="kg" hint="Entre 20 et 400" />);
    const input = screen.getByLabelText('Poids');
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(document.getElementById(input.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
      'Entre 20 et 400',
    );

    rerender(<TextField label="Poids" suffix="kg" error="Obligatoire" />);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById(input.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
      'Obligatoire',
    );
  });

  it('has no accessibility violations', async () => {
    render(<TextField label="Nom" error="Obligatoire" />);
    expect(await axeViolations()).toEqual([]);
  });
});

/** Mirrors real usage: the stored value comes back asynchronously, like useLiveQuery. */
function StoredNumber({ onCommit, integer }: { onCommit: (n: number) => void; integer?: boolean }) {
  const [value, setValue] = useState(0);
  return (
    <NumericInput
      aria-label="Valeur"
      integer={integer}
      value={value}
      onCommit={(n) => {
        onCommit(n);
        setTimeout(() => setValue(n), 0);
      }}
    />
  );
}

describe('NumericInput', () => {
  it('shows 0 as an empty field with a placeholder', () => {
    render(<NumericInput aria-label="Valeur" value={0} onCommit={() => {}} />);
    const input = screen.getByLabelText<HTMLInputElement>('Valeur');
    expect(input.value).toBe('');
    expect(input.placeholder).toBe('0');
  });

  it('keeps what is typed (e.g. a trailing comma) while committing valid numbers', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<StoredNumber onCommit={onCommit} />);
    const input = screen.getByLabelText<HTMLInputElement>('Valeur');
    await user.type(input, '62,');
    expect(input.value).toBe('62,');
    await user.type(input, '5');
    expect(input.value).toBe('62,5');
    expect(onCommit).toHaveBeenLastCalledWith(62.5);
  });

  it('never commits invalid or negative input', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<StoredNumber onCommit={onCommit} />);
    await user.type(screen.getByLabelText('Valeur'), 'abc');
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('rejects decimals in integer mode', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<StoredNumber onCommit={onCommit} integer />);
    await user.type(screen.getByLabelText('Valeur'), '8,5');
    expect(onCommit.mock.calls.map(([n]) => n)).toEqual([8, 8]); // "8", "8," → 8; "8,5" rejected
  });

  it('shows the stored value again once it loses focus', async () => {
    const user = userEvent.setup();
    render(
      <>
        <NumericInput aria-label="Valeur" value={61.25} onCommit={() => {}} />
        <button type="button">ailleurs</button>
      </>,
    );
    const input = screen.getByLabelText<HTMLInputElement>('Valeur');
    expect(input.value).toBe('61,25');
    await user.clear(input);
    await user.type(input, '7');
    await user.click(screen.getByRole('button', { name: 'ailleurs' }));
    expect(input.value).toBe('61,25');
  });
});

describe('SegmentedControl', () => {
  function Harness({ variant }: { variant?: 'segments' | 'tabs' }) {
    const [value, setValue] = useState<'front' | 'back'>('front');
    return (
      <SegmentedControl
        label="Vue"
        value={value}
        onChange={setValue}
        variant={variant}
        options={[
          { value: 'front', label: 'Face' },
          { value: 'back', label: 'Dos' },
        ]}
      />
    );
  }

  it('is a radio group reflecting and changing the selection', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByRole('radiogroup', { name: 'Vue' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Face', checked: true })).toBeTruthy();
    await user.click(screen.getByRole('radio', { name: 'Dos' }));
    expect(screen.getByRole('radio', { name: 'Dos', checked: true })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Face', checked: false })).toBeTruthy();
  });

  it('moves the selection with the arrow keys, as a native radio group', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    screen.getByRole('radio', { name: 'Face' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Dos', checked: true })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Dos' }));
  });

  it('has no accessibility violations', async () => {
    render(<Harness />);
    expect(await axeViolations()).toEqual([]);
  });

  it('keeps the radio semantics when drawn as tabs', async () => {
    const user = userEvent.setup();
    render(<Harness variant="tabs" />);
    await user.click(screen.getByRole('radio', { name: 'Dos' }));
    expect(screen.getByRole('radio', { name: 'Dos', checked: true })).toBeTruthy();
    expect(await axeViolations()).toEqual([]);
  });
});

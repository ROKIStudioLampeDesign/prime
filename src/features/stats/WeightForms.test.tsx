/** @vitest-environment jsdom */
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../db/db';
import type { LocalDate } from '../../domain/date';
import { renderWithRouter } from '../../test/utils';
import { QuickAdd } from './WeightForms';

const day = '2026-11-02' as LocalDate;

describe('QuickAdd', () => {
  afterEach(async () => {
    await db.bodyWeights.clear();
  });

  it('rejects implausible weights before saving', async () => {
    const user = userEvent.setup();
    renderWithRouter(<QuickAdd entries={[]} initialDate={day} />);
    await user.type(screen.getByLabelText('Poids'), '5');
    expect(screen.getByText('Entre 20 et 400 kg')).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Enregistrer' }).disabled).toBe(true);
  });

  it('says it replaces the existing weigh-in of that day, then saves it', async () => {
    const user = userEvent.setup();
    const existing = { id: 1, date: day, kg: 80, createdAt: 0, updatedAt: 0 };
    renderWithRouter(<QuickAdd entries={[existing]} initialDate={day} initialKg={80} />);
    expect(screen.getByText('Déjà 80 kg ce jour-là.')).toBeTruthy();
    const input = screen.getByLabelText('Poids');
    await user.clear(input);
    await user.type(input, '79,4');
    await user.click(screen.getByRole('button', { name: 'Remplacer la pesée du jour' }));
    expect(await screen.findByRole('button', { name: 'Enregistré ✓' })).toBeTruthy();
    expect((await db.bodyWeights.where('date').equals(day).first())?.kg).toBe(79.4);
  });

  it('follows the day change while the app stays open, so yesterday is never overwritten', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    try {
      vi.setSystemTime(new Date(2026, 10, 2, 23, 59, 50));
      const yesterday = { id: 1, date: day, kg: 80, createdAt: 0, updatedAt: 0 };
      renderWithRouter(<QuickAdd entries={[yesterday]} initialKg={80} />);
      expect(screen.getByLabelText<HTMLInputElement>('Date').value).toBe('2026-11-02');
      expect(screen.getByRole('button', { name: 'Remplacer la pesée du jour' })).toBeTruthy();
      act(() => {
        vi.advanceTimersByTime(15_000);
      });
      expect(screen.getByLabelText<HTMLInputElement>('Date').value).toBe('2026-11-03');
      expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });
});

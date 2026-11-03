/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Food } from '../../db/db';
import { axeViolations } from '../../test/utils';
import { IngredientItem } from './MealParts';

const skyr: Food = {
  id: 1,
  name: 'Skyr',
  nameNormalized: 'skyr',
  per100g: { kcal: 63, protein: 11, carbs: 4, fat: 0.2 },
  favorite: 0,
  createdAt: 0,
  updatedAt: 0,
};

function renderItem(food: Food | undefined, overrides: Partial<Parameters<typeof IngredientItem>[0]> = {}) {
  const props = {
    gramsText: '150',
    food,
    grams: 150,
    invalid: false,
    isFirst: true,
    isLast: false,
    onGramsChange: vi.fn(),
    onMove: vi.fn(),
    onRemove: vi.fn(),
    ...overrides,
  };
  render(
    <ul>
      <IngredientItem {...props} />
    </ul>,
  );
  return props;
}

describe('IngredientItem', () => {
  it('shows the ingredient energy and edits its grams', async () => {
    const user = userEvent.setup();
    const props = renderItem(skyr);
    expect(screen.getByText('95 kcal')).toBeTruthy();
    // Focus selects the current value, so typing replaces it (quick edits on the phone).
    await user.type(screen.getByLabelText('Quantité de Skyr en grammes'), '5');
    expect(props.onGramsChange).toHaveBeenLastCalledWith('5');
  });

  it('flags a deleted product and says it is left out of the totals', () => {
    renderItem(undefined);
    expect(screen.getByText('Produit supprimé')).toBeTruthy();
    expect(screen.getByText('Non compté dans les totaux')).toBeTruthy();
  });

  it('disables moves past the ends and reports the others', async () => {
    const user = userEvent.setup();
    const props = renderItem(skyr);
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Monter Skyr' }).disabled).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Descendre Skyr' }));
    expect(props.onMove).toHaveBeenCalledWith(1);
    await user.click(screen.getByRole('button', { name: 'Retirer Skyr' }));
    expect(props.onRemove).toHaveBeenCalledOnce();
  });

  it('marks invalid grams and has no accessibility violations', async () => {
    renderItem(skyr, { invalid: true, gramsText: 'x', grams: NaN });
    expect(screen.getByLabelText('Quantité de Skyr en grammes').getAttribute('aria-invalid')).toBe('true');
    expect(await axeViolations()).toEqual([]);
  });
});

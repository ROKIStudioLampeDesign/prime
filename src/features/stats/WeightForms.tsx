import { useState, type FormEvent } from 'react';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { useToday } from '../../components/useToday';
import { setTargetWeight, upsertBodyWeight } from '../../db/bodyWeights';
import type { BodyWeightEntry } from '../../db/db';
import { parseBodyWeight } from '../../domain/bodyWeight';
import { isLocalDate, type LocalDate } from '../../domain/date';
import { formatWeight } from '../../lib/format';
import { kg } from './labels';

interface QuickAddProps {
  entries: BodyWeightEntry[];
  initialDate: LocalDate;
  initialKg?: number;
}

/** Date (today by default) + weight prefilled with the last value; saving replaces that day's value. */
export function QuickAdd({ entries, initialDate, initialKg }: QuickAddProps) {
  const today = useToday();
  const [date, setDate] = useState<LocalDate>(initialDate);
  const [text, setText] = useState(initialKg !== undefined ? formatWeight(initialKg) : '');
  const [saved, setSaved] = useState(false);
  const value = parseBodyWeight(text);
  const existing = entries.find((e) => e.date === date);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (value === undefined) return;
    await upsertBodyWeight(date, value);
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-surface p-3" aria-label="Ajouter une pesée">
      <div className="grid grid-cols-[1fr_7rem] gap-2">
        <TextField
          label="Date"
          type="date"
          max={today}
          value={date}
          onChange={(e) => {
            if (isLocalDate(e.target.value)) setDate(e.target.value);
            setSaved(false);
          }}
        />
        <TextField
          label="Poids"
          suffix="kg"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="done"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSaved(false);
          }}
          onFocus={(e) => e.currentTarget.select()}
          error={text.trim() !== '' && value === undefined ? 'Entre 20 et 400 kg' : undefined}
        />
      </div>
      <Button type="submit" className="mt-3 w-full" disabled={value === undefined}>
        {saved ? 'Enregistré ✓' : existing ? 'Remplacer la pesée du jour' : 'Enregistrer'}
      </Button>
      {existing && !saved && (
        <p className="mt-1.5 text-center text-xs text-muted">Déjà {kg(existing.kg)} ce jour-là.</p>
      )}
    </form>
  );
}

export function TargetSheet({
  open,
  target,
  onClose,
}: {
  open: boolean;
  target?: number;
  onClose: () => void;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Poids cible">
      {open && <TargetForm target={target} onClose={onClose} />}
    </BottomSheet>
  );
}

function TargetForm({ target, onClose }: { target?: number; onClose: () => void }) {
  const [text, setText] = useState(target !== undefined ? formatWeight(target) : '');
  const value = parseBodyWeight(text);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (value === undefined) return;
        await setTargetWeight(value);
        onClose();
      }}
    >
      <p className="mb-3 text-sm text-muted">Affiché en pointillés sur la courbe.</p>
      <TextField
        label="Poids cible"
        suffix="kg"
        inputMode="decimal"
        autoComplete="off"
        value={text}
        onChange={(e) => setText(e.target.value)}
        error={text.trim() !== '' && value === undefined ? 'Entre 20 et 400 kg' : undefined}
      />
      <Button type="submit" className="mt-4 w-full" disabled={value === undefined}>
        Enregistrer
      </Button>
      {target !== undefined && (
        <Button
          variant="danger"
          className="mt-2 w-full"
          onClick={async () => {
            await setTargetWeight(undefined);
            onClose();
          }}
        >
          Retirer la cible
        </Button>
      )}
    </form>
  );
}

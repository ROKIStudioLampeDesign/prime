import { useLiveQuery } from 'dexie-react-hooks';
import { useToday } from '../../components/useToday';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { EmptyState } from '../../components/EmptyState';
import { Fab } from '../../components/Fab';
import { PlusIcon } from '../../components/icons';
import { Loading } from '../../components/Loading';
import { Screen } from '../../components/Screen';
import type { LogEntry } from '../../db/db';
import { getGoals } from '../../db/goals';
import { deleteEntry, listEntriesForDate, updateEntry } from '../../db/logEntries';
import { MEAL_SLOTS, roundTo, sumMacros, type MealSlot } from '../../domain/nutrition';
import { formatGrams, formatMacro } from '../../lib/format';
import { DailySummary } from './DailySummary';
import { DateNavigator } from './DateNavigator';
import { SLOT_LABELS } from './labels';
import { NutritionTabs } from './NutritionTabs';
import { addEntryPath, useDiaryDate } from './params';
import { portionsLabel } from './pickerItems';
import { PortionSheet, type PortionTarget } from './PortionSheet';
import { MealBadge } from './ProductPicker';

export function DiaryScreen() {
  const [date, setDate] = useDiaryDate();
  const entries = useLiveQuery(() => listEntriesForDate(date), [date]);
  const goals = useLiveQuery(getGoals);
  const [editingId, setEditingId] = useState<number>();
  const closeEditor = () => setEditingId(undefined);

  const editing = entries?.find((e) => e.id === editingId);
  const totals = useMemo(() => sumMacros((entries ?? []).map((e) => e.macros)), [entries]);
  const today = useToday();
  const isToday = date === today;

  return (
    <Screen
      title="Alimentation"
      actions={
        !isToday && (
          <button
            type="button"
            className="min-h-11 px-3 text-sm font-extrabold text-accent active:bg-surface"
            onClick={() => setDate(today)}
          >
            Aujourd’hui
          </button>
        )
      }
    >
      <NutritionTabs />
      <DateNavigator date={date} onChange={setDate} />

      {entries === undefined || goals === undefined ? (
        <Loading />
      ) : (
        <>
          <DailySummary totals={totals} goals={goals} />
          {entries.length === 0 ? (
            <EmptyState
              title="Rien de noté ce jour-là"
              description="Ajoute ce que tu as mangé pour suivre tes calories et tes macros."
              action={
                <Link
                  to={addEntryPath(date)}
                  className="flex min-h-12 items-center bg-accent-fill px-5 font-black text-accent-fg"
                >
                  Ajouter un aliment
                </Link>
              }
            />
          ) : (
            MEAL_SLOTS.map((slot) => (
              <SlotSection
                key={slot}
                slot={slot}
                entries={entries.filter((e) => e.slot === slot)}
                addTo={addEntryPath(date, slot)}
                onSelect={setEditingId}
              />
            ))
          )}
          {/* Keeps the last entry clear of the floating button. */}
          <div className="h-16" />
        </>
      )}

      {/* The empty state has its own call to action; the FAB would overlap it. */}
      {entries !== undefined && entries.length > 0 && (
        <Fab to={addEntryPath(date)} label="Ajouter un aliment" />
      )}

      <PortionSheet
        target={editing && entryTarget(editing)}
        formKey={String(editingId)}
        initial={
          editing?.kind === 'meal' && editing.portions !== undefined
            ? { portions: editing.portions }
            : { grams: editing?.grams ?? 0 }
        }
        initialSlot={editing?.slot ?? 'snack'}
        submitLabel="Enregistrer"
        onSubmit={async ({ grams, portions, slot }) => {
          if (editingId === undefined) return;
          await updateEntry(editingId, portions !== undefined ? { portions, slot } : { grams, slot });
          closeEditor();
        }}
        onDelete={async () => {
          if (editingId === undefined) return;
          await deleteEntry(editingId);
          closeEditor();
        }}
        onClose={closeEditor}
      />
    </Screen>
  );
}

/** Edit sheet target, built only from the entry's snapshot (the food or meal may be gone). */
function entryTarget(entry: LogEntry): PortionTarget {
  if (entry.kind === 'food') return { name: entry.name, brand: entry.brand, per100g: entry.per100g };
  return {
    name: entry.name,
    subtitle: `Plat · 1 portion = ${formatGrams(roundTo(entry.portionGrams, 0))} g`,
    per100g: entry.per100g,
    portionGrams: entry.portionGrams,
  };
}

interface SlotSectionProps {
  slot: MealSlot;
  entries: LogEntry[];
  addTo: string;
  onSelect: (id: number) => void;
}

function SlotSection({ slot, entries, addTo, onSelect }: SlotSectionProps) {
  if (entries.length === 0) return null;
  const subtotal = sumMacros(entries.map((e) => e.macros));

  return (
    <section className="mt-6" aria-labelledby={`slot-${slot}`}>
      <div className="flex items-center gap-2">
        <h2 id={`slot-${slot}`} className="flex-1 text-[1.375rem] leading-tight headline">
          {SLOT_LABELS[slot]}
        </h2>
        <span className="text-[15px] font-bold text-muted tabular-nums">
          {formatMacro('kcal', subtotal.kcal)} kcal
        </span>
        <Link
          to={addTo}
          aria-label={`Ajouter un aliment : ${SLOT_LABELS[slot]}`}
          className="flex size-11 shrink-0 items-center justify-center border-2 border-fg active:bg-surface"
        >
          <PlusIcon className="size-5" strokeWidth={2.6} />
        </Link>
      </div>
      <ul className="mt-1 divide-y divide-line border-b border-line">
        {entries.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => onSelect(entry.id)}
              className="flex min-h-15 w-full items-center gap-3 py-2.5 text-left active:opacity-60"
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5">
                  <span className="truncate font-bold">{entry.name}</span>
                  {entry.kind === 'meal' && <MealBadge />}
                </p>
                <p className="truncate text-[13px] font-medium text-muted tabular-nums">
                  {entry.kind === 'meal' &&
                    entry.portions !== undefined &&
                    `${portionsLabel(entry.portions)} · `}
                  {formatGrams(roundTo(entry.grams, 0))} g · P {formatMacro('protein', entry.macros.protein)}{' '}
                  · G {formatMacro('carbs', entry.macros.carbs)} · L {formatMacro('fat', entry.macros.fat)}
                </p>
              </div>
              <span className="shrink-0 text-xl headline tabular-nums">
                {formatMacro('kcal', entry.macros.kcal)}
                <span className="text-xs font-bold text-muted"> kcal</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

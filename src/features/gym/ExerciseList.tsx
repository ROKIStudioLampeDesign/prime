import { useDeferredValue, useMemo, useState } from 'react';
import type { Exercise } from '../../db/db';
import { EQUIPMENT_LABELS } from '../../domain/exercise';
import { MUSCLE_IDS, MUSCLES, type MuscleId } from '../../domain/muscles';
import { matchesQuery } from '../../domain/search';
import { SearchField } from '../../components/SearchField';
import { musclesLabel } from './exerciseData';
import { CustomBadge } from './shared';

interface ExerciseListProps {
  exercises: readonly Exercise[];
  onSelect: (exercise: Exercise) => void;
  /** Shown but not selectable (e.g. already in the workout). */
  disabledIds?: ReadonlySet<number>;
  disabledHint?: string;
}

const collator = new Intl.Collator('fr', { sensitivity: 'base' });

/** Searchable exercise list with a muscle filter; muscles trained as primary rank first. */
export function ExerciseList({ exercises, onSelect, disabledIds, disabledHint }: ExerciseListProps) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [muscle, setMuscle] = useState<MuscleId>();

  const filtered = useMemo(() => {
    const list = exercises.filter(
      (e) =>
        (!deferredQuery.trim() || matchesQuery(e.nameNormalized, deferredQuery)) &&
        (!muscle || e.primaryMuscles.includes(muscle) || e.secondaryMuscles.includes(muscle)),
    );
    return list.sort((a, b) => {
      if (muscle) {
        const pa = a.primaryMuscles.includes(muscle) ? 0 : 1;
        const pb = b.primaryMuscles.includes(muscle) ? 0 : 1;
        if (pa !== pb) return pa - pb;
      }
      return collator.compare(a.name, b.name);
    });
  }, [exercises, deferredQuery, muscle]);

  return (
    <>
      <SearchField value={query} onChange={setQuery} placeholder="Rechercher un exercice" />
      {/* Horizontal chip row; it scrolls inside its own box, never the page. */}
      <div className="-mx-4 mt-3 [scrollbar-width:none] overflow-x-auto px-4 pb-1">
        <div className="flex w-max gap-2" role="group" aria-label="Filtrer par muscle">
          <FilterChip active={!muscle} onClick={() => setMuscle(undefined)}>
            Tous
          </FilterChip>
          {MUSCLE_IDS.map((m) => (
            <FilterChip key={m} active={muscle === m} onClick={() => setMuscle(muscle === m ? undefined : m)}>
              {MUSCLES[m].label}
            </FilterChip>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="mt-6 text-center text-sm font-semibold text-muted">Aucun exercice ne correspond.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line border-b border-line">
          {filtered.map((e) => {
            const disabled = disabledIds?.has(e.id) ?? false;
            return (
              <li className="list-row" key={e.id}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelect(e)}
                  className="flex min-h-15 w-full items-center gap-3 py-2 text-left active:opacity-60 disabled:opacity-40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5">
                      <span className="truncate text-[17px] leading-tight headline">{e.name}</span>
                      {e.isCustom === 1 && <CustomBadge />}
                    </p>
                    <p className="mt-0.5 truncate text-[13px] font-semibold text-muted">
                      {musclesLabel(e.primaryMuscles)}
                      {e.equipment && ` · ${EQUIPMENT_LABELS[e.equipment]}`}
                    </p>
                  </div>
                  {disabled && disabledHint && (
                    <span className="shrink-0 text-xs font-bold text-muted">{disabledHint}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-11 border-2 px-3.5 text-sm whitespace-nowrap ${
        active
          ? 'border-gym bg-gym font-black text-on-gym'
          : 'border-fg font-extrabold text-fg active:bg-surface'
      }`}
    >
      {children}
    </button>
  );
}

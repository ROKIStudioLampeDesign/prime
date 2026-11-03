import {
  MUSCLE_GROUP_LABELS,
  MUSCLES,
  musclesInGroup,
  type MuscleGroup,
  type MuscleId,
} from '../../domain/muscles';

interface MusclePickerProps {
  primary: readonly MuscleId[];
  secondary: readonly MuscleId[];
  onChange: (primary: MuscleId[], secondary: MuscleId[]) => void;
  disabled?: boolean;
}

const GROUPS: MuscleGroup[] = ['upper', 'core', 'lower'];

/** Tap cycles a muscle: none → principal → secondaire → none. */
export function MusclePicker({ primary, secondary, onChange, disabled }: MusclePickerProps) {
  function cycle(m: MuscleId) {
    if (primary.includes(m)) {
      onChange(
        primary.filter((x) => x !== m),
        [...secondary, m],
      );
    } else if (secondary.includes(m)) {
      onChange(
        [...primary],
        secondary.filter((x) => x !== m),
      );
    } else {
      onChange([...primary, m], [...secondary]);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-full border border-accent bg-accent-fill" /> Principal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-full border border-accent bg-accent/15" /> Secondaire
        </span>
        <span>Touche un muscle pour changer son rôle.</span>
      </p>
      {GROUPS.map((group) => (
        <fieldset key={group} disabled={disabled}>
          <legend className="mb-1.5 text-sm font-semibold text-muted">{MUSCLE_GROUP_LABELS[group]}</legend>
          <div className="flex flex-wrap gap-2">
            {musclesInGroup(group).map((m) => {
              const role = primary.includes(m) ? 'primary' : secondary.includes(m) ? 'secondary' : 'none';
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => cycle(m)}
                  aria-label={`${MUSCLES[m].label} : ${role === 'primary' ? 'principal' : role === 'secondary' ? 'secondaire' : 'non sollicité'}`}
                  className={`min-h-11 rounded-full border px-3.5 text-sm font-semibold disabled:opacity-60 ${
                    role === 'primary'
                      ? 'border-accent bg-accent-fill text-accent-fg'
                      : role === 'secondary'
                        ? 'border-accent bg-accent/15 text-fg'
                        : 'border-line bg-surface text-muted'
                  }`}
                >
                  {MUSCLES[m].label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

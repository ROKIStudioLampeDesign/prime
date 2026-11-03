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
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-3 bg-gym" /> Principal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 border-2 border-gym bg-gym/18" /> Secondaire
        </span>
        <span>Touche un muscle pour changer son rôle.</span>
      </p>
      {GROUPS.map((group) => (
        <fieldset key={group} disabled={disabled}>
          <legend className="mb-1.5 text-sm font-extrabold">{MUSCLE_GROUP_LABELS[group]}</legend>
          <div className="flex flex-wrap gap-2">
            {musclesInGroup(group).map((m) => {
              const role = primary.includes(m) ? 'primary' : secondary.includes(m) ? 'secondary' : 'none';
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => cycle(m)}
                  aria-label={`${MUSCLES[m].label} : ${role === 'primary' ? 'principal' : role === 'secondary' ? 'secondaire' : 'non sollicité'}`}
                  className={`min-h-11 border-2 px-3.5 text-sm disabled:opacity-60 ${
                    role === 'primary'
                      ? 'border-gym bg-gym font-black text-on-gym'
                      : role === 'secondary'
                        ? 'border-gym bg-gym/18 font-extrabold text-fg'
                        : 'border-line font-bold text-muted'
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

import { BackIcon, ForwardIcon } from '../../components/icons';
import { useToday } from '../../components/useToday';
import { headerButton } from '../../components/Screen';
import { addDays, isLocalDate, type LocalDate } from '../../domain/date';
import { formatDayLabel } from './labels';

interface DateNavigatorProps {
  date: LocalDate;
  onChange: (date: LocalDate) => void;
}

export function DateNavigator({ date, onChange }: DateNavigatorProps) {
  const label = formatDayLabel(date, useToday());

  return (
    <div className="mb-4 flex items-center gap-2">
      <button
        type="button"
        aria-label="Jour précédent"
        className={headerButton}
        onClick={() => onChange(addDays(date, -1))}
      >
        <BackIcon />
      </button>
      {/* A transparent native date input over the label: tapping it opens the iOS date wheel. */}
      <label className="relative flex min-h-11 flex-1 items-center justify-center text-lg headline active:bg-surface">
        {label}
        <input
          type="date"
          aria-label="Choisir une date"
          value={date}
          onChange={(e) => {
            if (isLocalDate(e.target.value)) onChange(e.target.value);
          }}
          onClick={(e) => {
            try {
              e.currentTarget.showPicker();
            } catch {
              // Unsupported or not allowed: the native tap behaviour still opens the picker.
            }
          }}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </label>
      <button
        type="button"
        aria-label="Jour suivant"
        className={headerButton}
        onClick={() => onChange(addDays(date, 1))}
      >
        <ForwardIcon />
      </button>
    </div>
  );
}

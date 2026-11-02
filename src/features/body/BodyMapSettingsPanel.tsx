import { useId } from 'react';
import type { BodyMapSettings } from '../../db/bodyMap';

interface Props {
  settings: BodyMapSettings;
  onChange: (settings: BodyMapSettings) => void;
}

const MAX_GREEN = 29;
const MAX_RED = 60;

/**
 * Thresholds and secondary-muscle toggle. Moving one slider past the other pushes it along, so
 * green < red always holds.
 */
export function BodyMapSettingsPanel({ settings, onChange }: Props) {
  return (
    <section className="rounded-2xl bg-surface p-4" aria-labelledby="map-settings">
      <h2 id="map-settings" className="font-semibold">
        Réglages de la carte
      </h2>
      <Slider
        label="Vert jusqu’à"
        value={settings.greenDays}
        min={0}
        max={MAX_GREEN}
        onChange={(greenDays) =>
          onChange({ ...settings, greenDays, redDays: Math.max(settings.redDays, greenDays + 1) })
        }
      />
      <Slider
        label="Rouge à partir de"
        value={settings.redDays}
        min={1}
        max={MAX_RED}
        onChange={(redDays) =>
          onChange({ ...settings, redDays, greenDays: Math.min(settings.greenDays, redDays - 1) })
        }
      />
      <label className="mt-4 flex min-h-11 items-center justify-between gap-3">
        <span>
          <span className="block">Compter les muscles secondaires</span>
          <span className="block text-xs text-muted">Ex. : les triceps au développé couché</span>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={settings.countSecondary}
          onChange={(e) => onChange({ ...settings, countSecondary: e.target.checked })}
          className="size-6 shrink-0 accent-(--color-accent)"
        />
      </label>
    </section>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm text-muted">
          {label}
        </label>
        <span className="text-sm font-semibold tabular-nums">
          {value} jour{value > 1 ? 's' : ''}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-11 w-full accent-(--color-accent)"
      />
    </div>
  );
}

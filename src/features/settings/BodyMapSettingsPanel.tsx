import { useId } from 'react';
import type { BodyMapSettings } from '../../db/bodyMap';

interface Props {
  settings: BodyMapSettings;
  onChange: (settings: BodyMapSettings) => void;
}

const MAX_FRESH = 29;
const MAX_STALE = 60;

/**
 * Thresholds and secondary-muscle toggle. Moving one slider past the other pushes it along, so
 * fresh < stale always holds.
 */
export function BodyMapSettingsPanel({ settings, onChange }: Props) {
  return (
    <section className="mt-6 border-b border-line pb-4" aria-labelledby="map-settings">
      <h2 id="map-settings" className="text-[1.375rem] leading-tight headline">
        Carte du corps
      </h2>
      <p className="mt-0.5 text-sm text-muted">Couleur des muscles selon leur dernier entraînement.</p>
      <Slider
        label="Rouge jusqu’à"
        value={settings.freshDays}
        min={0}
        max={MAX_FRESH}
        onChange={(freshDays) =>
          onChange({ ...settings, freshDays, staleDays: Math.max(settings.staleDays, freshDays + 1) })
        }
      />
      <Slider
        label="Vert à partir de"
        value={settings.staleDays}
        min={1}
        max={MAX_STALE}
        onChange={(staleDays) =>
          onChange({ ...settings, staleDays, freshDays: Math.min(settings.freshDays, staleDays - 1) })
        }
      />
      <label className="mt-4 flex min-h-11 items-center justify-between gap-3">
        <span>
          <span className="block">Compter les muscles secondaires</span>
          <span className="block text-xs text-muted">
            Ex. : les triceps au bench. Ils comptent moitié moins qu’un muscle principal.
          </span>
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

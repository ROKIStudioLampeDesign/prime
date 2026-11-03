import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { hasUserData } from '../../db/backup';
import { getSetting, setSetting } from '../../db/settings';
import { backupReminderDue, daysSinceBackup } from '../../domain/backup';

const SNOOZE_DAYS = 3;

/** Gentle banner after 14 days without export: data only lives on this phone. */
export function BackupReminder() {
  const state = useLiveQuery(async () => ({
    lastExportAt: await getSetting<number>('lastExportAt'),
    firstLaunchAt: await getSetting<number>('firstLaunchAt'),
    snoozedUntil: await getSetting<number>('backupReminderSnoozedUntil'),
    hasData: await hasUserData(),
    // Taken here, not during render: re-evaluated whenever the underlying data changes.
    now: Date.now(),
  }));
  if (!state || !backupReminderDue(state)) return null;
  const days = daysSinceBackup(state.lastExportAt, state.now);

  return (
    <aside className="mb-4 rounded-2xl border border-line bg-surface p-4" aria-label="Rappel de sauvegarde">
      <p className="font-semibold">Pense à sauvegarder tes données</p>
      <p className="mt-0.5 text-sm text-muted">
        {days === undefined
          ? 'Tu n’as encore jamais fait de sauvegarde.'
          : `Dernière sauvegarde il y a ${days} jours.`}{' '}
        Tout est stocké uniquement sur ce téléphone.
      </p>
      <div className="mt-3 flex gap-2">
        <Link
          to="/settings#donnees"
          className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-accent-fill px-4 text-sm font-semibold text-accent-fg"
        >
          Sauvegarder
        </Link>
        <button
          type="button"
          onClick={() => void setSetting('backupReminderSnoozedUntil', Date.now() + SNOOZE_DAYS * 86_400_000)}
          className="min-h-11 rounded-xl px-4 text-sm font-semibold text-muted active:bg-surface-2"
        >
          Plus tard
        </button>
      </div>
    </aside>
  );
}

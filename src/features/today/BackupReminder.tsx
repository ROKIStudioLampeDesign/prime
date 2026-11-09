import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { hasUserData } from '../../db/backup';
import { getSetting, setSetting } from '../../db/settings';
import { backupReminderDue, daysSinceBackup } from '../../domain/backup';
import { shareBackup } from '../../lib/shareBackup';

const SNOOZE_DAYS = 2;

/**
 * Weekly band above the day: data only lives on this phone. "Sauvegarder" opens the share sheet
 * right away (Fichiers, Mail…), so a backup is one tap away.
 */
export function BackupReminder() {
  const state = useLiveQuery(async () => ({
    lastExportAt: await getSetting<number>('lastExportAt'),
    firstLaunchAt: await getSetting<number>('firstLaunchAt'),
    snoozedUntil: await getSetting<number>('backupReminderSnoozedUntil'),
    hasData: await hasUserData(),
    // Taken here, not during render: re-evaluated whenever the underlying data changes.
    now: Date.now(),
  }));
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!state || !backupReminderDue(state)) return null;
  const days = daysSinceBackup(state.lastExportAt, state.now);

  async function save() {
    setBusy(true);
    setFailed(false);
    try {
      await shareBackup();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside
      aria-label="Rappel de sauvegarde"
      className="bleed shrink-0 border-b border-line bg-surface py-2.5"
    >
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] leading-tight font-extrabold">Sauvegarde</p>
          <p className="truncate text-[13px] font-medium text-muted">
            {days === undefined ? 'Jamais faite' : `Il y a ${days} jours`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void setSetting('backupReminderSnoozedUntil', Date.now() + SNOOZE_DAYS * 86_400_000)}
          className="min-h-11 shrink-0 px-2 text-sm font-bold text-muted active:bg-surface-2"
        >
          Plus tard
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="flex min-h-11 shrink-0 items-center justify-center bg-accent-fill px-3 text-sm font-black text-accent-fg focus-inset active:opacity-80 disabled:opacity-60"
        >
          Sauvegarder
        </button>
      </div>
      {failed && (
        <p role="alert" className="mt-1 text-sm font-semibold text-danger">
          La sauvegarde a échoué. Réessaie, ou passe par Réglages.
        </p>
      )}
    </aside>
  );
}

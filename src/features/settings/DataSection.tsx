import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRef, useState, type ChangeEvent } from 'react';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import {
  getLastExportAt,
  importBackup,
  readBackup,
  type BackupError,
  type BackupFile,
  type ImportMode,
} from '../../db/backup';
import { db } from '../../db/db';
import { shareBackup } from '../../lib/shareBackup';
import { backupCounts, BACKUP_REMINDER_DAYS, daysSinceBackup } from '../../domain/backup';

const TABLE_LABELS: Record<string, string> = {
  foods: 'Produits',
  meals: 'Plats',
  logEntries: 'Entrées du journal',
  goals: 'Objectifs',
  bodyWeights: 'Pesées',
  workouts: 'Séances',
  workoutSets: 'Séries',
  exercises: 'Exercices',
  templates: 'Modèles',
  gymDays: 'Jours de salle',
  nutritionDays: 'Jours non comptés',
  settings: 'Réglages',
};

const IMPORT_ERRORS: Record<Exclude<BackupError, 'invalidRows'>, string> = {
  notJson: 'Ce fichier n’est pas un fichier JSON valide.',
  notPrime: 'Ce fichier n’est pas une sauvegarde Prime.',
  unsupportedFormat: 'Format de sauvegarde inconnu.',
  newerSchema: 'Cette sauvegarde vient d’une version plus récente de Prime : mets l’application à jour.',
  olderSchema: 'Cette sauvegarde est trop ancienne pour cette version de Prime.',
  malformed: 'Sauvegarde incomplète ou corrompue.',
};

function importErrorText(result: Extract<ReturnType<typeof readBackup>, { ok: false }>): string {
  if (result.error !== 'invalidRows') return IMPORT_ERRORS[result.error];
  const table = TABLE_LABELS[result.table] ?? result.table;
  return `Sauvegarde corrompue : élément n° ${result.index + 1} invalide dans « ${table} ». Rien n’a été importé.`;
}

function lastBackupLabel(days: number | undefined): string {
  if (days === undefined) return 'Jamais';
  if (days === 0) return 'Aujourd’hui';
  if (days === 1) return 'Hier';
  return `Il y a ${days} jours`;
}

/** Réglages › Données: where data lives, persistence, export and import. */
/** Buttons on the paper band. */
const bandButton =
  'flex min-h-12 items-center justify-center px-4 font-black [font-stretch:112%] focus-inset active:opacity-80 disabled:opacity-40';

export function DataSection() {
  const lastExport = useLiveQuery(async () => ({ at: await getLastExportAt(), now: Date.now() }));
  const persisted = useLiveQuery(async () => (await db.settings.get('storagePersisted'))?.value ?? null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean }>();
  const [pending, setPending] = useState<BackupFile>();
  const [confirmReplace, setConfirmReplace] = useState(false);

  const days = lastExport && daysSinceBackup(lastExport.at, lastExport.now);
  // Not flagged while loading: '…' must not flash in red before the real value arrives.
  const overdue = lastExport !== undefined && (days === undefined || days >= BACKUP_REMINDER_DAYS);

  async function handleExport() {
    setBusy(true);
    setMessage(undefined);
    try {
      const result = await shareBackup();
      if (result.status !== 'cancelled') setMessage({ text: `Sauvegarde créée : ${result.name}` });
    } catch {
      setMessage({ text: 'La sauvegarde a échoué.', error: true });
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setMessage(undefined);
    const result = readBackup(await file.text());
    if (result.ok) setPending(result.backup);
    else setMessage({ text: importErrorText(result), error: true });
  }

  async function runImport(mode: ImportMode) {
    if (!pending) return;
    setConfirmReplace(false);
    setBusy(true);
    try {
      const { added, skipped } = await importBackup(pending, mode);
      setPending(undefined);
      setMessage({
        text:
          mode === 'replace'
            ? `Données remplacées : ${added} éléments importés.`
            : `Fusion terminée : ${added} éléments ajoutés, ${skipped} déjà présents.`,
      });
    } catch {
      setMessage({ text: 'L’import a échoué : aucune donnée n’a été modifiée.', error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    // A paper band right under the cobalt rest timer band: ink text, ink buttons.
    <section className="mt-0.5 bleed bg-paper py-4 text-ink" aria-labelledby="data-title" id="donnees">
      <h2 id="data-title" className="text-[1.375rem] leading-tight headline">
        Données
      </h2>
      <div>
        <p className="mt-1 text-sm font-medium">
          Tes données sont stockées <strong>uniquement sur ce téléphone</strong>, sans compte ni serveur. Si
          tu supprimes l’application ou changes de téléphone, elles sont perdues sans sauvegarde.
        </p>
        <dl className="mt-3 text-[15px]">
          <div className="flex min-h-12 items-center justify-between gap-3 border-t-2 border-ink">
            <dt className="font-bold">Dernière sauvegarde</dt>
            <dd className={`font-black ${overdue ? 'text-danger-ink' : ''}`}>
              {lastExport === undefined ? '…' : lastBackupLabel(days)}
            </dd>
          </div>
          <div className="flex min-h-12 items-center justify-between gap-3 border-t-2 border-ink">
            <dt className="font-bold">Stockage persistant</dt>
            <dd className="font-black">
              {persisted === undefined ? '…' : persisted === true ? 'Activé' : 'Non garanti'}
            </dd>
          </div>
        </dl>
        {persisted === false || persisted === null ? (
          <p className="mt-1 text-xs font-semibold text-ink/72">
            Sans stockage persistant, Safari peut effacer les données d’un site peu utilisé. Ajoute Prime à
            l’écran d’accueil et sauvegarde régulièrement.
          </p>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            className={`${bandButton} bg-ink text-on-ink`}
            onClick={() => void handleExport()}
            disabled={busy}
          >
            Exporter
          </button>
          <button
            type="button"
            className={`${bandButton} border-2 border-ink`}
            onClick={() => fileInput.current?.click()}
            disabled={busy}
          >
            Importer
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => void handleFile(e)}
        />
        {message && (
          <p
            role="status"
            className={`mt-3 text-sm font-semibold ${message.error ? 'text-danger-ink' : 'text-ink/72'}`}
          >
            {message.text}
          </p>
        )}
      </div>

      <BottomSheet
        open={pending !== undefined}
        onClose={() => setPending(undefined)}
        title="Importer une sauvegarde"
      >
        {pending && (
          <>
            <p className="text-sm text-muted">
              Sauvegarde du {format(new Date(pending.exportedAt), 'd MMMM yyyy à HH:mm', { locale: fr })}
            </p>
            <ul className="mt-3 divide-y divide-line border-y border-line text-sm">
              {Object.entries(backupCounts(pending))
                .filter(([table]) => table in TABLE_LABELS)
                .map(([table, count]) => (
                  <li key={table} className="flex min-h-10 items-center justify-between">
                    <span>{TABLE_LABELS[table]}</span>
                    <span className="font-black tabular-nums">{count}</span>
                  </li>
                ))}
            </ul>
            <p className="mt-3 text-xs text-muted">
              <strong>Fusionner</strong> ajoute ce qui manque et garde tes données actuelles.{' '}
              <strong>Tout remplacer</strong> efface d’abord toutes les données de ce téléphone.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Button onClick={() => void runImport('merge')} disabled={busy}>
                Fusionner
              </Button>
              <Button variant="danger" onClick={() => setConfirmReplace(true)} disabled={busy}>
                Tout remplacer
              </Button>
            </div>
          </>
        )}
      </BottomSheet>
      <ConfirmSheet
        open={confirmReplace}
        title="Tout remplacer ?"
        message="Toutes les données actuelles de ce téléphone seront effacées et remplacées par la sauvegarde."
        confirmLabel="Effacer et importer"
        onConfirm={() => void runImport('replace')}
        onCancel={() => setConfirmReplace(false)}
      />
    </section>
  );
}

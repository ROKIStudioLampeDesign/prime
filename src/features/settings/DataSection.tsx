import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRef, useState, type ChangeEvent } from 'react';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import {
  backupFileName,
  exportBackup,
  getLastExportAt,
  importBackup,
  markExported,
  readBackup,
  type BackupError,
  type BackupFile,
  type ImportMode,
} from '../../db/backup';
import { db } from '../../db/db';
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
  settings: 'Réglages',
};

const IMPORT_ERRORS: Record<BackupError, string> = {
  notJson: 'Ce fichier n’est pas un fichier JSON valide.',
  notPrime: 'Ce fichier n’est pas une sauvegarde Prime.',
  unsupportedFormat: 'Format de sauvegarde inconnu.',
  newerSchema: 'Cette sauvegarde vient d’une version plus récente de Prime : mets l’application à jour.',
  olderSchema: 'Cette sauvegarde est trop ancienne pour cette version de Prime.',
  malformed: 'Sauvegarde incomplète ou corrompue.',
};

function lastBackupLabel(days: number | undefined): string {
  if (days === undefined) return 'Jamais';
  if (days === 0) return 'Aujourd’hui';
  if (days === 1) return 'Hier';
  return `Il y a ${days} jours`;
}

/** Réglages › Données: where data lives, persistence, export and import. */
export function DataSection() {
  const lastExport = useLiveQuery(async () => ({ at: await getLastExportAt(), now: Date.now() }));
  const persisted = useLiveQuery(async () => (await db.settings.get('storagePersisted'))?.value ?? null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean }>();
  const [pending, setPending] = useState<BackupFile>();
  const [confirmReplace, setConfirmReplace] = useState(false);

  const days = lastExport && daysSinceBackup(lastExport.at, lastExport.now);
  const overdue = days === undefined || days >= BACKUP_REMINDER_DAYS;

  async function handleExport() {
    setBusy(true);
    setMessage(undefined);
    try {
      const backup = await exportBackup();
      const name = backupFileName(new Date());
      const file = new File([JSON.stringify(backup)], name, { type: 'application/json' });
      if (navigator.canShare?.({ files: [file] })) {
        // iOS share sheet: "Enregistrer dans Fichiers", AirDrop, mail…
        await navigator.share({ files: [file], title: 'Sauvegarde Prime' });
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      await markExported();
      setMessage({ text: `Sauvegarde créée : ${name}` });
    } catch (e) {
      // Closing the share sheet is not an error worth reporting.
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        setMessage({ text: 'La sauvegarde a échoué.', error: true });
      }
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
    else setMessage({ text: IMPORT_ERRORS[result.error], error: true });
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
    <section className="mt-6" aria-labelledby="data-title" id="donnees">
      <h2 id="data-title" className="mb-1 px-1 text-xs font-semibold tracking-wide text-muted uppercase">
        Données
      </h2>
      <div className="rounded-2xl bg-surface p-4">
        <p className="text-sm">
          Tes données sont stockées <strong>uniquement sur ce téléphone</strong>, sans compte ni serveur. Si
          tu supprimes l’application ou changes de téléphone, elles sont perdues sans sauvegarde.
        </p>
        <dl className="mt-3 divide-y divide-line text-sm">
          <div className="flex min-h-11 items-center justify-between gap-3">
            <dt>Dernière sauvegarde</dt>
            <dd className={overdue ? 'font-semibold text-danger' : 'text-muted'}>
              {lastExport === undefined ? '…' : lastBackupLabel(days)}
            </dd>
          </div>
          <div className="flex min-h-11 items-center justify-between gap-3">
            <dt>Stockage persistant</dt>
            <dd className="text-muted">
              {persisted === undefined ? '…' : persisted === true ? 'Activé' : 'Non garanti'}
            </dd>
          </div>
        </dl>
        {persisted === false || persisted === null ? (
          <p className="mt-1 text-xs text-muted">
            Sans stockage persistant, Safari peut effacer les données d’un site peu utilisé. Ajoute Prime à
            l’écran d’accueil et sauvegarde régulièrement.
          </p>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button onClick={() => void handleExport()} disabled={busy}>
            Exporter
          </Button>
          <Button variant="secondary" onClick={() => fileInput.current?.click()} disabled={busy}>
            Importer
          </Button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => void handleFile(e)}
        />
        {message && (
          <p role="status" className={`mt-3 text-sm ${message.error ? 'text-danger' : 'text-muted'}`}>
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
            <ul className="mt-3 divide-y divide-line rounded-xl bg-bg px-3 text-sm">
              {Object.entries(backupCounts(pending))
                .filter(([table]) => table in TABLE_LABELS)
                .map(([table, count]) => (
                  <li key={table} className="flex min-h-10 items-center justify-between">
                    <span>{TABLE_LABELS[table]}</span>
                    <span className="text-muted tabular-nums">{count}</span>
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

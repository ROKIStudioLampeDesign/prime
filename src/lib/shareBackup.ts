import { backupFileName, exportBackup, markExported } from '../db/backup';

export type ShareBackupResult = { status: 'shared' | 'downloaded'; name: string } | { status: 'cancelled' };

/**
 * Exports every table and hands the file to the iOS share sheet ("Enregistrer dans Fichiers",
 * Mail, AirDrop…), or downloads it where files can't be shared. Must be called from a tap.
 * Closing the share sheet is not an error: nothing is marked as exported then.
 */
export async function shareBackup(): Promise<ShareBackupResult> {
  const backup = await exportBackup();
  const name = backupFileName(new Date());
  const file = new File([JSON.stringify(backup)], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Sauvegarde Prime' });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return { status: 'cancelled' };
      throw e;
    }
    await markExported();
    return { status: 'shared', name };
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  await markExported();
  return { status: 'downloaded', name };
}

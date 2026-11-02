import { useRef, useState, type ChangeEvent } from 'react';
import { BlobImage } from '../../components/BlobImage';
import { Button } from '../../components/Button';
import { CameraIcon, ImageIcon, TrashIcon } from '../../components/icons';
import { resizeImage } from '../../lib/image';

interface PhotoPickerProps {
  photo: Blob | undefined;
  onChange: (photo: Blob | undefined) => void;
  alt: string;
  /** Lets the form disable saving while a photo is being resized. */
  onBusyChange?: (busy: boolean) => void;
}

/** Camera capture with a gallery fallback; photos are resized to 800 px JPEG before being kept. */
export function PhotoPicker({ photo, onChange, alt, onBusyChange }: PhotoPickerProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  function setBusyState(value: boolean) {
    setBusy(value);
    onBusyChange?.(value);
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again
    if (!file) return;
    setBusyState(true);
    setError(false);
    try {
      onChange(await resizeImage(file));
    } catch {
      setError(true);
    } finally {
      setBusyState(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        <BlobImage blob={photo} alt={alt} className="size-28 rounded-2xl" />
        <div className="flex flex-1 flex-col gap-2">
          <Button variant="secondary" disabled={busy} onClick={() => cameraInput.current?.click()}>
            <CameraIcon className="size-5" /> Photo
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => galleryInput.current?.click()}>
            <ImageIcon className="size-5" /> Galerie
          </Button>
        </div>
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={handleFile}
        />
        <input ref={galleryInput} type="file" accept="image/*" hidden onChange={handleFile} />
      </div>
      {busy && <p className="text-xs text-muted">Traitement de la photo…</p>}
      {error && <p className="text-xs text-danger">Impossible de lire cette image.</p>}
      {photo && !busy && (
        <button
          type="button"
          className="flex min-h-11 items-center gap-1 self-start text-sm text-muted"
          onClick={() => onChange(undefined)}
        >
          <TrashIcon className="size-4" /> Retirer la photo
        </button>
      )}
    </div>
  );
}

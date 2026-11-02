import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../../components/Button';
import { CloseIcon } from '../../components/icons';
import { TextField } from '../../components/TextField';
import { isValidGtin, normalizeBarcode } from '../../domain/barcode';

type CameraState = 'starting' | 'scanning' | 'denied' | 'noCamera' | 'insecure' | 'error';

const CAMERA_MESSAGES: Record<Exclude<CameraState, 'starting' | 'scanning'>, string> = {
  denied:
    'Accès à la caméra refusé. Autorise-le dans Réglages › Safari › Caméra (ou les réglages du site), ou saisis le code à la main.',
  noCamera: 'Aucune caméra disponible sur cet appareil. Saisis le code à la main.',
  insecure: 'La caméra n’est disponible qu’en HTTPS. Saisis le code à la main.',
  error: 'Impossible de démarrer la caméra. Saisis le code à la main.',
};

/** Food packaging codes only: faster and fewer false reads than "all formats". */
const HINTS = new Map<DecodeHintType, unknown>([
  [
    DecodeHintType.POSSIBLE_FORMATS,
    [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E],
  ],
]);

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void;
  onClose: () => void;
}

/**
 * Full-screen rear-camera barcode scanner (zxing, works on iOS Safari unlike BarcodeDetector),
 * with a manual entry fallback that is always available.
 */
export function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [camera, setCamera] = useState<CameraState>('starting');
  const [manual, setManual] = useState('');
  const [manualError, setManualError] = useState<string>();
  const doneRef = useRef(false);
  const onDetectedRef = useRef(onDetected);
  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let controls: IScannerControls | undefined;
    let cancelled = false;

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      queueMicrotask(() => setCamera('insecure'));
      return;
    }
    const reader = new BrowserMultiFormatReader(HINTS, { delayBetweenScanAttempts: 150 });
    reader
      .decodeFromConstraints(
        { audio: false, video: { facingMode: { ideal: 'environment' } } },
        video,
        (result) => {
          if (!result || doneRef.current) return;
          const code = normalizeBarcode(result.getText());
          if (!isValidGtin(code)) return;
          doneRef.current = true;
          if ('vibrate' in navigator) navigator.vibrate(40);
          controls?.stop();
          onDetectedRef.current(code);
        },
      )
      .then((c) => {
        if (cancelled) c.stop();
        else {
          controls = c;
          setCamera('scanning');
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const name = e instanceof Error ? e.name : '';
        if (name === 'NotAllowedError' || name === 'SecurityError') setCamera('denied');
        else if (name === 'NotFoundError' || name === 'OverconstrainedError') setCamera('noCamera');
        else setCamera('error');
      });

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, []);

  function submitManual(e: FormEvent) {
    e.preventDefault();
    const code = normalizeBarcode(manual);
    if (!isValidGtin(code)) {
      setManualError('Code invalide : 8, 12 ou 13 chiffres, vérifie la saisie.');
      return;
    }
    doneRef.current = true;
    onDetected(code);
  }

  const failed = camera !== 'starting' && camera !== 'scanning';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Scanner un code-barres"
      className="fixed inset-0 z-50 flex flex-col bg-black text-white"
    >
      <div className="flex items-center justify-between pt-safe px-safe">
        <h2 className="py-3 text-lg font-semibold">Scanner un code-barres</h2>
        <button
          type="button"
          aria-label="Fermer"
          onClick={onClose}
          className="-mr-2 flex size-11 items-center justify-center rounded-full active:bg-white/10"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 size-full object-cover"
        />
        {!failed && (
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            aria-hidden="true"
          >
            <div className="h-36 w-72 max-w-[80%] rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
          </div>
        )}
        <p className="absolute inset-x-0 top-3 px-6 text-center text-sm text-white/80" role="status">
          {camera === 'starting'
            ? 'Démarrage de la caméra…'
            : camera === 'scanning'
              ? 'Place le code-barres dans le cadre'
              : CAMERA_MESSAGES[camera]}
        </p>
      </div>

      <form onSubmit={submitManual} className="bg-surface pt-4 px-safe pb-safe text-fg">
        <div className="mx-auto flex max-w-lg items-end gap-2 pb-4">
          <div className="flex-1">
            <TextField
              label="Ou saisis le code"
              inputMode="numeric"
              autoComplete="off"
              enterKeyHint="search"
              placeholder="3017620422003"
              value={manual}
              onChange={(e) => {
                setManual(e.target.value);
                setManualError(undefined);
              }}
              error={manualError}
            />
          </div>
          <Button type="submit" className={manualError ? 'mb-5' : ''} disabled={manual.trim() === ''}>
            OK
          </Button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

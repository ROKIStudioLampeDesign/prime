import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../../components/Button';
import { CloseIcon } from '../../components/icons';
import { TextField } from '../../components/TextField';
import { isValidGtin, normalizeBarcode, scannerZoom } from '../../domain/barcode';

type CameraState = 'starting' | 'scanning' | 'denied' | 'noCamera' | 'insecure' | 'error';

const CAMERA_MESSAGES: Record<Exclude<CameraState, 'starting' | 'scanning'>, string> = {
  denied:
    'Accès à la caméra refusé. Autorise-le dans Réglages › Safari › Caméra (ou les réglages du site), ou saisis le code à la main.',
  noCamera: 'Aucune caméra disponible sur cet appareil. Saisis le code à la main.',
  insecure: 'La caméra n’est disponible qu’en HTTPS. Saisis le code à la main.',
  error: 'Impossible de démarrer la caméra. Saisis le code à la main.',
};

/**
 * Food packaging codes only: faster and fewer false reads than "all formats". TRY_HARDER also
 * scans more rows of each frame, so slightly tilted or small codes still read.
 */
const HINTS = new Map<DecodeHintType, unknown>([
  [
    DecodeHintType.POSSIBLE_FORMATS,
    [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E],
  ],
  [DecodeHintType.TRY_HARDER, true],
]);

/**
 * Without a resolution, iOS Safari streams 640×480: a barcode held far enough to be in focus is
 * then too few pixels wide to decode. Ask for 1080p (zxing decodes the frame at full size).
 */
const VIDEO: MediaTrackConstraints = {
  facingMode: { ideal: 'environment' },
  width: { ideal: 1920 },
  height: { ideal: 1080 },
};

/** Zoom and focus aren't in TypeScript's DOM types yet (Safari 17+, Chrome support them). */
interface CameraCapabilities {
  zoom?: { min?: number; max?: number };
  focusMode?: string[];
}

const allTracks = (t: MediaStreamTrack) => [t];

/** Applies camera settings missing from the DOM types; ignored by cameras that lack them. */
function applyAdvanced(c: IScannerControls, advanced: Record<string, unknown>[]) {
  try {
    c.streamVideoConstraintsApply?.({ advanced } as unknown as MediaTrackConstraints, allTracks);
  } catch {
    // Experimental API: scanning still works at the current settings.
  }
}

/**
 * iPhones can't focus closer than ~15–20 cm, so a code held close enough to fill the frame is
 * blurry. Zoom 2× instead: the code is big and sharp from 25–30 cm. Continuous focus if offered.
 * Returns the zoom levels for the ×1/×2 toggle, or undefined when zoom can't be set.
 */
function setupCamera(c: IScannerControls): { near: number; far: number } | undefined {
  let caps: CameraCapabilities | undefined;
  try {
    caps = c.streamVideoCapabilitiesGet?.(allTracks) as CameraCapabilities | undefined;
  } catch {
    return undefined;
  }
  const far = scannerZoom(caps?.zoom);
  const near = scannerZoom(caps?.zoom, 1);
  const zoomable = far !== undefined && near !== undefined && far > near;
  const advanced: Record<string, unknown>[] = [];
  if (caps?.focusMode?.includes('continuous')) advanced.push({ focusMode: 'continuous' });
  if (zoomable) advanced.push({ zoom: far });
  if (advanced.length > 0) applyAdvanced(c, advanced);
  return zoomable ? { near, far } : undefined;
}

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
  // Zoom levels the camera offers (undefined: not adjustable) and the one applied.
  const [zoomLevels, setZoomLevels] = useState<{ near: number; far: number }>();
  const [zoomed, setZoomed] = useState(true);
  const controlsRef = useRef<IScannerControls | undefined>(undefined);
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
      .decodeFromConstraints({ audio: false, video: VIDEO }, video, (result) => {
        if (!result || doneRef.current) return;
        const code = normalizeBarcode(result.getText());
        if (!isValidGtin(code)) return;
        doneRef.current = true;
        if ('vibrate' in navigator) navigator.vibrate(40);
        controls?.stop();
        onDetectedRef.current(code);
      })
      .then((c) => {
        if (cancelled) c.stop();
        else {
          controls = c;
          controlsRef.current = c;
          setCamera('scanning');
          const levels = setupCamera(c);
          if (levels) setZoomLevels(levels);
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

  function toggleZoom() {
    if (!zoomLevels) return;
    const next = !zoomed;
    setZoomed(next);
    const c = controlsRef.current;
    if (c) applyAdvanced(c, [{ zoom: next ? zoomLevels.far : zoomLevels.near }]);
  }

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
              ? 'Place le code-barres dans le cadre, téléphone à 25–30 cm'
              : CAMERA_MESSAGES[camera]}
        </p>
        {camera === 'scanning' && zoomLevels && (
          <button
            type="button"
            onClick={toggleZoom}
            aria-pressed={zoomed}
            aria-label={zoomed ? 'Zoom ×2 activé, revenir à ×1' : 'Zoomer ×2'}
            className="absolute bottom-4 left-1/2 flex size-14 -translate-x-1/2 items-center justify-center rounded-full bg-black/60 text-base font-black tabular-nums active:bg-black/80"
          >
            ×{zoomed ? 2 : 1}
          </button>
        )}
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

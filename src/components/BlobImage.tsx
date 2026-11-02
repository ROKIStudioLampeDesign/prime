import { useEffect, useRef } from 'react';
import { ImageIcon } from './icons';

interface BlobImageProps {
  blob?: Blob;
  alt: string;
  /** Sizing classes for the box. The box always reserves its space, so loading causes no layout shift. */
  className?: string;
}

/** Displays an image stored as a Blob (IndexedDB), with a placeholder while loading or when absent. */
export function BlobImage({ blob, alt, className = '' }: BlobImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);

  // The object URL is created and revoked by the effect (no state), so StrictMode's double mount
  // and live-query refreshes (which hand us new Blob instances) never leak or show a revoked URL.
  useEffect(() => {
    const img = imgRef.current;
    if (!img || !blob) return;
    const url = URL.createObjectURL(blob);
    img.src = url;
    return () => {
      URL.revokeObjectURL(url);
      img.style.opacity = '0';
    };
  }, [blob]);

  return (
    <div className={`relative shrink-0 overflow-hidden bg-surface-2 ${className}`}>
      <ImageIcon className="absolute inset-0 m-auto size-1/3 max-h-8 max-w-8 text-muted/50" />
      {blob && (
        <img
          ref={imgRef}
          alt={alt}
          decoding="async"
          className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-200"
          onLoad={(e) => (e.currentTarget.style.opacity = '1')}
        />
      )}
    </div>
  );
}

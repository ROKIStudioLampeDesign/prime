import { prepareZXingModule, readBarcodes, type ReaderOptions } from 'zxing-wasm/reader';
// Served by the app itself (and precached), never from zxing-wasm's default CDN: works offline.
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

/**
 * ZXing-C++ compiled to WebAssembly: much more robust than the old zxing-js port on blurry,
 * small or badly lit codes. Only the barcode scanner imports this module (lazy chunk).
 */
const OPTIONS: ReaderOptions = {
  // Food packaging codes only: faster and fewer false reads.
  formats: ['EAN13', 'EAN8', 'UPCA', 'UPCE'],
  tryHarder: true,
  // Codes printed vertically on the pack still read.
  tryRotate: true,
  tryInvert: false,
  maxNumberOfSymbols: 1,
};

/** Loads the WASM module (once). Rejects when it can't be loaded. */
export async function loadBarcodeDecoder(): Promise<void> {
  await prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path),
    },
    fireImmediately: true,
  });
}

/** The first valid code in the image, or undefined. */
export async function decodeBarcode(image: ImageData): Promise<string | undefined> {
  const results = await readBarcodes(image, OPTIONS);
  return results.find((r) => r.isValid)?.text;
}

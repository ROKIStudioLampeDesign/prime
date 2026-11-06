import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from './fixtures';

/**
 * The real scanner (camera → canvas → zxing-wasm) against Chromium's fake camera, which plays a
 * generated video of an EAN-13 code. Proves the WASM decoder loads from the app and reads a code.
 */
const CODE = '3017620422003';

// EAN-13 digit patterns (L: odd parity, G: even parity, R: right half), and the parity of the
// left six digits chosen by the first digit.
const L = [
  '0001101',
  '0011001',
  '0010011',
  '0111101',
  '0100011',
  '0110001',
  '0101111',
  '0111011',
  '0110111',
  '0001011',
];
const G = [
  '0100111',
  '0110011',
  '0011011',
  '0100001',
  '0011101',
  '0111001',
  '0000101',
  '0010001',
  '0001001',
  '0010111',
];
const R = L.map((p) => [...p].map((b) => (b === '0' ? '1' : '0')).join(''));
const PARITY = [
  'LLLLLL',
  'LLGLGG',
  'LLGGLG',
  'LLGGGL',
  'LGLLGG',
  'LGGLLG',
  'LGGGLL',
  'LGLGLG',
  'LGLGGL',
  'LGGLGL',
];

function ean13Modules(code: string): string {
  const d = [...code].map(Number);
  const parity = PARITY[d[0] ?? 0] ?? 'LLLLLL';
  let bits = '101';
  for (let i = 1; i <= 6; i++) bits += (parity[i - 1] === 'G' ? G : L)[d[i] ?? 0];
  bits += '01010';
  for (let i = 7; i <= 12; i++) bits += R[d[i] ?? 0];
  return bits + '101';
}

/** One-frame Y4M (4:2:0) video: white page, black bars in the middle. */
function barcodeVideo(path: string) {
  const W = 640;
  const H = 480;
  const MODULE = 2;
  const bits = ean13Modules(CODE);
  const x0 = Math.round((W - bits.length * MODULE) / 2);
  const y = Buffer.alloc(W * H, 235);
  for (let row = H / 2 - 70; row < H / 2 + 70; row++) {
    for (let i = 0; i < bits.length; i++) {
      if (bits[i] !== '1') continue;
      for (let k = 0; k < MODULE; k++) y[row * W + x0 + i * MODULE + k] = 16;
    }
  }
  const chroma = Buffer.alloc((W / 2) * (H / 2), 128);
  writeFileSync(
    path,
    Buffer.concat([Buffer.from(`YUV4MPEG2 W${W} H${H} F30:1 Ip A1:1 C420jpeg\nFRAME\n`), y, chroma, chroma]),
  );
}

const video = join(tmpdir(), 'prime-ean13.y4m');
barcodeVideo(video);

test.use({
  launchOptions: {
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-video-capture=${video}`,
    ],
  },
  permissions: ['camera'],
  // Open Food Facts is mocked with a 404 (unknown product), which the browser logs.
  allowedConsoleErrors: [/404/],
});

test('scans an EAN-13 with the camera and looks it up', async ({ page }) => {
  let looked = '';
  await page.route('https://world.openfoodfacts.org/**', (route) => {
    looked = route.request().url();
    return route.fulfill({ status: 404, contentType: 'application/json', body: '{"status":0}' });
  });
  await page.goto('/nutrition/foods/new');
  await page.getByRole('button', { name: 'Scanner un code-barres' }).click();
  await expect(page.getByRole('dialog', { name: 'Scanner un code-barres' })).toBeVisible();

  await expect(page.getByText('Produit introuvable sur Open Food Facts')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('dialog', { name: 'Scanner un code-barres' })).toHaveCount(0);
  expect(looked).toContain(CODE);
});

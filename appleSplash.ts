import sharp from 'sharp';
import type { Plugin } from 'vite';
import { appleSplashScreenSizes, type AppleDeviceName } from '@vite-pwa/assets-generator/config';

/**
 * Every iPhone the generator knows, one image per screen size (devices sharing a size share an
 * image): iOS shows the matching launch image while a home screen app opens. A phone without a
 * match gets the icon on a black screen instead, so none is left out.
 */
const IPHONES = (Object.keys(appleSplashScreenSizes) as AppleDeviceName[]).filter((name) =>
  name.startsWith('iPhone'),
);

/** The "PR" of the logo (`public/favicon.svg`), centred on (258, 254) in its 512 grid. */
const LETTERS =
  '<path fill-rule="evenodd" d="M86 178H198A48 48 0 0 1 198 274H140V330H86ZM140 216H192A10 10 0 0 1 192 236H140Z"/>' +
  '<path fill-rule="evenodd" d="M266 178H380A48 48 0 0 1 380 274L430 330H372L322 274H320V330H266ZM320 216H374A10 10 0 0 1 374 236H320Z"/>';

/**
 * The launch screen: the logo's red field over the whole screen, its letters in the middle at
 * the same size as the HTML splash of `index.html` (half the screen wide), so the hand-over
 * from the launch image to the page doesn't jump.
 */
function splashSvg(width: number, height: number): string {
  const scale = (width * 0.5) / 344;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <linearGradient id="field" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ff3347"/>
      <stop offset="0.55" stop-color="#c4101f"/>
      <stop offset="1" stop-color="#2a0006"/>
    </linearGradient>
    <linearGradient id="ink" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4a3a40"/>
      <stop offset="0.35" stop-color="#050203"/>
      <stop offset="1" stop-color="#050203"/>
    </linearGradient>
    <filter id="soft" filterUnits="userSpaceOnUse" x="-512" y="-512" width="1536" height="1536"><feGaussianBlur stdDeviation="22"/></filter>
    <g id="letters">${LETTERS}</g>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#field)"/>
  <g transform="translate(${width / 2} ${height / 2}) scale(${scale}) translate(-258 -254)">
    <use href="#letters" fill="#2a0006" opacity="0.55" filter="url(#soft)" transform="translate(256 300) scale(1.6) translate(-258 -254)"/>
    <use href="#letters" fill="url(#ink)"/>
    <use href="#letters" fill="none" stroke="#ff8a94" stroke-opacity="0.35" stroke-width="2"/>
  </g>
</svg>`;
}

/** Builds the full-screen iPhone launch images and links them from `index.html` (build only). */
export function appleSplash(): Plugin {
  const sizes = IPHONES.map((name) => appleSplashScreenSizes[name]).filter(
    (size, i, all) => all.findIndex((o) => o.width === size.width && o.height === size.height) === i,
  );
  const fileName = (size: { width: number; height: number }) =>
    `apple-splash-${size.width}x${size.height}.png`;
  return {
    name: 'prime-apple-splash',
    apply: 'build',
    transformIndexHtml() {
      return sizes.map((size) => ({
        tag: 'link',
        injectTo: 'head' as const,
        attrs: {
          rel: 'apple-touch-startup-image',
          media: `screen and (device-width: ${size.width / size.scaleFactor}px) and (device-height: ${size.height / size.scaleFactor}px) and (-webkit-device-pixel-ratio: ${size.scaleFactor}) and (orientation: portrait)`,
          href: `/${fileName(size)}`,
        },
      }));
    },
    async generateBundle() {
      for (const size of sizes) {
        const source = await sharp(Buffer.from(splashSvg(size.width, size.height)))
          .png({ compressionLevel: 9 })
          .toBuffer();
        this.emitFile({ type: 'asset', fileName: fileName(size), source });
      }
    },
  };
}

import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    // The artwork is full-bleed (its own yellow background) and its dumbbell already sits inside
    // the maskable safe zone, so no extra padding: the icon fills the home screen tile.
    maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: { background: '#ff2e8a' } },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: '#ff2e8a' } },
  },
  images: ['public/favicon.svg'],
});

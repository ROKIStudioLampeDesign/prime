import {
  appleSplashScreenSizes,
  createAppleSplashScreens,
  defineConfig,
  minimal2023Preset,
  type AppleDeviceName,
} from '@vite-pwa/assets-generator/config';

/**
 * iPhones from the 12 on, one per screen size (devices sharing a size share an image): iOS shows
 * the matching launch image, the logo on the app's background, while a home screen app opens.
 */
const IPHONES = (
  [
    'iPhone 12 mini',
    'iPhone 12',
    'iPhone 12 Pro Max',
    'iPhone 14 Plus',
    'iPhone 14 Pro',
    'iPhone 14 Pro Max',
    'iPhone 15',
    'iPhone 15 Plus',
    'iPhone 16 Pro',
    'iPhone 16 Pro Max',
    'iPhone 16e',
    'iPhone 17',
    'iPhone 17 Pro',
    'iPhone 17 Pro Max',
    'iPhone Air',
    'iPhone SE 4.7"',
  ] satisfies AppleDeviceName[]
).filter((name, i, names) => {
  const size = appleSplashScreenSizes[name];
  return (
    names.findIndex((other) => {
      const o = appleSplashScreenSizes[other];
      return o.width === size.width && o.height === size.height;
    }) === i
  );
});

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    // The artwork is full-bleed (its own red field) and its "PR" already sits inside the
    // maskable safe zone, so no extra padding: the icon fills the home screen tile.
    maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: { background: '#c4101f' } },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: '#c4101f' } },
    // Launch images: the logo, a third of the screen wide, on the page colour of each theme (the
    // same as the logo `index.html` shows until the app has loaded).
    appleSplashScreens: createAppleSplashScreens(
      {
        padding: 0.34,
        resizeOptions: { background: '#f2efea', fit: 'contain' },
        darkResizeOptions: { background: '#020106', fit: 'contain' },
        linkMediaOptions: { log: false, addMediaScreen: true, basePath: '/', xhtml: false },
        png: { compressionLevel: 9, quality: 70 },
      },
      IPHONES,
    ),
  },
  images: ['public/favicon.svg'],
});

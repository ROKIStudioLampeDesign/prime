/**
 * A short vibration under the finger, where the Vibration API exists (Android). iOS Safari has
 * none, so this is silent on the iPhone.
 */
export function haptic(pattern: number | number[] = 20) {
  if (typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
}

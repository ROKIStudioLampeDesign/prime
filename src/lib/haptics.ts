/**
 * A short vibration under the finger. Android has the Vibration API; iOS Safari does not, but
 * toggling a native switch (`<input type="checkbox" switch>`, iOS 17.4+) plays a haptic tick, so a
 * hidden one is clicked instead (one tick per pulse of the pattern). Must be called from a tap.
 * Silent where neither exists.
 */
export function haptic(pattern: number | number[] = 20) {
  if (typeof navigator.vibrate === 'function') {
    navigator.vibrate(pattern);
    return;
  }
  const pulses = typeof pattern === 'number' ? [pattern] : pattern.filter((_, i) => i % 2 === 0);
  let delay = 0;
  pulses.forEach((pulse, i) => {
    if (i === 0) switchTick();
    else window.setTimeout(switchTick, delay);
    const pause = typeof pattern === 'number' ? 0 : (pattern[i * 2 + 1] ?? 0);
    delay += pulse + pause;
  });
}

function switchTick() {
  const label = document.createElement('label');
  label.setAttribute('aria-hidden', 'true');
  label.style.display = 'none';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  label.append(input);
  document.head.append(label);
  label.click();
  label.remove();
}

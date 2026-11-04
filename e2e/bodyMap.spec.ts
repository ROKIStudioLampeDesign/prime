import { expect, test } from './fixtures';

/**
 * Hit test on the real rendered map: every muscle must own a visible spot where a tap lands on
 * its own hit area (not on a neighbour drawn on top). Re-run after editing the body geometry.
 */
for (const view of ['Face', 'Dos'] as const) {
  test(`every muscle is tappable on the ${view} view`, async ({ page }) => {
    await page.goto('/body');
    await page.getByRole('radiogroup', { name: 'Vue' }).getByText(view, { exact: true }).click();
    const map = page.getByRole('group', {
      name: view === 'Face' ? 'Corps, vue de face' : 'Corps, vue de dos',
    });
    await expect(map).toBeVisible();

    const misses = await map.evaluate((svg) => {
      const failed: string[] = [];
      const targets = [...svg.querySelectorAll<SVGPathElement>('path[role="button"]')];
      for (const target of targets) {
        const muscle = target.dataset.muscle ?? '?';
        const box = target.getBoundingClientRect();
        let hit = false;
        // Sample a grid over the shape's box; one point landing on the shape itself is enough.
        for (let i = 1; i < 12 && !hit; i++) {
          for (let j = 1; j < 12 && !hit; j++) {
            const x = box.left + (box.width * i) / 12;
            const y = box.top + (box.height * j) / 12;
            const el = document.elementFromPoint(x, y);
            if (el instanceof SVGPathElement && el.dataset.muscle === muscle && el.closest('svg') === svg)
              hit = true;
          }
        }
        if (!hit) failed.push(muscle);
      }
      return { failed, count: targets.length };
    });
    expect(misses.count).toBeGreaterThan(8);
    expect(misses.failed).toEqual([]);
  });
}

import { test, expect, type Page } from '@playwright/test';

test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

async function start(page: Page) {
  await page.goto('?test=1');
  await page.locator('#deploy').click();
  await expect(page.locator('.touch-controls')).toBeVisible();
  await page.waitForFunction(() => window.__BREACH__.audio.ready);
  await page.evaluate(() => {
    const g = window.__BREACH__.game;
    g.waveDelay = 1000;
    g.spawnLeft = 0;
    g.enemies = [];
    g.players[0].invincible = 1000;
  });
}

test('mobile pointer controls move, aim/fire, switch equipment, and stop on release', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await start(page);
  expect(await page.evaluate(() => window.__BREACH__.save.graphics)).toBe('low');
  const move = (await page.locator('[data-stick="move"]').boundingBox())!;
  const before = await page.evaluate(() => window.__BREACH__.game.players[0].x);
  await page.mouse.move(move.x + move.width / 2, move.y + move.height / 2);
  await page.mouse.down();
  await page.mouse.move(move.x + move.width - 10, move.y + move.height / 2);
  await expect
    .poll(() => page.evaluate(() => window.__BREACH__.game.players[0].x))
    .toBeGreaterThan(before + 0.6);
  await page.mouse.up();
  const stopped = await page.evaluate(() => window.__BREACH__.game.players[0].x);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.__BREACH__.game.players[0].x)).toBeCloseTo(stopped, 2);

  await page.locator('[data-weapon="1"]').click();
  await expect(page.locator('#weapon-title')).toHaveText('Vector SMG');
  const aim = (await page.locator('[data-stick="aim"]').boundingBox())!;
  await page.mouse.move(aim.x + aim.width / 2, aim.y + 8);
  await page.mouse.down();
  await expect
    .poll(() => page.evaluate(() => window.__BREACH__.game.players[0].ammo[1]))
    .toBeLessThan(180);
  await page.mouse.up();
  const ammo = await page.evaluate(() => window.__BREACH__.game.players[0].ammo[1]);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__BREACH__.game.players[0].ammo[1])).toBe(ammo);
  await page.locator('[data-weapon="8"]').click();
  await expect(page.locator('#weapon-title')).toHaveText('Remote Charge');
  await page.mouse.move(aim.x + aim.width / 2, aim.y + 8);
  await page.mouse.down();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__BREACH__.game.equipment.some((e) => e.kind === 'remote' && e.owner === 0),
      ),
    )
    .toBe(true);
  await page.mouse.up();
  await page.locator('[data-touch-action="detonate"]').click({ delay: 200 });
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__BREACH__.game.equipment.some(
          (e) => e.kind === 'remote' && e.owner === 0 && e.hp > 0,
        ),
      ),
    )
    .toBe(false);
  expect(errors).toEqual([]);
});

test('mobile controls fit portrait/landscape, dialogs work, and rotation clears held input', async ({
  page,
}) => {
  await start(page);
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [844, 390],
    [1024, 768],
  ]) {
    await page.setViewportSize({ width, height });
    for (const selector of [
      '[data-stick="move"]',
      '[data-stick="aim"]',
      '.touch-actions',
      '.hud-bottom',
      '#pause',
    ]) {
      const box = (await page.locator(selector).boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
      expect(box.y + box.height).toBeLessThanOrEqual(height + 1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.locator('#pause').click();
    await expect(page.getByRole('dialog')).toContainText('Operation paused');
    await page.locator('#resume').click();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const move = (await page.locator('[data-stick="move"]').boundingBox())!;
  await page.mouse.move(move.x + move.width - 8, move.y + move.height / 2);
  await page.mouse.down();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('[data-stick="move"]')).not.toHaveClass(/held/);
  await page.mouse.up();
  await page.locator('#upgrade-button').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.locator('#upgrade-done').click();
  await page.screenshot({ path: 'artifacts/mobile-landscape.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/mobile-gameplay.png' });
});

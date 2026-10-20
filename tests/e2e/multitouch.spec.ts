import { test, expect } from '@playwright/test';

test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

test('real simultaneous touch movement, firing, dash, interaction, cancellation and pause', async ({
  page,
  context,
}) => {
  await page.goto('?test=1');
  await page.locator('#deploy').tap();
  await expect(page.locator('.touch-controls')).toBeVisible();
  await page.waitForFunction(() => window.__BREACH__.audio.ready);
  await page.evaluate(() => {
    const g = window.__BREACH__.game;
    g.waveDelay = 1000;
    g.spawnLeft = 0;
    g.enemies = [];
    g.players[0].invincible = 1000;
  });
  await page.locator('[data-weapon="1"]').tap();
  const cdp = await context.newCDPSession(page);
  const point = async (selector: string, id: number, dx = 0, dy = 0) => {
    const box = (await page.locator(selector).boundingBox())!;
    return { id, x: box.x + box.width / 2 + dx, y: box.y + box.height / 2 + dy };
  };
  const move = await point('[data-stick="move"]', 1, 35);
  const aim = await point('[data-stick="aim"]', 2, 0, -35);
  const x = await page.evaluate(() => window.__BREACH__.game.players[0].x);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [move, aim] });
  await expect
    .poll(() => page.evaluate(() => window.__BREACH__.game.players[0].x))
    .toBeGreaterThan(x + 0.5);
  await expect
    .poll(() => page.evaluate(() => window.__BREACH__.game.players[0].ammo[1]))
    .toBeLessThan(180);
  const dash = await point('[data-touch-action="dash"]', 3);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [move, aim, dash],
  });
  await expect
    .poll(() => page.evaluate(() => window.__BREACH__.game.players[0].dash))
    .toBeGreaterThan(0);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect(page.locator('.touch-controls .held')).toHaveCount(0);
  const stopped = await page.evaluate(() => ({
    x: window.__BREACH__.game.players[0].x,
    ammo: window.__BREACH__.game.players[0].ammo[1],
  }));
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__BREACH__.game.players[0].x)).toBeCloseTo(stopped.x, 2);
  expect(await page.evaluate(() => window.__BREACH__.game.players[0].ammo[1])).toBe(stopped.ammo);

  await page.evaluate(() => {
    const g = window.__BREACH__.game,
      p = g.players[0],
      o = g.objectives[0];
    p.x = o.x;
    p.z = o.z + 1;
    o.hp = 50;
  });
  const interact = await point('[data-touch-action="interact"]', 4);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [interact] });
  await expect
    .poll(() => page.evaluate(() => window.__BREACH__.game.objectives[0].hp))
    .toBeGreaterThan(50);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [move, aim] });
  const pause = await point('#pause', 5);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [move, aim, pause],
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [pause] });
  await expect(page.getByRole('dialog')).toContainText('Operation paused');
  await expect(page.locator('.touch-controls .held')).toHaveCount(0);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.locator('#resume').tap();
  const resumed = await page.evaluate(() => window.__BREACH__.game.players[0].x);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.__BREACH__.game.players[0].x)).toBeCloseTo(resumed, 2);
  expect(await page.evaluate(() => window.__BREACH__.audio.ctx?.state)).toBe('running');
});

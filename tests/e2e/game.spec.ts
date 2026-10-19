import { test, expect, type Page } from '@playwright/test';
import type { Game } from '../../src/core/game';
import type { AudioManager } from '../../src/audio/AudioManager';
import type { World } from '../../src/rendering/World';
import type { Save } from '../../src/core/save';
import type { Mode } from '../../src/core/data';
declare global {
  interface Window {
    __BREACH__: {
      game: Game;
      audio: AudioManager;
      world: World;
      save: Save;
      start: (options?: { arena?: number; mode?: Mode; seed?: number }) => Promise<void>;
      menu: () => void;
      paused: boolean;
      setPaused: (value: boolean) => void;
      snapshot: () => unknown;
    };
  }
}
const browserErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
});
test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page)).toEqual([]);
});
async function open(page: Page) {
  await page.addInitScript(() => {
    if (!localStorage.getItem('breach.save.v1'))
      localStorage.setItem(
        'breach.save.v1',
        JSON.stringify({ version: 1, graphics: 'low', audio: { master: 0.7, music: 0.45 } }),
      );
  });
  await page.goto('?test=1');
  await expect(page.locator('#deploy')).toBeVisible();
}
async function start(page: Page, mode = 'survival') {
  await open(page);
  await page.locator(`[data-mode="${mode}"]`).click();
  await page.locator('#deploy').click();
  await expect(page.locator('.weapon-slots')).toBeVisible();
  await page.waitForFunction(() => window.__BREACH__.audio.ready);
}
async function freezeThreats(page: Page) {
  await page.evaluate(() => {
    const g = window.__BREACH__.game;
    g.waveDelay = Infinity;
    g.spawnLeft = 0;
    g.enemies = [];
    g.players.forEach((p) => (p.invincible = 1000));
  });
}
test('menu renders genuine 3D, all arenas load, and compact layout is usable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page);
  await expect(page.locator('h1')).toHaveText('BREACH.');
  for (let i = 0; i < 6; i++) {
    await page.locator(`[data-arena="${i}"]`).click();
    await expect(page.locator(`[data-arena="${i}"]`)).toHaveAttribute('aria-pressed', 'true');
    await page.waitForFunction((i) => window.__BREACH__.world.arenaIndex === i, i);
    expect(await page.evaluate(() => window.__BREACH__.world.stats.triangles)).toBeGreaterThan(
      1000,
    );
  }
  await page.locator('[data-arena="0"]').click();
  await page.screenshot({ path: 'artifacts/menu.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#deploy')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'artifacts/mobile-menu.png', fullPage: true });
  expect(errors).toEqual([]);
});
test('keyboard movement, mouse fire, switching, equipment, and pause work', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await start(page);
  await freezeThreats(page);
  const before = await page.evaluate(() => window.__BREACH__.game.players[0].x);
  await page.keyboard.down('d');
  await expect
    .poll(() => page.evaluate(() => window.__BREACH__.game.players[0].x))
    .toBeGreaterThan(before + 1);
  await page.keyboard.up('d');
  await page.mouse.move(700, 500);
  await page.keyboard.down('Space');
  await expect
    .poll(() => page.evaluate(() => window.__BREACH__.audio.history.includes('pistol')))
    .toBe(true);
  await page.keyboard.up('Space');
  await page.keyboard.press('Digit2');
  await expect(page.locator('#weapon-title')).toHaveText('Vector SMG');
  await page.mouse.click(700, 500);
  await page.keyboard.press('Digit4');
  await page.keyboard.press('Space');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__BREACH__.game.equipment.filter((e) => e.owner === 0 && e.kind === 'barrel')
            .length,
      ),
    )
    .toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toContainText('Operation paused');
  const t = await page.evaluate(() => window.__BREACH__.game.time);
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => window.__BREACH__.game.time)).toBe(t);
  await page.locator('#resume').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(errors).toEqual([]);
});
test('actual combat kills a hostile and emits pistol and hit sounds', async ({ page }) => {
  await start(page);
  await freezeThreats(page);
  await page.evaluate(() => {
    const g = window.__BREACH__.game;
    g.spawn('brute', { x: -5, z: 11 });
  });
  const target = await page.evaluate(() => window.__BREACH__.world.project({ x: -5, z: 11 }));
  await page.mouse.move(target.x, target.y);
  await page.mouse.down();
  await expect
    .poll(() => page.evaluate(() => window.__BREACH__.game.kills), { timeout: 25000 })
    .toBeGreaterThan(0);
  await page.mouse.up();
  expect(await page.evaluate(() => window.__BREACH__.audio.history.includes('brute-hit'))).toBe(
    true,
  );
});
test('local co-op has simultaneous controls, independent ammo, and revival', async ({ page }) => {
  await start(page, 'coop');
  await freezeThreats(page);
  await page.keyboard.down('d');
  await page.keyboard.down('ArrowLeft');
  await expect
    .poll(() => page.evaluate(() => window.__BREACH__.game.players[0].x))
    .toBeGreaterThan(-4);
  await expect.poll(() => page.evaluate(() => window.__BREACH__.game.players[1].x)).toBeLessThan(4);
  await page.keyboard.up('d');
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.press('Period');
  await page.keyboard.down('/');
  await expect
    .poll(() => page.evaluate(() => window.__BREACH__.game.players[1].ammo[1]))
    .toBeLessThan(180);
  await page.keyboard.up('/');
  expect(await page.evaluate(() => window.__BREACH__.game.players[0].ammo[1])).toBe(180);
  await page.evaluate(() => {
    const [p, q] = window.__BREACH__.game.players;
    q.hp = 0;
    q.x = p.x + 1;
    q.z = p.z;
  });
  await page.keyboard.down('f');
  await expect
    .poll(() => page.evaluate(() => window.__BREACH__.game.players[1].hp), { timeout: 15000 })
    .toBe(50);
  await page.keyboard.up('f');
});
test('mission-driven theft fails an operation and restart resets the world', async ({ page }) => {
  await start(page, 'operations');
  await freezeThreats(page);
  await page.evaluate(() => {
    const g = window.__BREACH__.game;
    g.extracted = 3;
    g.spawn('scavenger', { x: -18, z: -4 });
    g.enemies[0].carry = true;
  });
  await expect(page.getByRole('dialog')).toContainText('ENERGY STOLEN');
  await page.locator('#retry').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => window.__BREACH__.game.extracted)).toBe(0);
});
test('all six operations complete through their final objective gates and persist', async ({
  page,
}) => {
  await start(page, 'operations');
  for (let i = 0; i < 6; i++) {
    await page.evaluate(async (i) => {
      const api = window.__BREACH__;
      await api.start({ mode: 'operations', arena: i, seed: 33 });
      api.setPaused(true);
      const g = api.game;
      g.enemies = [];
      g.spawnLeft = 0;
      g.wave = 4;
      g.bossDefeated = true; // Prepared post-boss boundary state.
      g.recovered = 5;
      g.objectives.forEach((o) => (o.active = true));
      g.escort.progress = 1;
      g.tick(1 / 60, []);
    }, i);
    await expect(page.getByRole('dialog')).toContainText('Breach contained');
  }
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('breach.save.v1')!).completed.length),
  ).toBe(6);
  await page.locator('#command').click();
  await page.locator('#records').click();
  await expect(page.getByRole('dialog')).toContainText('6/6');
});
test('deathmatch respawns players, scores five eliminations, and rematches', async ({ page }) => {
  await start(page, 'deathmatch');
  await page.evaluate(() => {
    const g = window.__BREACH__.game;
    for (let i = 0; i < 5; i++) {
      g.players[1].hp = 100;
      g.players[1].invincible = 0;
      g.damagePlayer(g.players[1], 100, 0);
    }
  });
  await expect(page.getByRole('dialog')).toContainText('OPERATOR 1 WINS');
  await page.locator('#retry').click();
  expect(await page.evaluate(() => window.__BREACH__.game.players.map((p) => p.frags))).toEqual([
    0, 0,
  ]);
});
test('volume, mute, graphics and remapped controls persist without conflicts', async ({ page }) => {
  await open(page);
  await page.locator('#settings').click();
  await page.locator('[data-bus="music"]').evaluate((el) => {
    const input = el as HTMLInputElement;
    input.value = '0.17';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.locator('#mute-all').check();
  await page.locator('[data-tab="controls"]').click();
  await page.locator('[data-bind="fire"]').click();
  await page.keyboard.press('w');
  await expect(page.locator('#binding-note')).toContainText('already in use');
  await page.locator('[data-bind="fire"]').click();
  await page.keyboard.press('j');
  await expect(page.locator('[data-bind="fire"]')).toContainText('J');
  await page.reload();
  await page.locator('#settings').click();
  await expect(page.locator('[data-bus="music"]')).toHaveValue('0.17');
  await expect(page.locator('#mute-all')).toBeChecked();
  expect(await page.evaluate(() => window.__BREACH__.save.bindings.fire)).toBe('KeyJ');
});
test('all bundled audio URLs decode and produce non-silent offline output under /breach/', async ({
  page,
}) => {
  test.setTimeout(120000);
  await open(page);
  await page.locator('#settings').click();
  await page.waitForFunction(() => window.__BREACH__.audio.ready);
  const result = await page.evaluate(async () => {
    const a = window.__BREACH__.audio;
    const failures: string[] = [];
    let count = 0;
    for (const [key, asset] of Object.entries(a.manifest)) {
      const response = await fetch('/breach/' + asset.file);
      if (!response.ok) {
        failures.push(`${key} HTTP ${response.status}`);
        continue;
      }
      const buffer = await a.ctx!.decodeAudioData(await response.arrayBuffer());
      const ctx = new OfflineAudioContext(1, buffer.length, buffer.sampleRate);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
      const rendered = await ctx.startRendering();
      const data = rendered.getChannelData(0);
      let square = 0;
      for (const n of data) square += n * n;
      if (Math.sqrt(square / data.length) < 0.002) failures.push(`${key} silent`);
      count++;
    }
    return { count, failures };
  });
  expect(result.count).toBe(124);
  expect(result.failures).toEqual([]);
});
test('audio unlock, output, live mixing, dynamic music, crossfade and voice cleanup', async ({
  page,
}) => {
  await open(page);
  expect(await page.evaluate(() => window.__BREACH__.audio.ctx)).toBeNull();
  await page.locator('#settings').click();
  await page.waitForFunction(() => window.__BREACH__.audio.ctx?.state === 'running');
  await expect
    .poll(() => page.evaluate(() => window.__BREACH__.audio.level()))
    .toBeGreaterThan(0.00001);
  await page.locator('#mute-all').check();
  await expect
    .poll(() => page.evaluate(() => window.__BREACH__.audio.level()))
    .toBeLessThan(0.00001);
  await page.locator('#mute-all').uncheck();
  await page.locator('.close-modal').click();
  await page.locator('#deploy').click();
  await freezeThreats(page);
  await expect.poll(() => page.evaluate(() => window.__BREACH__.audio.musicState)).toBe('calm');
  await page.evaluate(() => window.__BREACH__.game.spawn('boss', { x: 15, z: 0 }));
  await expect.poll(() => page.evaluate(() => window.__BREACH__.audio.musicState)).toBe('boss');
  await page.waitForTimeout(1600);
  expect(await page.evaluate(() => window.__BREACH__.audio.activeMusic)).toBeLessThanOrEqual(1);
  const output = await page.evaluate(async () => {
    const a = window.__BREACH__.audio;
    window.__BREACH__.setPaused(true);
    a.stopEffects();
    a.settings.audio.music = 0;
    a.settings.audio.environment = 0;
    a.settings.audio.combat = 0;
    a.applySettings();
    await new Promise((r) => setTimeout(r, 250));
    await a.play('shotgun');
    await new Promise((r) => setTimeout(r, 80));
    const muted = a.level();
    a.settings.audio.combat = 1;
    a.applySettings();
    await a.play('shotgun');
    await new Promise((r) => setTimeout(r, 50));
    const unmuted = a.level();
    for (let i = 0; i < 60; i++) void a.play(i % 2 ? 'walker-idle' : 'pistol');
    return { muted, unmuted, voices: a.voices.length };
  });
  expect(output.muted).toBeLessThan(0.0001);
  expect(output.unmuted).toBeGreaterThan(0.0001);
  expect(output.voices).toBeLessThanOrEqual(28);
  await page.evaluate(() => window.__BREACH__.menu());
  expect(await page.evaluate(() => window.__BREACH__.audio.voices.length)).toBe(0);
  expect(await page.evaluate(() => window.__BREACH__.audio.errors)).toEqual([]);
});
test('weapons dispatch their distinct decoded audio, explosions chain, and switching never fires', async ({
  page,
}) => {
  await start(page);
  await freezeThreats(page);
  const result = await page.evaluate(async () => {
    const api = window.__BREACH__,
      g = api.game;
    api.setPaused(true);
    const played: string[] = [];
    for (let i = 0; i < 10; i++) {
      g.equipment = [];
      const p = g.players[0];
      p.x = -5;
      p.z = 16;
      p.angle = Math.PI;
      p.cooldown = 0;
      g.switchWeapon(0, i);
      g.fire(p);
      for (const e of g.events.splice(0)) if (e.sound) await api.audio.play(e.sound, e);
      played.push(api.audio.history.at(-1)!);
      await new Promise((r) => setTimeout(r, 60));
    }
    g.events = [];
    g.switchWeapon(0, 0);
    const switching = g.events.map((e) => e.sound);
    g.players[0].weapon = 3;
    g.players[0].cooldown = 0;
    g.fire(g.players[0]);
    g.players[0].x = -3;
    g.players[0].cooldown = 0;
    g.fire(g.players[0]);
    g.explode({ x: -5, z: 14 }, 5, 200, 0);
    for (const e of g.events.splice(0)) if (e.sound) await api.audio.play(e.sound, e);
    return { played, switching, explosion: api.audio.history.includes('explosion') };
  });
  expect(result.played).toEqual([
    'pistol',
    'smg',
    'shotgun',
    'barrel',
    'grenade',
    'barricade',
    'mine',
    'rocket',
    'remote',
    'railgun',
  ]);
  expect(result.switching).toEqual(['weapon-switch']);
  expect(result.explosion).toBe(true);
});
test('captures real active combat, co-op, and remaining landmark arenas', async ({ page }) => {
  await start(page, 'coop');
  await freezeThreats(page);
  await page.evaluate(() => {
    const g = window.__BREACH__.game;
    g.wave = 3;
    g.waveDelay = -1;
    for (let i = 0; i < 10; i++)
      g.spawn(i % 3 === 0 ? 'saboteur' : 'walker', { x: -14 + i * 3, z: 5 });
    g.players[0].x = -4;
    g.players[0].z = 13;
    g.players[1].x = 5;
    g.players[1].z = 14;
    g.players[0].weapon = 1;
  });
  await page.mouse.move(500, 500);
  await page.keyboard.down('Space');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'artifacts/gameplay.png' });
  await page.keyboard.up('Space');
  for (let i = 1; i < 6; i++) {
    await page.evaluate(async (i) => {
      await window.__BREACH__.start({ arena: i, mode: 'operations', seed: 42 });
    }, i);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `artifacts/arena-${i + 1}.png` });
  }
  expect(await page.evaluate(() => window.__BREACH__.audio.errors)).toEqual([]);
});

test('campaign locks, real unlocks, upgrades, and veteran cosmetic persist', async ({ page }) => {
  await open(page);
  await page.locator('[data-mode="operations"]').click();
  await page.locator('[data-arena="1"]').click();
  await expect(page.locator('#deploy')).toBeDisabled();
  await page.locator('[data-arena="0"]').click();
  await page.locator('#deploy').click();
  await expect(page.locator('[data-weapon="9"]')).toBeDisabled();
  await page.locator('#upgrade-button').click();
  await page.locator('[data-upgrade="damage"]').click();
  expect(await page.evaluate(() => window.__BREACH__.game.players[0].upgrades.damage)).toBe(1);
  await page.locator('#upgrade-done').click();
  await page.evaluate(() => {
    const g = window.__BREACH__.game;
    g.wave = 3;
    g.beginWave();
  });
  await expect(page.locator('[data-weapon="4"]')).toBeEnabled();
  await page.evaluate(() => {
    const g = window.__BREACH__.game;
    g.enemies = [];
    g.bossDefeated = true;
    g.spawnLeft = 0;
    g.tick(1 / 60, []);
  });
  await expect(page.getByRole('dialog')).toContainText('Breach contained');
  await page.locator('#command').click();
  await page.locator('[data-arena="1"]').click();
  await expect(page.locator('#deploy')).toBeEnabled();
  await page.locator('#operator').click();
  await expect(page.locator('[data-character="2"]')).toBeEnabled();
  await page.locator('[data-character="2"]').click();
  expect(await page.evaluate(() => window.__BREACH__.save.cosmetic)).toBe(2);
});
test('restarts dispose labels, pause filters music, and the audio context suspends and resumes', async ({
  page,
}) => {
  await start(page);
  await freezeThreats(page);
  const initial = await page.evaluate(() => window.__BREACH__.world.stats.textures);
  for (let i = 0; i < 4; i++) {
    await page.evaluate(async () => {
      const api = window.__BREACH__;
      api.menu();
      await api.start({ arena: 0, mode: 'survival', seed: 42 });
      api.setPaused(true);
    });
    await page.waitForTimeout(150);
  }
  expect(await page.evaluate(() => window.__BREACH__.world.stats.textures)).toBeLessThanOrEqual(
    initial + 2,
  );
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  const states = await page.evaluate(async () => {
    const a = window.__BREACH__.audio;
    a.pause(true);
    await a.visibility(true);
    const suspended = a.ctx!.state;
    await a.visibility(false);
    a.pause(false);
    return { suspended, resumed: a.ctx!.state };
  });
  expect(states).toEqual({ suspended: 'suspended', resumed: 'running' });
  await page.evaluate(() => window.__BREACH__.menu());
  await page.waitForTimeout(1400);
  expect(
    await page.evaluate(() => ({
      voices: window.__BREACH__.audio.voices.length,
      tracks: window.__BREACH__.audio.activeMusic,
    })),
  ).toEqual({ voices: 0, tracks: 1 });
});

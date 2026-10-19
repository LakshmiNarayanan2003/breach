import { describe, expect, it } from 'vitest';
import { ARENAS, ENEMIES, WEAPONS, type EnemyKind, type PickupKind } from '../../src/core/data';
import { Game, idleInput, UPGRADES, type Input } from '../../src/core/game';
import { blocked, findPath, segmentDistance } from '../../src/core/navigation';
import { bindKey, defaults, parseSave } from '../../src/core/save';
import { spatial } from '../../src/audio/AudioManager';
function game(mode: 'survival' | 'operations' | 'coop' | 'deathmatch' = 'survival', arena = 0) {
  const g = new Game({ mode, arena, difficulty: 'normal', seed: 42 });
  g.waveDelay = Infinity;
  g.equipment = [];
  g.pickups = [];
  return g;
}
function tick(g: Game, seconds: number, inputs: Input[] = [idleInput(), idleInput()]) {
  for (let i = 0; i < seconds * 60; i++) g.tick(1 / 60, inputs);
}
describe('combat', () => {
  it('clamps health, applies invincibility, and loses on death', () => {
    const g = game(),
      p = g.players[0];
    p.invincible = 0;
    g.damagePlayer(p, 20);
    expect(p.hp).toBe(80);
    g.damagePlayer(p, 20);
    expect(p.hp).toBe(80);
    p.invincible = 0;
    g.damagePlayer(p, 100);
    g.tick(0.016, []);
    expect(g.status).toBe('defeat');
  });
  for (const [index, w] of WEAPONS.entries())
    it(`${w.id} fires its behavior, consumes ammo, enforces cooldown, and triggers distinct audio`, () => {
      const g = game(),
        p = g.players[0];
      p.weapon = index;
      g.fire(p);
      expect(g.events.some((e) => e.type === 'fire' && e.sound === w.id)).toBe(true);
      expect(p.ammo[index]).toBe(w.ammo < 0 ? -1 : w.ammo - 1);
      const count = g.events.length;
      g.fire(p);
      expect(g.events.length).toBe(count);
      if (w.speed > 0 && w.id !== 'grenade') expect(g.projectiles.length).toBe(w.pellets);
      else expect(g.equipment[0].kind).toBe(w.id);
    });
  it('empty ammunition does not fire and switching only plays handling audio', () => {
    const g = game(),
      p = g.players[0];
    p.ammo[1] = 0;
    g.switchWeapon(0, 1);
    g.fire(p);
    expect(g.projectiles).toHaveLength(0);
    expect(g.events.map((e) => e.sound)).toEqual(['weapon-switch', 'empty']);
  });
  it('bullet sweep prevents tunneling and damages the intended target', () => {
    const g = game();
    g.spawn('walker', { x: -5, z: 12 });
    g.fire(g.players[0]);
    tick(g, 0.2);
    expect(g.enemies[0].hp).toBeLessThan(ENEMIES.walker.hp);
    expect(segmentDistance({ x: 0, z: 0 }, { x: -5, z: 0 }, { x: 5, z: 0 })).toBe(0);
  });
  it('railgun pierces multiple enemies', () => {
    const g = game();
    g.players[0].weapon = 9;
    for (const z of [13, 10, 7]) g.spawn('walker', { x: -5, z });
    g.fire(g.players[0]);
    tick(g, 0.3);
    expect(g.kills).toBe(3);
  });
  it('rocket impact explodes with area damage', () => {
    const g = game();
    g.players[0].weapon = 7;
    g.spawn('walker', { x: -5, z: 12 });
    g.spawn('walker', { x: -4, z: 12 });
    g.fire(g.players[0]);
    tick(g, 0.3);
    expect(g.kills).toBe(2);
    expect(g.events.some((e) => e.type === 'explosion')).toBe(true);
  });
  it('explosive barrels chain once each without recursion overflow', () => {
    const g = new Game({ mode: 'survival', arena: 0, difficulty: 'normal', seed: 1 });
    g.waveDelay = Infinity;
    g.spawn('brute', { x: -15, z: 12 });
    g.explode({ x: -16, z: 14 }, 5, 150, 0);
    expect(g.equipment.filter((e) => e.x < 0 && e.hp > 0)).toHaveLength(0);
    expect(g.events.filter((e) => e.type === 'explosion').length).toBe(3);
    expect(g.enemies[0].hp).toBeLessThan(50);
  });
  it('grenades fuse, mines arm and trigger, charges require manual detonation', () => {
    for (const index of [4, 6, 8]) {
      const g = game(),
        p = g.players[0];
      p.weapon = index;
      g.fire(p);
      if (index === 6) g.spawn('walker', { ...g.equipment[0] });
      if (index === 8) {
        tick(g, 1);
        expect(g.events.some((e) => e.type === 'explosion')).toBe(false);
        const input = idleInput();
        input.detonate = true;
        g.tick(0.016, [input]);
      } else tick(g, 2);
      expect(g.events.some((e) => e.type === 'explosion')).toBe(true);
    }
  });
  it('deployment blocks overlap and respects limits', () => {
    const g = game(),
      p = g.players[0];
    p.weapon = 3;
    g.fire(p);
    p.cooldown = 0;
    g.fire(p);
    expect(g.equipment).toHaveLength(1);
    expect(p.ammo[3]).toBe(7);
    expect(blocked(g.equipment[0], g.obstacles)).toBe(true);
  });
  it('a barricade can be attacked and destroyed by a brute', () => {
    const g = game();
    g.players[0].weapon = 5;
    g.fire(g.players[0]);
    const b = g.equipment[0];
    g.spawn('brute', { x: b.x, z: b.z - 1.5 });
    tick(g, 4);
    expect(g.equipment).toHaveLength(0);
    expect(g.events.some((e) => e.sound === 'barricade-break')).toBe(true);
  });
  it('all upgrade types consume credits and cap at five', () => {
    const g = game(),
      p = g.players[0];
    p.credits = 99;
    for (const u of UPGRADES) {
      for (let n = 0; n < 5; n++) expect(g.upgrade(0, u)).toBe(true);
      expect(g.upgrade(0, u)).toBe(false);
    }
    expect(p.credits).toBe(54);
  });
});
describe('movement and pickups', () => {
  it('moves in two axes, collides with world geometry, and dashes on cooldown', () => {
    const g = game(),
      p = g.players[0];
    p.x = 0;
    p.z = 12;
    const input = idleInput();
    input.z = -1;
    tick(g, 2, [input]);
    expect(p.z).toBeGreaterThan(9);
    p.x = 18;
    p.z = 8;
    const before = p.z;
    input.dash = true;
    g.tick(0.016, [input]);
    expect(before - p.z).toBeGreaterThan(3);
    expect(p.dash).toBeGreaterThan(2);
  });
  for (const kind of [
    'health',
    'ammo',
    'shield',
    'damage',
    'speed',
    'rapid',
    'shockwave',
    'multiplier',
    'drone',
    'equipment',
  ] as PickupKind[])
    it(`${kind} pickup applies real effects`, () => {
      const g = game(),
        p = g.players[0];
      p.hp = 50;
      p.ammo[1] = 0;
      if (kind === 'shockwave') g.spawn('walker', { x: p.x + 2, z: p.z });
      g.applyPickup(p, kind);
      if (kind === 'health') expect(p.hp).toBe(90);
      else if (kind === 'ammo' || kind === 'equipment') expect(p.ammo[1]).toBeGreaterThan(0);
      else if (kind === 'shockwave') expect(g.kills).toBe(1);
      else expect(p.powers[kind]).toBeGreaterThan(0);
      expect(g.events.some((e) => e.sound === `pickup-${kind}`)).toBe(true);
    });
  it('shield prevents damage and temporary power-ups expire', () => {
    const g = game(),
      p = g.players[0];
    p.invincible = 0;
    g.applyPickup(p, 'shield');
    g.damagePlayer(p, 1000);
    expect(p.hp).toBe(100);
    tick(g, 13);
    expect(p.powers.shield).toBeUndefined();
  });
  it('support drone attacks without firing the player weapon', () => {
    const g = game();
    g.applyPickup(g.players[0], 'drone');
    g.spawn('walker', { x: -5, z: 10 });
    tick(g, 1.5);
    expect(g.kills).toBeGreaterThan(0);
    expect(g.events.some((e) => e.sound === 'drone')).toBe(true);
  });
});
describe('navigation and enemy missions', () => {
  it('all automatic spawn zones clear each enemy radius on every arena', () => {
    for (let arena = 0; arena < 6; arena++)
      for (const kind of Object.keys(ENEMIES) as EnemyKind[]) {
        const g = game('operations', arena);
        g.spawn(kind);
        expect(g.enemies.length).toBe(1);
        expect(blocked(g.enemies[0], g.obstacles, ENEMIES[kind].radius)).toBe(false);
      }
  });
  it('difficulty scales ranged attacks as well as melee damage', () => {
    const g = new Game({ mode: 'survival', arena: 0, difficulty: 'easy', seed: 1 });
    g.spawn('ranged', { x: 0, z: 15 });
    g.enemyShot(g.enemies[0], g.players[0], 10, 10);
    expect(g.projectiles[0].damage).toBe(7);
  });
  for (const [i, a] of ARENAS.entries())
    it(`navigates to all ${a.name} objectives`, () => {
      for (const target of a.objectives) {
        const path = findPath({ x: -18, z: 18 }, target, a.obstacles);
        expect(path.length, `${i} ${JSON.stringify(target)}`).toBeGreaterThan(0);
        expect(path.every((p) => !blocked(p, a.obstacles, 0.5))).toBe(true);
      }
    });
  it('returns no path for an enclosed target instead of walking through walls', () => {
    const obstacle = { x: 0, z: 0, w: 10, d: 10, material: 'stone' as const };
    expect(findPath({ x: 15, z: 15 }, { x: 0, z: 0 }, [obstacle])).toEqual([]);
  });
  it('scavengers collect a physical cell and actually reach a portal before extraction', () => {
    const g = game('operations');
    g.cells = [{ id: 100, x: -16, z: -3, available: true }];
    g.spawn('scavenger', { x: -16, z: -3 });
    g.tick(0.016, []);
    expect(g.enemies[0].carry).toBe(true);
    expect(g.extracted).toBe(0);
    tick(g, 3);
    expect(g.extracted).toBe(1);
    expect(g.events.some((e) => e.sound === 'extraction')).toBe(true);
  });
  it('intercepting a carrier drops its resource for recovery', () => {
    const g = game('operations');
    g.spawn('scavenger', { x: -5, z: 14 });
    g.enemies[0].carry = true;
    const count = g.cells.length;
    g.damageEnemy(g.enemies[0], 100, 0);
    expect(g.cells).toHaveLength(count + 1);
    expect(g.cells.at(-1)?.available).toBe(true);
  });
  it('saboteur actions destroy an objective while players remain alive', () => {
    const g = game('operations');
    const o = g.objectives[0];
    g.spawn('saboteur', { x: o.x + 0.5, z: o.z });
    tick(g, 13);
    expect(g.players[0].hp).toBeGreaterThan(0);
    expect(g.status).toBe('defeat');
    expect(g.reason).toContain('OBJECTIVE');
  });
  it('no arbitrary timer advances enemy extraction or sabotage', () => {
    const g = game('operations');
    tick(g, 30);
    expect(g.extracted).toBe(0);
    expect(g.objectives.every((o) => o.hp === 100)).toBe(true);
  });
  it('guardians halve damage to nearby allies', () => {
    const g = game();
    g.spawn('walker', { x: 0, z: 15 });
    g.spawn('guardian', { x: 1, z: 15 });
    g.damageEnemy(g.enemies[0], 20, 0);
    expect(g.enemies[0].hp).toBe(45);
  });
  it('ranged attackers fire, bombers telegraph, and bosses change phases', () => {
    for (const kind of ['ranged', 'bomber', 'boss'] as EnemyKind[]) {
      const g = game();
      g.spawn(kind, { x: -5, z: kind === 'bomber' ? 14 : 9 });
      const e = g.enemies[0];
      e.cooldown = 0;
      if (kind === 'boss') e.hp = e.maxHp * 0.3;
      tick(g, kind === 'bomber' ? 1.2 : 0.05);
      if (kind === 'bomber') expect(g.events.some((e) => e.sound === 'bomber-warning')).toBe(true);
      else expect(g.projectiles.length).toBeGreaterThan(0);
      if (kind === 'boss') expect(e.phase).toBe(3);
    }
  });
  it('Hampi transmitters require player interaction', () => {
    const g = game('operations', 3),
      p = g.players[0];
    Object.assign(p, g.objectives[0]);
    const input = idleInput();
    input.interact = true;
    tick(g, 2.1, [input]);
    expect(g.objectives[0].active).toBe(true);
    expect(g.objectives[1].active).toBe(false);
  });
  it('extraction threshold fails a mission even with healthy players', () => {
    const g = game('operations');
    g.extracted = 4;
    g.tick(0.016, []);
    expect(g.status).toBe('defeat');
    expect(g.players[0].hp).toBe(100);
  });
  for (let arena = 0; arena < 6; arena++)
    it(`arena ${arena + 1} enforces objective gates before victory`, () => {
      const g = game('operations', arena);
      g.wave = 4;
      g.bossDefeated = true; // Boundary fixture: final boss has already been eliminated.
      g.tick(0.016, []);
      if ([1, 3, 4].includes(arena)) expect(g.status).toBe('playing');
      g.recovered = 5;
      g.objectives.forEach((o) => (o.active = true));
      g.escort.progress = 1;
      g.tick(0.016, []);
      expect(g.status).toBe('victory');
    });
  it('escort only progresses with cargo secured and a player nearby', () => {
    const g = game('operations', 4);
    tick(g, 2);
    expect(g.escort.progress).toBe(0);
    g.recovered = 5;
    Object.assign(g.players[0], g.escort);
    tick(g, 1);
    expect(g.escort.progress).toBeGreaterThan(0);
  });
});
describe('waves and multiplayer', () => {
  it('queues a boss until a safe spawn opens and never grants victory without a boss defeat', () => {
    const g = game('coop', 2);
    Object.assign(g.players[0], { x: -18, z: 18 });
    Object.assign(g.players[1], { x: 18, z: 18 });
    g.wave = 3;
    g.beginWave();
    expect(g.bossPending).toBe(true);
    g.spawnLeft = 0;
    g.enemies = [];
    g.tick(0.016, []);
    expect(g.status).toBe('playing');
    Object.assign(g.players[0], { x: 0, z: 15 });
    g.tick(0.016, []);
    expect(g.bossPending).toBe(false);
    expect(g.enemies.some((e) => e.kind === 'boss')).toBe(true);
    g.enemies = [];
    g.tick(0.016, []);
    expect(g.status).toBe('playing');
  });
  it('campaign requisitions new equipment and deathmatch pickups grant weapons', () => {
    const g = new Game({
      mode: 'operations',
      arena: 0,
      difficulty: 'normal',
      seed: 1,
      loadout: ['pistol'],
    });
    expect([...g.unlockedWeapons]).toEqual([0]);
    g.beginWave();
    g.beginWave();
    expect(g.unlockedWeapons.has(1)).toBe(true);
    const d = new Game({ mode: 'deathmatch', arena: 0, difficulty: 'normal', seed: 1 });
    const pickup = d.pickups[0];
    d.players[0].x = pickup.x;
    d.players[0].z = pickup.z;
    d.tick(0.016, []);
    expect(d.players[0].weapon).toBe(1);
  });
  it('bullets fly across water while water remains impassable to movement', () => {
    const g = game(),
      p = g.players[0];
    p.x = -3;
    p.z = 4;
    p.angle = Math.PI / 2;
    g.spawn('walker', { x: 3, z: 4 });
    g.fire(p);
    tick(g, 0.2);
    expect(g.enemies[0].hp).toBeLessThan(55);
    expect(blocked({ x: 0, z: 4 }, g.obstacles)).toBe(true);
  });
  it('waves spawn deterministically, clear, award upgrades and increase difficulty', () => {
    const a = game(),
      b = game();
    a.beginWave();
    b.beginWave();
    tick(a, 2);
    tick(b, 2);
    expect(a.enemies.map((e) => [e.kind, e.x, e.z])).toEqual(
      b.enemies.map((e) => [e.kind, e.x, e.z]),
    );
    a.enemies = [];
    a.spawnLeft = 0;
    a.waveDelay = -1;
    tick(a, 8);
    expect(a.wave).toBe(2);
    expect(a.players[0].credits).toBe(2);
  });
  it('boss waves spawn a boss and enemy cap is respected', () => {
    const g = game();
    g.wave = 4;
    g.beginWave();
    expect(g.enemies.some((e) => e.kind === 'boss')).toBe(true);
    for (let i = 0; i < 42; i++) g.spawn('walker');
    const count = g.enemies.length;
    g.tick(0.016, []);
    expect(g.enemies.length).toBe(count);
  });
  it('co-op inputs, health and ammunition are separate', () => {
    const g = game('coop'),
      a = idleInput(),
      b = idleInput();
    a.x = 1;
    b.x = -1;
    a.fire = true;
    g.players[0].weapon = 1;
    g.tick(0.016, [a, b]);
    expect(g.players[0].x).toBeGreaterThan(-5);
    expect(g.players[1].x).toBeLessThan(5);
    expect(g.players[0].ammo[1]).toBe(179);
    expect(g.players[1].ammo[1]).toBe(180);
    g.players[0].invincible = 0;
    g.damagePlayer(g.players[0], 20);
    expect(g.players[1].hp).toBe(100);
  });
  it('co-op revives a downed partner and only fails when both are down', () => {
    const g = game('coop');
    const p = g.players[0],
      q = g.players[1];
    q.hp = 0;
    q.x = p.x + 1;
    q.z = p.z;
    const input = idleInput();
    input.interact = true;
    tick(g, 2.2, [input]);
    expect(q.hp).toBe(50);
    expect(g.status).toBe('playing');
    p.hp = 0;
    q.hp = 0;
    g.tick(0.016, []);
    expect(g.status).toBe('defeat');
  });
  it('deathmatch projectiles damage opponents and five frags finish a match', () => {
    const g = game('deathmatch');
    g.players[1].x = -5;
    g.players[1].z = 13;
    g.players[1].invincible = 0;
    g.fire(g.players[0]);
    tick(g, 0.2);
    expect(g.players[1].hp).toBe(75);
    for (let i = 0; i < 5; i++) {
      g.players[1].hp = 100;
      g.players[1].invincible = 0;
      g.damagePlayer(g.players[1], 100, 0);
    }
    expect(g.players[0].frags).toBe(5);
    expect(g.status).toBe('victory');
  });
  it('deathmatch respawns with ammo and protection', () => {
    const g = game('deathmatch');
    g.players[1].hp = 0;
    g.players[1].deadTime = 0.1;
    tick(g, 0.2);
    expect(g.players[1].hp).toBe(100);
    expect(g.players[1].invincible).toBeGreaterThan(1);
  });
});
describe('persistence and audio geometry', () => {
  it('handles corrupt and outdated saves and clamps settings', () => {
    expect(parseSave('bad')).toEqual(defaults());
    expect(parseSave('{"version":0}')).toEqual(defaults());
    expect(parseSave('{"version":1,"audio":{"music":8}}').audio.music).toBe(1);
  });
  it('round-trips progress and settings', () => {
    const s = defaults();
    s.completed = ['taj'];
    s.highScore = 2500;
    s.audio.music = 0.17;
    s.muted = true;
    expect(parseSave(JSON.stringify(s))).toEqual(s);
  });
  it('rejects conflicting and reserved keybindings', () => {
    const s = defaults();
    expect(bindKey(s, 'fire', 'KeyW')).toBe(false);
    expect(bindKey(s, 'fire', 'Escape')).toBe(false);
    expect(bindKey(s, 'fire', 'KeyJ')).toBe(true);
    expect(s.bindings.fire).toBe('KeyJ');
  });
  it('attenuates distance, pans left/right and preserves critical alerts', () => {
    const listener = { x: 0, z: 0 };
    expect(spatial({ x: 10, z: 0 }, listener).pan).toBeGreaterThan(0);
    expect(spatial({ x: -10, z: 0 }, listener).pan).toBeLessThan(0);
    expect(spatial({ x: 30, z: 0 }, listener).gain).toBeLessThan(
      spatial({ x: 1, z: 0 }, listener).gain,
    );
    expect(spatial({ x: 100, z: 100 }, listener, true).gain).toBeGreaterThanOrEqual(0.35);
  });
});

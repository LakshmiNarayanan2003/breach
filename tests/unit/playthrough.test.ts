import { expect, it } from 'vitest';
import { Game, idleInput } from '../../src/core/game';
import { distance } from '../../src/core/data';
import { findPath, blocked } from '../../src/core/navigation';
/** Full operation: no health, ammo, enemy or objective state injection.
 * A deterministic controller prioritizes saboteurs, aims, moves via A*, repairs
 * relays and collects cells using the same Input API as keyboard/gamepads. */
function runOperation(arena: number, seed: number) {
  const g = new Game({ mode: 'operations', arena, difficulty: 'easy', seed });
  let path: { x: number; z: number }[] = [];
  for (let frame = 0; frame < 60 * 240 && g.status === 'playing'; frame++) {
    const p = g.players[0],
      input = idleInput();
    if (p.credits > 0) g.upgrade(0, p.upgrades.damage < 5 ? 'damage' : 'fireRate');
    const targets = g.enemies
      .filter((e) => e.hp > 0)
      .sort((a, b) => {
        const priority = (e: typeof a) =>
          distance(p, e) +
          (e.kind === 'saboteur' && g.objectives.some((o) => o.hp < 45)
            ? -90
            : e.carry
              ? -50
              : e.kind === 'scavenger'
                ? -25
                : e.kind === 'saboteur'
                  ? -20
                  : 0);
        return priority(a) - priority(b);
      });
    const target = targets[0];
    let destination = { x: 0, z: 12 };
    if (target) {
      input.aim = { x: target.x - p.x, z: target.z - p.z };
      input.fire = true;
      const d = distance(p, target);
      const weapon =
        target.kind === 'boss' && d > 6 && p.ammo[7] > 0
          ? 7
          : target.kind === 'boss' && p.ammo[1] > 0
            ? 1
            : d < 5 && p.ammo[2] > 0
              ? 2
              : p.ammo[9] > 0
                ? 9
                : p.ammo[1] > 0
                  ? 1
                  : 0;
      if (p.weapon !== weapon) g.switchWeapon(0, weapon);
      destination = target;
      if (d < 5) {
        destination = { x: p.x + (p.x - target.x) * 2, z: p.z + (p.z - target.z) * 2 };
        input.dash = d < 2;
      }
    } else {
      const objective = g.objectives
        .filter((o) => !o.active || o.hp < 95)
        .sort((a, b) => a.hp - b.hp)[0];
      const pickup = g.pickups.find((k) => (k.kind === 'health' && p.hp < 70) || k.kind === 'ammo');
      const cell = g.cells
        .filter((c) => c.available)
        .sort((a, b) => distance(p, a) - distance(p, b))[0];
      destination =
        g.arena.id === 'gateway' && g.recovered >= 5 && g.escort.progress < 1
          ? g.escort
          : (pickup ?? objective ?? cell ?? destination);
    }
    const health = g.pickups
      .filter((k) => k.kind === 'health')
      .sort((a, b) => distance(p, a) - distance(p, b))[0];
    if (p.hp < 60 && health) destination = health;
    input.interact = true;
    if (frame % 25 === 0) path = findPath(p, destination, g.obstacles);
    while (path[0] && distance(p, path[0]) < 0.4) path.shift();
    if (path[0]) {
      input.x = path[0].x - p.x;
      input.z = path[0].z - p.z;
    }
    if (target?.kind === 'boss' && distance(p, target) < 9 && !(p.hp < 60 && health)) {
      let dx = -(target.z - p.z),
        dz = target.x - p.x;
      const len = Math.hypot(dx, dz) || 1;
      dx /= len;
      dz /= len;
      if (blocked({ x: p.x + dx * 2, z: p.z + dz * 2 }, g.obstacles)) {
        dx = -dx;
        dz = -dz;
      }
      if (!blocked({ x: p.x + dx * 2, z: p.z + dz * 2 }, g.obstacles)) {
        input.x = dx;
        input.z = dz;
      }
      input.dash = g.projectiles.some((b) => b.owner < 0 && distance(b, p) < 2.5);
    }
    const danger = g.projectiles.find((b) => b.owner < 0 && distance(b, p) < 3);
    if (danger) {
      const l = Math.hypot(danger.vx, danger.vz) || 1;
      let dx = -danger.vz / l,
        dz = danger.vx / l;
      if (blocked({ x: p.x + dx * 2, z: p.z + dz * 2 }, g.obstacles)) {
        dx = -dx;
        dz = -dz;
      }
      input.x = dx;
      input.z = dz;
      input.dash = true;
    }
    g.tick(1 / 60, [input]);
  }
  return g;
}
// Fixed successful input-controller fixtures; failure remains an assertion failure.
for (let arena = 0; arena < 6; arena++)
  it(`completes arena ${arena + 1} through real waves, combat and player inputs`, () => {
    const g = runOperation(arena, arena === 3 ? 75 : 73);
    expect(
      { status: g.status, wave: g.wave },
      JSON.stringify({
        reason: g.reason,
        time: g.time,
        health: g.players[0].hp,
        relays: g.objectives.map((o) => o.hp),
        enemies: g.enemies.length,
      }),
    ).toEqual({ status: 'victory', wave: 4 });
  });

import { type Obstacle, type Vec, distance } from './data';
export function blocked(p: Vec, obstacles: Obstacle[], radius = 0.55): boolean {
  return (
    Math.abs(p.x) > 21 - radius ||
    p.z < -19 + radius ||
    p.z > 21 - radius ||
    obstacles.some(
      (o) => Math.abs(p.x - o.x) < o.w / 2 + radius && Math.abs(p.z - o.z) < o.d / 2 + radius,
    )
  );
}
/** Bounded 4-neighbour A*. Grid cells are 1 world unit; routes are cached by each agent. */
export function findPath(start: Vec, goal: Vec, obstacles: Obstacle[], radius = 0.5): Vec[] {
  const key = (x: number, z: number) => `${x},${z}`;
  const sx = Math.round(start.x),
    sz = Math.round(start.z);
  let gx = Math.round(goal.x),
    gz = Math.round(goal.z);
  if (blocked({ x: gx, z: gz }, obstacles, radius)) {
    const candidates: Vec[] = [];
    for (let x = gx - 3; x <= gx + 3; x++)
      for (let z = gz - 3; z <= gz + 3; z++)
        if (!blocked({ x, z }, obstacles, radius)) candidates.push({ x, z });
    candidates.sort((a, b) => distance(a, goal) - distance(b, goal));
    if (!candidates[0]) return [];
    gx = candidates[0].x;
    gz = candidates[0].z;
  }
  const open = [{ x: sx, z: sz, g: 0, f: 0 }],
    scores = new Map<string, number>([[key(sx, sz), 0]]),
    parents = new Map<string, Vec>(),
    closed = new Set<string>();
  for (let iterations = 0; open.length && iterations < 1700; iterations++) {
    let best = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[best].f) best = i;
    const n = open.splice(best, 1)[0],
      k = key(n.x, n.z);
    if (closed.has(k)) continue;
    closed.add(k);
    if (n.x === gx && n.z === gz) {
      const path: Vec[] = [{ x: gx, z: gz }];
      let cursor = k;
      while (parents.has(cursor)) {
        const p = parents.get(cursor)!;
        path.push(p);
        cursor = key(p.x, p.z);
      }
      return path.reverse().slice(1);
    }
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const x = n.x + dx,
        z = n.z + dz,
        nk = key(x, z),
        g = n.g + 1;
      if (
        blocked({ x, z }, obstacles, radius) ||
        closed.has(nk) ||
        (scores.get(nk) ?? Infinity) <= g
      )
        continue;
      scores.set(nk, g);
      parents.set(nk, { x: n.x, z: n.z });
      open.push({ x, z, g, f: g + Math.abs(x - gx) + Math.abs(z - gz) });
    }
  }
  return [];
}
export function move(entity: Vec, dx: number, dz: number, obstacles: Obstacle[], radius = 0.5) {
  if (!blocked({ x: entity.x + dx, z: entity.z }, obstacles, radius)) entity.x += dx;
  if (!blocked({ x: entity.x, z: entity.z + dz }, obstacles, radius)) entity.z += dz;
}
export function segmentDistance(p: Vec, a: Vec, b: Vec) {
  const dx = b.x - a.x,
    dz = b.z - a.z,
    den = dx * dx + dz * dz;
  const t = den === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / den));
  return Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t);
}

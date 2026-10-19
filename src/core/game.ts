import {
  ARENAS,
  WEAPONS,
  ENEMIES,
  PICKUPS,
  Random,
  clamp,
  distance,
  type Arena,
  type Difficulty,
  type EnemyKind,
  type Mode,
  type Obstacle,
  type PickupKind,
  type Vec,
  type WeaponKind,
} from './data';
import { blocked, findPath, move, segmentDistance } from './navigation';
export interface Input {
  x: number;
  z: number;
  aim: Vec;
  fire: boolean;
  dash: boolean;
  interact: boolean;
  detonate: boolean;
}
export const idleInput = (): Input => ({
  x: 0,
  z: 0,
  aim: { x: 0, z: -1 },
  fire: false,
  dash: false,
  interact: false,
  detonate: false,
});
export interface Player extends Vec {
  id: number;
  hp: number;
  maxHp: number;
  angle: number;
  weapon: number;
  ammo: number[];
  cooldown: number;
  dash: number;
  invincible: number;
  moving: boolean;
  step: number;
  deadTime: number;
  frags: number;
  revive: number;
  credits: number;
  upgrades: Record<Upgrade, number>;
  powers: Partial<Record<PickupKind, number>>;
}
export const UPGRADES = [
  'damage',
  'fireRate',
  'capacity',
  'accuracy',
  'projectiles',
  'penetration',
  'blast',
  'deployment',
  'recharge',
] as const;
export type Upgrade = (typeof UPGRADES)[number];
export interface Enemy extends Vec {
  id: number;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  angle: number;
  cooldown: number;
  state: string;
  path: Vec[];
  nav: number;
  carry: boolean;
  phase: number;
  warn: number;
  hit: number;
  voice: number;
}
export interface Projectile extends Vec {
  id: number;
  owner: number;
  kind: WeaponKind | 'enemy';
  vx: number;
  vz: number;
  damage: number;
  life: number;
  radius: number;
  penetration: number;
  hit: Set<number>;
}
export interface Equipment extends Vec {
  id: number;
  kind: 'barrel' | 'barricade' | 'mine' | 'remote' | 'grenade';
  hp: number;
  owner: number;
  fuse: number;
  radius: number;
  damage: number;
  vx: number;
  vz: number;
  age: number;
}
export interface Pickup extends Vec {
  id: number;
  kind: PickupKind;
  life: number;
  weapon?: number;
}
export interface Objective extends Vec {
  id: number;
  hp: number;
  active: boolean;
  progress: number;
  underAttack: number;
}
export interface Cell extends Vec {
  id: number;
  available: boolean;
}
export interface GameEvent extends Vec {
  type: string;
  sound?: string;
  value?: number;
  text?: string;
  owner?: number;
}
export interface GameOptions {
  arena: number;
  mode: Mode;
  difficulty: Difficulty;
  seed: number;
  loadout?: WeaponKind[];
}
export class Game {
  unlockedWeapons = new Set<number>();
  arena: Arena;
  rng: Random;
  players: Player[] = [];
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  equipment: Equipment[] = [];
  pickups: Pickup[] = [];
  objectives: Objective[] = [];
  cells: Cell[] = [];
  events: GameEvent[] = [];
  status: 'playing' | 'victory' | 'defeat' = 'playing';
  reason = '';
  time = 0;
  wave = 0;
  score = 0;
  kills = 0;
  streak = 0;
  streakTime = 0;
  extracted = 0;
  recovered = 0;
  waveDelay = 2.5;
  spawnLeft = 0;
  spawnTimer = 0;
  bossDefeated = false;
  bossPending = false;
  escort = { x: 0, z: 15, progress: 0 };
  alert = 'BREACH DETECTED';
  alertUntil = 4;
  nextId = 10;
  difficulty: number;
  constructor(public options: GameOptions) {
    this.unlockedWeapons = new Set(
      WEAPONS.map((w, i) => (!options.loadout || options.loadout.includes(w.id) ? i : -1)).filter(
        (i) => i >= 0,
      ),
    );
    this.unlockedWeapons.add(0);
    this.arena = ARENAS[options.arena] ?? ARENAS[0];
    this.rng = new Random(options.seed);
    this.difficulty = { easy: 0.7, normal: 1, hard: 1.35 }[options.difficulty];
    const count = options.mode === 'coop' || options.mode === 'deathmatch' ? 2 : 1;
    for (let i = 0; i < count; i++)
      this.players.push({
        id: i,
        x: i ? 5 : -5,
        z: 16,
        hp: 100,
        maxHp: 100,
        angle: Math.PI,
        weapon: 0,
        ammo: WEAPONS.map((w) => w.ammo),
        cooldown: 0,
        dash: 0,
        invincible: 2,
        moving: false,
        step: 0,
        deadTime: 0,
        frags: 0,
        revive: 0,
        credits: 1,
        upgrades: Object.fromEntries(UPGRADES.map((u) => [u, 0])) as Record<Upgrade, number>,
        powers: {},
      });
    this.objectives = this.arena.objectives.map((p, i) => ({
      ...p,
      id: i,
      hp: 100,
      active: this.arena.id !== 'hampi',
      progress: 0,
      underAttack: 0,
    }));
    for (let i = 0; i < 8; i++) {
      let p = this.freeSpot();
      for (let attempt = 0; attempt < 100; attempt++) {
        if (p.z > 0 && Math.abs(p.x) < 14 && this.cells.every((c) => distance(c, p) > 2)) break;
        p = this.freeSpot();
      }
      this.cells.push({ ...p, id: this.nextId++, available: true });
    }
    for (const p of [
      { x: -16, z: 14 },
      { x: -16, z: 11 },
      { x: 16, z: 14 },
      { x: 16, z: 11 },
    ])
      if (!blocked(p, this.arena.obstacles))
        this.equipment.push({
          id: this.nextId++,
          kind: 'barrel',
          ...p,
          hp: 35,
          owner: -1,
          fuse: -1,
          radius: 5,
          damage: 110,
          vx: 0,
          vz: 0,
          age: 0,
        });
    for (let i = 0; i < 4; i++)
      this.pickups.push({
        id: this.nextId++,
        ...this.freeSpot(),
        kind: options.mode === 'deathmatch' ? 'ammo' : i % 2 ? 'ammo' : 'health',
        life: 120,
        weapon: options.mode === 'deathmatch' ? [1, 2, 7, 9][i] : undefined,
      });
    if (options.mode === 'deathmatch') {
      this.waveDelay = Infinity;
      this.cells = [];
      this.objectives = [];
      this.alert = 'FIRST TO 5 ELIMINATIONS';
    }
  }
  get tactical() {
    return this.options.mode === 'operations' || this.options.mode === 'coop';
  }
  get obstacles(): Obstacle[] {
    return [
      ...this.arena.obstacles,
      ...this.equipment
        .filter((e) => e.hp > 0 && (e.kind === 'barrel' || e.kind === 'barricade'))
        .map((e) => ({
          x: e.x,
          z: e.z,
          w: e.kind === 'barricade' ? 2.6 : 1,
          d: 1,
          material: 'metal' as const,
        })),
    ];
  }
  freeSpot(): Vec {
    for (let i = 0; i < 200; i++) {
      const p = { x: (this.rng.next() - 0.5) * 36, z: this.rng.next() * 32 - 14 };
      if (!blocked(p, this.arena.obstacles, 1)) return p;
    }
    return { x: 0, z: 18 };
  }
  emit(type: string, p: Vec, sound?: string, value?: number, text?: string, owner?: number) {
    this.events.push({ ...p, type, sound, value, text, owner });
    if (this.events.length > 512) this.events.shift();
  }
  notice(text: string, sound = 'objective-alert', p: Vec = { x: 0, z: 0 }) {
    this.alert = text;
    this.alertUntil = this.time + 4;
    this.emit('alert', p, sound, undefined, text);
  }
  switchWeapon(player: number, index: number) {
    const p = this.players[player];
    if (!p || p.hp <= 0) return;
    let chosen = (index + WEAPONS.length) % WEAPONS.length;
    const direction = index < p.weapon ? -1 : 1;
    for (let i = 0; i < 10 && !this.unlockedWeapons.has(chosen); i++)
      chosen = (chosen + direction + 10) % 10;
    p.weapon = chosen;
    p.cooldown = Math.min(p.cooldown, 0.08);
    this.emit('switch', p, 'weapon-switch', undefined, undefined, p.id);
  }
  upgrade(player: number, kind: Upgrade) {
    const p = this.players[player];
    if (!p || p.credits <= 0 || p.upgrades[kind] >= 5) return false;
    p.credits--;
    p.upgrades[kind]++;
    if (kind === 'capacity')
      p.ammo = p.ammo.map((a, i) =>
        a < 0 ? a : Math.min(a + Math.ceil(WEAPONS[i].ammo * 0.2), this.capacity(p, i)),
      );
    this.emit('upgrade', p, 'upgrade');
    return true;
  }
  capacity(p: Player, index: number) {
    return Math.ceil(WEAPONS[index].ammo * (1 + p.upgrades.capacity * 0.25));
  }
  fire(p: Player) {
    if (p.hp <= 0 || p.cooldown > 0) return;
    const w = WEAPONS[p.weapon];
    if (p.ammo[p.weapon] === 0) {
      p.cooldown = 0.3;
      this.emit('empty', p, 'empty');
      return;
    }
    const dx = Math.sin(p.angle),
      dz = Math.cos(p.angle),
      origin = { x: p.x + dx * 1.25, z: p.z + dz * 1.25 };
    const damage = w.damage * (1 + p.upgrades.damage * 0.2) * (p.powers.damage ? 2 : 1),
      radius = w.radius * (1 + p.upgrades.blast * 0.12);
    if (['barrel', 'barricade', 'mine', 'remote'].includes(w.id)) {
      const spot = { x: p.x + dx * 2.1, z: p.z + dz * 2.1 };
      if (
        blocked(spot, this.obstacles, w.id === 'barricade' ? 1.4 : 0.7) ||
        this.players.some((q) => distance(q, spot) < 1.4) ||
        this.equipment.filter((e) => e.owner === p.id && e.kind === w.id).length >=
          6 + p.upgrades.deployment * 2
      ) {
        p.cooldown = 0.25;
        this.notice('PLACEMENT BLOCKED / DEPLOYMENT LIMIT', 'empty', p);
        return;
      }
      this.equipment.push({
        id: this.nextId++,
        kind: w.id as Equipment['kind'],
        ...spot,
        hp: w.id === 'barricade' ? 220 : 35,
        owner: p.id,
        fuse: w.id === 'mine' ? 0.8 : -1,
        radius,
        damage,
        vx: 0,
        vz: 0,
        age: 0,
      });
    } else if (w.id === 'grenade')
      this.equipment.push({
        id: this.nextId++,
        kind: 'grenade',
        ...origin,
        hp: 1,
        owner: p.id,
        fuse: 1.4,
        radius,
        damage,
        vx: dx * 12,
        vz: dz * 12,
        age: 0,
      });
    else {
      const count =
        w.pellets +
        (w.id === 'shotgun' ? p.upgrades.projectiles : Math.floor(p.upgrades.projectiles / 2));
      for (let i = 0; i < count; i++) {
        const spread = w.spread / (1 + p.upgrades.accuracy * 0.3),
          a =
            p.angle +
            (this.rng.next() - 0.5) * spread * 2 +
            (count > 1 && w.id !== 'shotgun' ? (i - (count - 1) / 2) * 0.08 : 0);
        this.projectiles.push({
          id: this.nextId++,
          owner: p.id,
          kind: w.id,
          ...origin,
          vx: Math.sin(a) * w.speed,
          vz: Math.cos(a) * w.speed,
          damage,
          life: w.id === 'shotgun' ? 0.42 : 1.4,
          radius,
          penetration:
            w.id === 'railgun'
              ? 4 + p.upgrades.penetration
              : 1 + Math.floor(p.upgrades.penetration / 3),
          hit: new Set(),
        });
      }
    }
    if (p.ammo[p.weapon] > 0) p.ammo[p.weapon]--;
    p.cooldown =
      w.cooldown /
      (1 + p.upgrades.fireRate * 0.12 + p.upgrades.recharge * 0.08) /
      (p.powers.rapid ? 1.8 : 1);
    this.emit('fire', origin, w.id, undefined, undefined, p.id);
  }
  damagePlayer(p: Player, amount: number, owner = -1) {
    if (p.hp <= 0 || p.invincible > 0) return;
    if (p.powers.shield) {
      this.emit('shield', p, 'shield-hit');
      p.invincible = 0.2;
      return;
    }
    p.hp = Math.max(0, p.hp - amount);
    p.invincible = 0.35;
    this.emit('damage', p, 'player-hit', amount);
    if (p.hp === 0) {
      this.emit('death', p, 'player-death');
      p.deadTime = 3;
      if (this.options.mode === 'deathmatch' && owner >= 0 && owner !== p.id) {
        this.players[owner].frags++;
        if (this.players[owner].frags >= 5)
          this.finish(true, `OPERATOR ${owner + 1} WINS · 5 ELIMINATIONS`);
      }
    } else if (p.hp < 25) this.notice(`OPERATOR ${p.id + 1} · HEALTH CRITICAL`, 'low-health', p);
  }
  damageEnemy(e: Enemy, damage: number, owner: number) {
    if (e.hp <= 0) return;
    const guarded =
      e.kind !== 'guardian' &&
      this.enemies.some((g) => g.hp > 0 && g.kind === 'guardian' && distance(g, e) < 4);
    e.hp -= damage * (guarded ? 0.5 : 1);
    e.hit = 0.15;
    this.emit('hit', e, `${e.kind}-hit`, damage);
    if (e.state === 'Sabotage') {
      e.cooldown = Math.max(e.cooldown, 0.8);
      this.notice('SABOTAGE INTERRUPTED', 'sabotage-interrupt', e);
    }
    if (e.hp <= 0) {
      this.kills++;
      this.streak++;
      this.streakTime = 3;
      const p = this.players[owner];
      this.score += Math.round(
        ENEMIES[e.kind].score *
          (p?.powers.multiplier ? 2 : 1) *
          (1 + Math.min(this.streak, 20) * 0.05),
      );
      this.emit('death', e, `${e.kind}-death`);
      if (e.carry) this.cells.push({ id: this.nextId++, ...{ x: e.x, z: e.z }, available: true });
      if (this.rng.next() < 0.32)
        this.pickups.push({
          id: this.nextId++,
          x: e.x,
          z: e.z,
          kind: PICKUPS[Math.floor(this.rng.next() * PICKUPS.length)],
          life: 25,
        });
      if (e.kind === 'boss') {
        this.bossDefeated = true;
        this.notice('SOVEREIGN ELIMINATED', 'boss-defeat', e);
      }
    }
  }
  explode(origin: Vec, radius: number, damage: number, owner: number, seen = new Set<number>()) {
    this.emit('explosion', origin, 'explosion', radius);
    const obs = this.obstacles;
    for (const e of this.enemies) {
      const d = distance(e, origin);
      if (e.hp > 0 && d < radius) {
        this.damageEnemy(e, damage * (1 - (d / radius) * 0.65), owner);
        if (d > 0.1)
          move(
            e,
            ((e.x - origin.x) / d) * 1.5,
            ((e.z - origin.z) / d) * 1.5,
            obs,
            ENEMIES[e.kind].radius,
          );
      }
    }
    for (const p of this.players) {
      const d = distance(p, origin);
      if (d < radius) {
        const friendly = this.options.mode !== 'deathmatch' && owner >= 0;
        this.damagePlayer(p, damage * (friendly ? 0.18 : 0.65) * (1 - (d / radius) * 0.5), owner);
        if (d > 0.1) move(p, (p.x - origin.x) / d, (p.z - origin.z) / d, obs);
      }
    }
    for (const item of this.equipment) {
      if (item.hp <= 0 || seen.has(item.id) || distance(origin, item) > radius) continue;
      seen.add(item.id);
      item.hp -= damage;
      if (item.hp <= 0) {
        if (item.kind === 'barricade') this.emit('break', item, 'barricade-break');
        else this.explode(item, item.radius, item.damage, owner, seen);
      }
    }
  }
  applyPickup(p: Player, kind: PickupKind) {
    if (kind === 'health') p.hp = Math.min(p.maxHp, p.hp + 40);
    else if (kind === 'ammo' || kind === 'equipment')
      p.ammo = p.ammo.map((a, i) =>
        a < 0
          ? a
          : Math.min(
              this.capacity(p, i),
              a + Math.ceil(this.capacity(p, i) * (kind === 'equipment' ? 0.6 : 0.35)),
            ),
      );
    else if (kind === 'shockwave') this.explode(p, 8, 140, p.id);
    else p.powers[kind] = kind === 'drone' ? 24 : 12;
    this.emit('pickup', p, `pickup-${kind}`);
    this.notice(
      `${kind.toUpperCase()} ${['health', 'ammo', 'equipment', 'shockwave'].includes(kind) ? 'COLLECTED' : 'ACTIVE'}`,
      `pickup-${kind}`,
      p,
    );
  }
  spawn(kind: EnemyKind, pos?: Vec) {
    const def = ENEMIES[kind];
    let p = pos;
    if (!p) {
      const portals = [
        { x: -18, z: -4 },
        { x: 18, z: -4 },
        { x: -18, z: 18 },
        { x: 18, z: 18 },
      ];
      const safe = portals.filter(
        (v) =>
          !blocked(v, this.obstacles, def.radius) &&
          this.players.every((q) => q.hp <= 0 || distance(q, v) > 6),
      );
      if (!safe.length) return;
      p = safe[Math.floor(this.rng.next() * safe.length)];
    }
    const hp = def.hp * this.difficulty * (1 + Math.max(0, this.wave - 4) * 0.08);
    this.enemies.push({
      id: this.nextId++,
      kind,
      x: p.x,
      z: p.z,
      hp,
      maxHp: hp,
      angle: 0,
      cooldown: 1,
      state: 'Chase',
      path: [],
      nav: 0,
      carry: false,
      phase: 1,
      warn: 0,
      hit: 0,
      voice: 2 + this.rng.next() * 5,
    });
    this.emit('spawn', p, `${kind}-spawn`);
  }
  beginWave() {
    this.wave++;
    if (this.wave > 1 && this.unlockedWeapons.size < 10) {
      const next = WEAPONS.findIndex((_, i) => !this.unlockedWeapons.has(i));
      this.unlockedWeapons.add(next);
      this.notice(`${WEAPONS[next].name.toUpperCase()} REQUISITIONED`, 'upgrade');
    }
    this.spawnLeft = Math.min(40, 4 + this.wave * 3 + (this.players.length - 1) * 3);
    this.spawnTimer = 0;
    const labels = [
      'BREACH DETECTED',
      'RUNNER ASSAULT',
      'HEAVY ATTACK',
      'SABOTAGE ATTEMPT',
      'SUPPLY DROP',
      'ELITE ENCOUNTER',
    ];
    this.notice(
      `WAVE ${String(this.wave).padStart(2, '0')} · ${this.wave % 5 === 0 || (this.tactical && this.wave === 4) ? 'BOSS INCURSION' : labels[(this.wave - 1) % 6]}`,
      'wave',
    );
    if (this.wave % 5 === 0 || (this.tactical && this.wave === 4)) {
      const before = this.enemies.length;
      this.spawn('boss');
      this.bossPending = this.enemies.length === before;
    }
    if (this.wave % 5 === 0)
      for (let i = 0; i < 4; i++)
        this.pickups.push({ id: this.nextId++, ...this.freeSpot(), kind: 'ammo', life: 60 });
  }
  chooseEnemy(): EnemyKind {
    if (this.tactical && this.spawnLeft % 3 === 0)
      return this.spawnLeft % 2 === 0 ? 'saboteur' : 'scavenger';
    const stage = (this.wave - 1) % 6;
    const pool: EnemyKind[] =
      stage === 1
        ? ['runner', 'runner', 'runner', 'walker']
        : stage === 2
          ? ['brute', 'brute', 'walker']
          : stage === 3 && this.tactical
            ? ['saboteur', 'scavenger', 'guardian']
            : stage === 5
              ? ['guardian', 'brute', 'bomber']
              : ['walker', 'walker', 'runner'];
    if (this.wave >= 2) pool.push('ranged', 'saboteur', 'scavenger');
    if (this.wave >= 3) pool.push('brute', 'guardian', 'bomber');
    return pool[Math.floor(this.rng.next() * pool.length)];
  }
  finish(victory: boolean, reason: string) {
    if (this.status !== 'playing') return;
    this.status = victory ? 'victory' : 'defeat';
    this.reason = reason;
    this.emit('finish', { x: 0, z: 0 }, victory ? 'victory' : 'defeat', undefined, reason);
  }
  tick(dt: number, inputs: Input[]) {
    if (this.status !== 'playing') return;
    dt = clamp(dt, 0, 0.05);
    this.time += dt;
    this.streakTime -= dt;
    if (this.streakTime <= 0) this.streak = 0;
    const obstacles = this.obstacles;
    for (const p of this.players) {
      const input = inputs[p.id] ?? idleInput();
      p.cooldown -= dt;
      p.dash -= dt;
      p.invincible -= dt;
      if (p.hp <= 0) {
        if (this.options.mode === 'deathmatch') {
          p.deadTime -= dt;
          if (p.deadTime <= 0) {
            Object.assign(p, this.freeSpot());
            p.hp = p.maxHp;
            p.invincible = 2;
            p.ammo = WEAPONS.map((w) => w.ammo);
            this.emit('respawn', p, 'respawn');
          }
        }
        continue;
      }
      for (const key of Object.keys(p.powers) as PickupKind[]) {
        p.powers[key]! -= dt;
        if (p.powers[key]! <= 0) {
          delete p.powers[key];
          this.emit('expire', p, 'power-expire');
        }
      }
      const len = Math.hypot(input.x, input.z),
        speed = 7 * (p.powers.speed ? 1.5 : 1);
      p.moving = len > 0.05;
      if (input.dash && p.dash <= 0 && len > 0.05) {
        p.dash = 2.5 / (1 + p.upgrades.recharge * 0.1);
        p.invincible = 0.25;
        for (let i = 0; i < 10; i++)
          move(
            p,
            (input.x / Math.max(1, len)) * 0.4,
            (input.z / Math.max(1, len)) * 0.4,
            obstacles,
          );
        this.emit('dash', p, 'dash');
      }
      move(
        p,
        (input.x / Math.max(1, len)) * speed * dt,
        (input.z / Math.max(1, len)) * speed * dt,
        obstacles,
      );
      if (Math.hypot(input.aim.x, input.aim.z) > 0.01)
        p.angle = Math.atan2(input.aim.x, input.aim.z);
      if (p.moving) {
        p.step -= dt;
        if (p.step <= 0) {
          this.emit(
            'step',
            p,
            this.arena.id === 'gateway'
              ? 'step-metal'
              : this.arena.id === 'hampi'
                ? 'step-ground'
                : 'step-stone',
          );
          p.step = 0.3;
        }
      }
      if (input.fire) this.fire(p);
      if (input.detonate) {
        for (const e of this.equipment.filter(
          (e) => e.owner === p.id && e.kind === 'remote' && e.hp > 0,
        )) {
          e.hp = 0;
          this.emit('detonate', e, 'remote-trigger');
          this.explode(e, e.radius, e.damage, p.id);
        }
      }
      if (input.interact) {
        for (const o of this.objectives)
          if (distance(p, o) < 2.5) {
            o.progress += dt;
            if (!o.active && o.progress >= 2) {
              o.active = true;
              o.hp = 100;
              this.notice('TRANSMITTER ONLINE', 'objective-restored', o);
            }
            if (o.active) o.hp = Math.min(100, o.hp + dt * 8);
          }
        for (const c of this.cells)
          if (c.available && distance(c, p) < 2) {
            c.available = false;
            this.recovered++;
            this.emit('collect', c, 'resource-collected');
          }
        for (const q of this.players)
          if (q.id !== p.id && q.hp <= 0 && distance(p, q) < 2.5 && this.options.mode === 'coop') {
            q.revive += dt;
            if (q.revive >= 2) {
              q.hp = 50;
              q.invincible = 3;
              q.revive = 0;
              this.notice(`OPERATOR ${q.id + 1} REVIVED`, 'respawn', q);
            }
          }
      }
      for (const pickup of this.pickups)
        if (pickup.life > 0 && distance(p, pickup) < 1.2) {
          this.applyPickup(p, pickup.kind);
          if (pickup.weapon !== undefined) {
            this.unlockedWeapons.add(pickup.weapon);
            this.switchWeapon(p.id, pickup.weapon);
            this.notice(`${WEAPONS[pickup.weapon].name.toUpperCase()} ACQUIRED`, 'upgrade');
          }
          pickup.life = 0;
        }
      if (p.powers.drone && Math.floor(this.time * 3) !== Math.floor((this.time - dt) * 3)) {
        const e = this.enemies.find((e) => e.hp > 0 && distance(e, p) < 12);
        if (e) {
          this.damageEnemy(e, 18, p.id);
          this.emit('drone-shot', e, 'drone');
        }
      }
    }
    for (const o of this.objectives) o.underAttack = Math.max(0, o.underAttack - dt);
    for (const e of this.enemies) if (e.hp > 0) this.tickEnemy(e, dt, obstacles);
    this.tickProjectiles(dt);
    for (const item of this.equipment) {
      if (item.hp <= 0) continue;
      item.age += dt;
      if (item.kind === 'grenade') {
        item.fuse -= dt;
        const before = { x: item.x, z: item.z };
        move(item, item.vx * dt, item.vz * dt, this.arena.obstacles, 0.2);
        if (distance(before, item) < Math.hypot(item.vx, item.vz) * dt * 0.5) {
          item.vx *= -0.4;
          item.vz *= -0.4;
          this.emit('bounce', item, 'grenade-bounce');
        }
        item.vx *= 1 - dt * 0.8;
        item.vz *= 1 - dt * 0.8;
        if (item.fuse <= 0) {
          item.hp = 0;
          this.explode(item, item.radius, item.damage, item.owner);
        }
      }
      if (item.kind === 'mine') {
        item.fuse -= dt;
        if (
          item.fuse <= 0 &&
          (this.enemies.some((e) => e.hp > 0 && distance(e, item) < 2) ||
            (this.options.mode === 'deathmatch' &&
              this.players.some((p) => p.id !== item.owner && p.hp > 0 && distance(p, item) < 2)))
        ) {
          item.hp = 0;
          this.emit('trigger', item, 'mine-trigger');
          this.explode(item, item.radius, item.damage, item.owner);
        }
      }
    }
    this.enemies = this.enemies.filter((e) => e.hp > 0);
    this.equipment = this.equipment.filter((e) => e.hp > 0);
    this.projectiles = this.projectiles.filter((p) => p.life > 0).slice(-350);
    this.pickups = this.pickups.filter((p) => (p.life -= dt) > 0).slice(-35);
    if (this.players.every((p) => p.hp <= 0) && this.options.mode !== 'deathmatch')
      this.finish(false, 'RESPONSE TEAM LOST');
    if (this.options.mode === 'deathmatch') {
      if (Math.floor(this.time / 10) > Math.floor((this.time - dt) / 10))
        this.pickups.push({
          id: this.nextId++,
          ...this.freeSpot(),
          kind: PICKUPS[Math.floor(this.rng.next() * PICKUPS.length)],
          life: 40,
          weapon: Math.floor(this.rng.next() * 10),
        });
      return;
    }
    if (this.tactical) {
      if (this.objectives.some((o) => o.hp <= 0))
        this.finish(false, 'MISSION FAILED · OBJECTIVE DESTROYED');
      if (this.extracted >= 4) this.finish(false, 'MISSION FAILED · ENERGY STOLEN');
      if (this.arena.id === 'gateway') {
        const escorting = this.players.some((p) => p.hp > 0 && distance(p, this.escort) < 5);
        if (escorting && this.recovered >= 5) {
          this.escort.progress = Math.min(1, this.escort.progress + dt / 20);
          this.escort.z = 15 - this.escort.progress * 13;
        }
      }
    }
    if (this.bossPending && this.enemies.length < 42) {
      const before = this.enemies.length;
      this.spawn('boss');
      if (this.enemies.length > before) this.bossPending = false;
    }
    if (this.spawnLeft > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.enemies.length < 42) {
        const before = this.enemies.length;
        this.spawn(this.chooseEnemy());
        if (this.enemies.length > before) this.spawnLeft--;
        this.spawnTimer = 0.65;
      }
    } else if (this.enemies.length === 0 && !this.bossPending) {
      if (this.tactical && this.wave >= 4) {
        const signal = this.arena.id !== 'hampi' || this.objectives.every((o) => o.active);
        const cargo = !['hawa', 'gateway'].includes(this.arena.id) || this.recovered >= 5;
        const escort = this.arena.id !== 'gateway' || this.escort.progress >= 1;
        if (signal && cargo && escort && this.bossDefeated) this.finish(true, 'BREACH CONTAINED');
        else if (this.alertUntil < this.time)
          this.notice(
            !cargo
              ? 'RECOVER THE REMAINING ENERGY CELLS'
              : !signal
                ? 'ACTIVATE ALL TRANSMITTERS'
                : 'ESCORT DRONE TO EXTRACTION',
            'objective-alert',
          );
      } else {
        if (this.waveDelay === -1) {
          this.waveDelay = 7;
          for (const p of this.players) {
            p.credits++;
            p.ammo = p.ammo.map((a, i) =>
              a < 0 ? a : Math.min(this.capacity(p, i), a + Math.ceil(this.capacity(p, i) * 0.2)),
            );
          }
          this.notice('SECTOR CLEAR · UPGRADE AVAILABLE', 'upgrade');
        }
        this.waveDelay -= dt;
        if (this.waveDelay <= 0) {
          this.beginWave();
          this.waveDelay = -1;
        }
      }
    }
  }
  tickEnemy(e: Enemy, dt: number, obstacles: Obstacle[]) {
    e.cooldown -= dt;
    e.nav -= dt;
    e.hit = Math.max(0, e.hit - dt);
    e.voice -= dt;
    if (e.voice <= 0) {
      this.emit('voice', e, `${e.kind}-idle`);
      e.voice = 5 + this.rng.next() * 5;
    }
    const living = this.players.filter((p) => p.hp > 0);
    const p = living.sort((a, b) => distance(e, a) - distance(e, b))[0];
    if (!p) return;
    let target: Vec = p;
    e.state = 'Chase';
    const def = ENEMIES[e.kind];
    if (e.kind === 'saboteur' && this.tactical) {
      const o = this.objectives
        .filter((o) => o.hp > 0)
        .sort((a, b) => distance(e, a) - distance(e, b))[0];
      if (o) {
        target = o;
        e.state = 'Sabotage';
        if (distance(e, o) < 1.5) {
          if (o.underAttack <= 0) this.notice('RELAY UNDER ATTACK', 'sabotage-start', o);
          o.underAttack = 1;
          if (e.cooldown <= 0) {
            o.hp -= def.damage * this.difficulty;
            e.cooldown = 0.9;
            if (o.hp <= 0) {
              o.active = false;
              this.notice('RELAY DISABLED', 'relay-disabled', o);
            }
          }
          return;
        }
      }
    }
    if (e.kind === 'scavenger' && this.tactical) {
      if (e.carry) {
        e.state = 'Escape';
        target = { x: e.x < 0 ? -18 : 18, z: -4 };
        if (distance(e, target) < 1.3) {
          this.extracted++;
          e.hp = 0;
          this.notice(`ENERGY EXTRACTED · ${this.extracted}/4`, 'extraction', e);
          return;
        }
      } else {
        const c = this.cells
          .filter((c) => c.available)
          .sort((a, b) => distance(e, a) - distance(e, b))[0];
        if (c) {
          e.state = 'CollectResource';
          target = c;
          if (distance(e, c) < 1) {
            c.available = false;
            e.carry = true;
            this.notice('ENERGY CELL STOLEN · INTERCEPT CARRIER', 'resource-stolen', e);
          }
        }
      }
    }
    if (e.kind === 'guardian') {
      const ally = this.enemies.find(
        (a) => a.id !== e.id && a.hp > 0 && ['saboteur', 'boss', 'scavenger'].includes(a.kind),
      );
      if (ally && distance(e, p) > 3) {
        target = { x: ally.x + 1.8, z: ally.z + 1.8 };
        e.state = 'Defend';
      }
    }
    if (e.kind === 'ranged' && distance(e, p) < 12) {
      e.state = 'Attack';
      if (e.cooldown <= 0) {
        this.enemyShot(e, p, def.damage, 10);
        e.cooldown = 1.7;
        this.emit('attack', e, 'ranged-attack');
      }
      if (distance(e, p) < 5) {
        target = { x: e.x + (e.x - p.x), z: e.z + (e.z - p.z) };
        e.state = 'Retreat';
      } else return;
    }
    if (e.kind === 'boss') {
      const phase = e.hp < e.maxHp * 0.4 ? 3 : e.hp < e.maxHp * 0.7 ? 2 : 1;
      if (phase > e.phase) {
        e.phase = phase;
        this.notice(`SOVEREIGN · PHASE ${phase}`, 'boss-phase', e);
        for (let i = 0; i < 3; i++) if (this.enemies.length < 42) this.spawn('runner');
      }
      if (e.cooldown <= 0) {
        for (let i = 0; i < 8 + e.phase * 3; i++) {
          const angle = (i / (8 + e.phase * 3)) * Math.PI * 2 + this.time;
          this.enemyShot(
            e,
            { x: e.x + Math.sin(angle), z: e.z + Math.cos(angle) },
            18,
            6 + e.phase,
          );
        }
        this.enemyShot(e, p, 25, 13);
        this.emit('attack', e, 'boss-attack');
        e.cooldown = 2.8 - e.phase * 0.4;
      }
    }
    if (e.kind === 'bomber' && distance(e, p) < 2.7) {
      e.warn += dt;
      e.state = 'Detonate';
      if (e.warn === dt) this.notice('BOMBER ARMED · DASH AWAY', 'bomber-warning', e);
      if (e.warn > 0.9) {
        e.hp = 0;
        this.explode(e, 4.5, 60 * this.difficulty, -1);
      }
      return;
    }
    const barrier = this.equipment.find(
      (b) => b.hp > 0 && b.kind === 'barricade' && distance(e, b) < 2.3,
    );
    if (barrier) {
      e.state = 'Attack';
      if (e.cooldown <= 0) {
        barrier.hp -= e.kind === 'brute' ? 65 : def.damage * 2;
        e.cooldown = 0.7;
        this.emit('impact', barrier, barrier.hp <= 0 ? 'barricade-break' : 'barricade-hit');
      }
      return;
    }
    if (distance(e, p) < def.radius + 0.7 && target === p) {
      e.state = 'Attack';
      if (e.cooldown <= 0) {
        this.damagePlayer(p, def.damage * this.difficulty);
        e.cooldown = 0.85;
        this.emit('attack', e, `${e.kind}-attack`);
      }
      return;
    }
    if (e.nav <= 0) {
      e.path = findPath(e, target, obstacles, def.radius);
      e.nav = 0.8 + this.rng.next() * 0.4;
    }
    while (e.path.length && distance(e, e.path[0]) < 0.4) e.path.shift();
    const next = e.path[0];
    if (next) {
      const dx = next.x - e.x,
        dz = next.z - e.z,
        len = Math.hypot(dx, dz);
      e.angle = Math.atan2(dx, dz);
      const amount = Math.min(
        len,
        def.speed * dt * (e.carry ? 0.85 : 1) * (e.kind === 'boss' ? 1 + e.phase * 0.12 : 1),
      );
      move(e, (dx / len) * amount, (dz / len) * amount, obstacles, def.radius);
    }
    // Soft separation keeps crowds readable without blocking narrow routes.
    for (const other of this.enemies) {
      if (other.id === e.id || other.hp <= 0) continue;
      const d = distance(e, other),
        r = (def.radius + ENEMIES[other.kind].radius) * 0.75;
      if (d > 0 && d < r)
        move(e, ((e.x - other.x) / d) * dt, ((e.z - other.z) / d) * dt, obstacles, def.radius);
    }
  }
  enemyShot(e: Enemy, target: Vec, damage: number, speed: number) {
    const d = distance(e, target) || 1;
    this.projectiles.push({
      id: this.nextId++,
      x: e.x,
      z: e.z,
      owner: -1,
      kind: 'enemy',
      vx: ((target.x - e.x) / d) * speed,
      vz: ((target.z - e.z) / d) * speed,
      damage: damage * this.difficulty,
      life: 4,
      radius: 0,
      penetration: 1,
      hit: new Set(),
    });
  }
  tickProjectiles(dt: number) {
    for (const b of this.projectiles) {
      if (b.life <= 0) continue;
      const old = { x: b.x, z: b.z };
      b.x += b.vx * dt;
      b.z += b.vz * dt;
      b.life -= dt;
      const obstacle = this.arena.obstacles.find(
        (o) =>
          o.material !== 'water' && Math.abs(b.x - o.x) < o.w / 2 && Math.abs(b.z - o.z) < o.d / 2,
      );
      if (obstacle || Math.abs(b.x) > 22 || b.z > 22 || b.z < -20) {
        b.life = 0;
        this.emit('impact', b, `impact-${obstacle?.material ?? 'ground'}`);
        if (b.radius) this.explode(b, b.radius, b.damage, b.owner);
        continue;
      }
      for (const item of this.equipment) {
        if (item.hp <= 0 || ['mine', 'remote', 'grenade'].includes(item.kind) || b.hit.has(item.id))
          continue;
        if (segmentDistance(item, old, b) < (item.kind === 'barricade' ? 1.35 : 0.7)) {
          b.hit.add(item.id);
          item.hp -= b.damage;
          b.life = 0;
          this.emit('impact', item, item.kind === 'barrel' ? 'barrel-hit' : 'barricade-hit');
          if (item.hp <= 0) {
            if (item.kind === 'barrel') this.explode(item, item.radius, item.damage, b.owner);
            else this.emit('break', item, 'barricade-break');
          }
          if (b.radius) this.explode(b, b.radius, b.damage, b.owner);
          break;
        }
      }
      if (b.life <= 0) continue;
      if (b.owner >= 0)
        for (const e of this.enemies) {
          if (
            e.hp <= 0 ||
            b.hit.has(e.id) ||
            segmentDistance(e, old, b) > ENEMIES[e.kind].radius + 0.18
          )
            continue;
          b.hit.add(e.id);
          if (b.radius) this.explode(b, b.radius, b.damage, b.owner);
          else this.damageEnemy(e, b.damage, b.owner);
          if (--b.penetration <= 0) {
            b.life = 0;
            break;
          }
        }
      if (b.owner < 0 || this.options.mode === 'deathmatch')
        for (const p of this.players) {
          if (p.id === b.owner || p.hp <= 0 || b.hit.has(p.id) || segmentDistance(p, old, b) > 0.7)
            continue;
          b.hit.add(p.id);
          if (b.radius) this.explode(b, b.radius, b.damage, b.owner);
          else this.damagePlayer(p, b.damage, b.owner);
          b.life = 0;
          break;
        }
    }
  }
}

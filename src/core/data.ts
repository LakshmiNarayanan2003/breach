export type Vec = { x: number; z: number };
export type Mode = 'survival' | 'operations' | 'coop' | 'deathmatch';
export type Difficulty = 'easy' | 'normal' | 'hard';
export type EnemyKind =
  | 'walker'
  | 'runner'
  | 'brute'
  | 'ranged'
  | 'saboteur'
  | 'scavenger'
  | 'guardian'
  | 'bomber'
  | 'boss';
export type PickupKind =
  | 'health'
  | 'ammo'
  | 'shield'
  | 'damage'
  | 'speed'
  | 'rapid'
  | 'shockwave'
  | 'multiplier'
  | 'drone'
  | 'equipment';
export type WeaponKind =
  | 'pistol'
  | 'smg'
  | 'shotgun'
  | 'barrel'
  | 'grenade'
  | 'barricade'
  | 'mine'
  | 'rocket'
  | 'remote'
  | 'railgun';
export interface Obstacle extends Vec {
  w: number;
  d: number;
  material: 'stone' | 'wood' | 'metal' | 'water';
}
export interface Arena {
  id: string;
  name: string;
  subtitle: string;
  location: string;
  color: string;
  sky: number;
  floor: number;
  mission: string;
  objectives: Vec[];
  obstacles: Obstacle[];
}
const stone = (x: number, z: number, w: number, d: number): Obstacle => ({
  x,
  z,
  w,
  d,
  material: 'stone',
});
export const ARENAS: Arena[] = [
  {
    id: 'taj',
    name: 'Taj Mahal',
    subtitle: 'THE MARBLE STAND',
    location: 'AGRA · UTTAR PRADESH',
    color: '#83d9d1',
    sky: 0x172c32,
    floor: 0xb2b09b,
    mission: 'Protect three relays. Stop scavengers from stealing 4 cells. Contain 4 waves.',
    objectives: [
      { x: -12, z: 3 },
      { x: 12, z: 3 },
      { x: 0, z: 13 },
    ],
    obstacles: [
      stone(0, -12, 19, 10),
      ...[-13, 13].flatMap((x) => [-17, -7].map((z) => stone(x, z, 2, 2))),
      { x: 0, z: 2, w: 3.5, d: 13, material: 'water' },
      stone(-9, 11, 5, 2),
      stone(9, 11, 5, 2),
    ],
  },
  {
    id: 'hawa',
    name: 'Hawa Mahal',
    subtitle: 'PINK CITY PANIC',
    location: 'JAIPUR · RAJASTHAN',
    color: '#e5a58d',
    sky: 0x392735,
    floor: 0xb69a86,
    mission: 'Recover 5 energy cells before scavengers extract 4. Clear 4 waves.',
    objectives: [
      { x: -10, z: 8 },
      { x: 11, z: 1 },
    ],
    obstacles: [
      stone(0, -15, 31, 5),
      ...[-13, 13].flatMap((x) =>
        [-5, 6].map((z) => ({ x, z, w: 5, d: 4, material: 'wood' as const })),
      ),
      stone(0, 5, 4, 4),
    ],
  },
  {
    id: 'fort',
    name: 'Red Fort',
    subtitle: 'SIEGE PROTOCOL',
    location: 'DELHI · NATIONAL CAPITAL',
    color: '#dd8766',
    sky: 0x322c31,
    floor: 0xa98b72,
    mission: 'Keep the central generator online through 4 coordinated assault waves.',
    objectives: [{ x: 0, z: 4 }],
    obstacles: [
      stone(-15, -12, 10, 5),
      stone(15, -12, 10, 5),
      stone(-20, 0, 3, 18),
      stone(20, 0, 3, 18),
      stone(-9, 7, 3, 9),
      stone(9, 7, 3, 9),
    ],
  },
  {
    id: 'hampi',
    name: 'Hampi',
    subtitle: 'THE LOST SIGNAL',
    location: 'HAMPI · KARNATAKA',
    color: '#d7be83',
    sky: 0x302d29,
    floor: 0x9d9878,
    mission: 'Hold F at each transmitter to restore its signal. Defend them through 4 waves.',
    objectives: [
      { x: -14, z: -3 },
      { x: 14, z: 5 },
      { x: 0, z: 14 },
    ],
    obstacles: [
      stone(0, -14, 12, 6),
      ...[-12, -6, 6, 12].map((x) => stone(x, -8, 1.6, 1.6)),
      stone(-7, 5, 4, 5),
      stone(8, 11, 4, 3),
      stone(16, -11, 4, 5),
    ],
  },
  {
    id: 'gateway',
    name: 'Gateway of India',
    subtitle: 'HARBOR HAVOC',
    location: 'MUMBAI · MAHARASHTRA',
    color: '#83c5e4',
    sky: 0x152c3b,
    floor: 0x879da3,
    mission: 'Collect 5 cargo cells. Escort the support drone to extraction and survive 4 waves.',
    objectives: [
      { x: 0, z: 10 },
      { x: 12, z: 6 },
    ],
    obstacles: [
      stone(0, -14, 14, 6),
      ...[-14, 14].flatMap((x) =>
        [-4, 10].map((z) => ({ x, z, w: 5, d: 5, material: 'metal' as const })),
      ),
      { x: -6, z: 2, w: 3, d: 3, material: 'wood' },
    ],
  },
  {
    id: 'mysore',
    name: 'Mysore Palace',
    subtitle: 'FINAL STAND',
    location: 'MYSURU · KARNATAKA',
    color: '#c6a5e7',
    sky: 0x262139,
    floor: 0xa7a194,
    mission: 'Protect both palace relays and defeat the Breach Sovereign in wave 4.',
    objectives: [
      { x: -10, z: 5 },
      { x: 10, z: 5 },
    ],
    obstacles: [
      stone(0, -14, 32, 7),
      stone(-16, 1, 3, 7),
      stone(16, 1, 3, 7),
      stone(-7, 13, 4, 3),
      stone(7, 13, 4, 3),
    ],
  },
];
export interface Weapon {
  id: WeaponKind;
  name: string;
  short: string;
  damage: number;
  cooldown: number;
  ammo: number;
  speed: number;
  spread: number;
  pellets: number;
  radius: number;
  color: string;
  description: string;
}
export const WEAPONS: Weapon[] = [
  {
    id: 'pistol',
    name: 'Service Pistol',
    short: 'PST',
    damage: 25,
    cooldown: 0.27,
    ammo: -1,
    speed: 42,
    spread: 0.015,
    pellets: 1,
    radius: 0,
    color: '#e9e1b8',
    description: 'Precision sidearm · unlimited ammo',
  },
  {
    id: 'smg',
    name: 'Vector SMG',
    short: 'SMG',
    damage: 13,
    cooldown: 0.075,
    ammo: 180,
    speed: 44,
    spread: 0.1,
    pellets: 1,
    radius: 0,
    color: '#e9c05b',
    description: 'Rapid automatic fire',
  },
  {
    id: 'shotgun',
    name: 'Breach Shotgun',
    short: 'SGN',
    damage: 17,
    cooldown: 0.7,
    ammo: 36,
    speed: 35,
    spread: 0.28,
    pellets: 7,
    radius: 0,
    color: '#ffad5a',
    description: 'Seven pellets · close quarters',
  },
  {
    id: 'barrel',
    name: 'Explosive Barrel',
    short: 'BRL',
    damage: 100,
    cooldown: 0.6,
    ammo: 8,
    speed: 0,
    spread: 0,
    pellets: 1,
    radius: 5,
    color: '#ef643d',
    description: 'Deploy · shoot to chain detonate',
  },
  {
    id: 'grenade',
    name: 'Frag Grenade',
    short: 'FRG',
    damage: 95,
    cooldown: 0.7,
    ammo: 12,
    speed: 12,
    spread: 0,
    pellets: 1,
    radius: 5,
    color: '#bbc56d',
    description: 'Throw · 1.4 second fuse',
  },
  {
    id: 'barricade',
    name: 'Field Barricade',
    short: 'WAL',
    damage: 0,
    cooldown: 0.6,
    ammo: 8,
    speed: 0,
    spread: 0,
    pellets: 1,
    radius: 0,
    color: '#a7b9b7',
    description: 'Deploy cover · blocks hostiles',
  },
  {
    id: 'mine',
    name: 'Proximity Mine',
    short: 'MIN',
    damage: 110,
    cooldown: 0.6,
    ammo: 10,
    speed: 0,
    spread: 0,
    pellets: 1,
    radius: 4.5,
    color: '#99e089',
    description: 'Arms after 0.8s · enemy trigger',
  },
  {
    id: 'rocket',
    name: 'Rocket Launcher',
    short: 'RKT',
    damage: 130,
    cooldown: 1,
    ammo: 18,
    speed: 23,
    spread: 0.01,
    pellets: 1,
    radius: 5.5,
    color: '#ff924d',
    description: 'Explosive projectile · area damage',
  },
  {
    id: 'remote',
    name: 'Remote Charge',
    short: 'C4',
    damage: 140,
    cooldown: 0.5,
    ammo: 8,
    speed: 0,
    spread: 0,
    pellets: 1,
    radius: 6,
    color: '#ff6f9b',
    description: 'Place · R detonates your charges',
  },
  {
    id: 'railgun',
    name: 'Arc Railgun',
    short: 'ARC',
    damage: 100,
    cooldown: 1.1,
    ammo: 24,
    speed: 80,
    spread: 0,
    pellets: 1,
    radius: 0,
    color: '#83eeef',
    description: 'Energy beam · penetrates 4 targets',
  },
];
export const ENEMIES: Record<
  EnemyKind,
  { hp: number; speed: number; damage: number; color: number; radius: number; score: number }
> = {
  walker: { hp: 55, speed: 2.5, damage: 8, color: 0x91aa74, radius: 0.55, score: 50 },
  runner: { hp: 32, speed: 4.8, damage: 6, color: 0xd7a446, radius: 0.4, score: 70 },
  brute: { hp: 260, speed: 1.7, damage: 22, color: 0x965855, radius: 0.9, score: 200 },
  ranged: { hp: 65, speed: 2, damage: 12, color: 0x9c87cc, radius: 0.55, score: 100 },
  saboteur: { hp: 85, speed: 2.8, damage: 9, color: 0xfa984e, radius: 0.5, score: 150 },
  scavenger: { hp: 45, speed: 3.8, damage: 4, color: 0x69d0ca, radius: 0.45, score: 120 },
  guardian: { hp: 160, speed: 2.3, damage: 10, color: 0x6c9cca, radius: 0.7, score: 180 },
  bomber: { hp: 45, speed: 3.4, damage: 30, color: 0xf15e52, radius: 0.55, score: 130 },
  boss: { hp: 2200, speed: 1.8, damage: 25, color: 0xb77dd8, radius: 1.65, score: 2500 },
};
export const PICKUPS: PickupKind[] = [
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
];
export const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.z - b.z);
export const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
export class Random {
  constructor(public seed: number) {}
  next() {
    this.seed |= 0;
    this.seed = (this.seed + 0x6d2b79f5) | 0;
    let t = Math.imul(this.seed ^ (this.seed >>> 15), 1 | this.seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

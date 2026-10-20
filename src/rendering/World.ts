import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ARENAS, ENEMIES, WEAPONS, type Vec } from '../core/data';
import type { Enemy, Game, GameEvent, Player } from '../core/game';
const GEO = {
  box: new T.BoxGeometry(1, 1, 1),
  sphere: new T.SphereGeometry(1, 16, 10),
  cylinder: new T.CylinderGeometry(1, 1, 1, 12),
  cone: new T.ConeGeometry(1, 1, 8),
  ring: new T.TorusGeometry(1, 0.06, 6, 40),
  diamond: new T.OctahedronGeometry(1),
};
const materials = new Map<string, T.MeshStandardMaterial>();
function mat(color: number | string, metal = 0.05, emissive = false, opacity = 1) {
  const key = `${color}-${metal}-${emissive}-${opacity}`;
  if (!materials.has(key))
    materials.set(
      key,
      new T.MeshStandardMaterial({
        color,
        roughness: 0.76,
        metalness: metal,
        flatShading: true,
        emissive: emissive ? color : 0,
        emissiveIntensity: emissive ? 0.7 : 0,
        transparent: opacity < 1,
        opacity,
      }),
    );
  return materials.get(key)!;
}
function mesh(
  parent: T.Object3D,
  geo: T.BufferGeometry,
  color: number | string,
  x: number,
  y: number,
  z: number,
  sx = 1,
  sy = 1,
  sz = 1,
  glow = false,
) {
  const m = new T.Mesh(geo, mat(color, 0.05, glow));
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function box(
  p: T.Object3D,
  c: number | string,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
) {
  return mesh(p, GEO.box, c, x, y, z, w, h, d);
}
function cylinder(
  p: T.Object3D,
  c: number | string,
  x: number,
  y: number,
  z: number,
  r: number,
  h: number,
) {
  return mesh(p, GEO.cylinder, c, x, y, z, r, h, r);
}
function dome(p: T.Object3D, c: number | string, x: number, y: number, z: number, r: number) {
  const points = [
    new T.Vector2(0, 0),
    new T.Vector2(0.76, 0),
    new T.Vector2(0.98, 0.38),
    new T.Vector2(1, 0.7),
    new T.Vector2(0.8, 1.04),
    new T.Vector2(0.45, 1.36),
    new T.Vector2(0.12, 1.6),
    new T.Vector2(0, 1.72),
  ];
  const shape = new T.LatheGeometry(points, 24);
  shape.scale(r, r, r);
  const m = mesh(p, shape, c, x, y, z);
  m.userData.uniqueGeometry = true;
  cylinder(p, 0xcba46e, x, y + r * 1.8, z, 0.07, r * 0.5);
  mesh(p, GEO.sphere, 0xddb66b, x, y + r * 2.05, z, 0.12, 0.12, 0.12);
  return m;
}
function arch(
  p: T.Object3D,
  c: number | string,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
) {
  const shape = new T.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(-w / 2, h - w * 0.5);
  shape.absarc(0, h - w * 0.5, w / 2, Math.PI, 0, true);
  shape.lineTo(w / 2, 0);
  shape.closePath();
  const g = new T.ShapeGeometry(shape);
  const m = mesh(p, g, c, x, y, z);
  m.userData.uniqueGeometry = true;
  return m;
}
function tree(p: T.Object3D, x: number, z: number, height = 3) {
  cylinder(p, 0x625342, x, height * 0.3, z, 0.15, height * 0.6);
  mesh(p, GEO.cone, 0x3d6552, x, height * 0.7, z, 0.9, height * 0.9, 0.9);
  mesh(p, GEO.cone, 0x527a5e, x, height * 0.95, z, 0.65, height * 0.65, 0.65);
}
function lamp(p: T.Object3D, x: number, z: number) {
  cylinder(p, 0x3c5355, x, 0.65, z, 0.06, 1.3);
  mesh(p, GEO.sphere, 0xffd79e, x, 1.35, z, 0.15, 0.18, 0.15, true);
}
function tower(p: T.Object3D, x: number, z: number, c: number = 0xe6dec5, height = 8) {
  cylinder(p, c, x, height / 2, z, 0.6, height);
  for (const y of [1, height * 0.4, height * 0.7, height])
    cylinder(p, 0xc6bd9f, x, y, z, 0.85, 0.15);
  cylinder(p, c, x, height + 0.55, z, 0.46, 1);
  dome(p, c, x, height + 1, z, 0.7);
}
function taj(parent: T.Object3D) {
  box(parent, 0xe6dcc4, 0, 0.6, -12, 20, 1.2, 11);
  box(parent, 0xd4cbb7, 0, 1.3, -12, 17, 0.3, 9);
  box(parent, 0xe8e2d1, 0, 3.7, -12, 13, 4.8, 7.5);
  box(parent, 0xc3baa4, 0, 6.2, -12, 13.4, 0.3, 7.9);
  cylinder(parent, 0xeee6d2, 0, 6.8, -12, 2.45, 1.3);
  dome(parent, 0xf3eddb, 0, 7.4, -12, 2.8);
  arch(parent, 0x677a76, 0, 1.5, -8.23, 3.5, 4.4);
  arch(parent, 0x253f43, 0, 1.5, -8.2, 2.8, 3.9);
  for (const x of [-5, -3, 3, 5]) {
    arch(parent, 0x82908a, x, 2, -8.21, 1.1, 2.3);
    arch(parent, 0xa3a99a, x, 4.65, -8.21, 0.8, 0.95);
  }
  for (const x of [-5, 5])
    for (const z of [-14.5, -9.5]) {
      cylinder(parent, 0xe5dcc7, x, 6.65, z, 0.68, 0.8);
      dome(parent, 0xf2e9d5, x, 7, z, 0.95);
    }
  for (const x of [-13, 13]) for (const z of [-17, -7]) tower(parent, x, z);
  for (const x of [-9, 9])
    for (const z of [-2, 3, 8, 15]) tree(parent, x + (z === 15 ? 5 : 0), z, 2.5);
  for (const x of [-5, 5])
    for (const z of [-1, 6, 14]) {
      box(parent, 0x536d50, x, 0.12, z, 3.6, 0.3, 4);
      for (let i = 0; i < 3; i++)
        mesh(parent, GEO.sphere, 0x63845b, x - 1 + i, 0.4, z, 0.55, 0.35, 1.5);
    }
  box(parent, 0xc8c8ae, 0, 0.12, 2, 4.2, 0.28, 14);
  box(parent, 0x3b959d, 0, 0.28, 2, 3.5, 0.08, 13);
  for (let z = -3; z < 9; z += 2) {
    cylinder(parent, 0x9ad4ce, 0, 0.38, z, 0.15, 0.2);
    mesh(parent, GEO.sphere, 0xb4e8de, 0, 0.63, z, 0.09, 0.25, 0.09, true);
  }
  for (const x of [-3, 3]) for (const z of [-3, 2, 7, 12, 18]) lamp(parent, x, z);
}
function hawa(parent: T.Object3D) {
  for (let tier = 0; tier < 5; tier++) {
    const width = 31 - tier * 3;
    box(parent, tier % 2 ? 0xcb7e72 : 0xd98d7f, 0, 1.1 + tier * 1.7, -15, width, 1.8, 4);
    box(parent, 0xedb59c, 0, 2 + tier * 1.7, -12.95, width + 0.3, 0.13, 0.2);
    for (let x = -width / 2 + 1; x < width / 2; x += 2) {
      arch(parent, 0x814e51, x, 0.55 + tier * 1.7, -12.94, 0.8, 1.15);
      box(parent, 0xe2aa90, x, 0.5 + tier * 1.7, -12.7, 1.3, 0.15, 0.5);
    }
  }
  for (let x = -12; x <= 12; x += 4) dome(parent, 0xe2aa90, x, 8.8 - Math.abs(x) * 0.13, -15, 0.65);
  for (const x of [-13, 13])
    for (const z of [-5, 6]) {
      box(parent, 0x695448, x, 0.6, z, 4.6, 1.2, 3.8);
      for (const dx of [-2, 2]) cylinder(parent, 0x6f5d49, x + dx, 1.4, z, 0.07, 2.8);
      const canopy = box(parent, x < 0 ? 0xc49c53 : 0x6b9290, x, 2.6, z, 5, 0.15, 4);
      canopy.rotation.z = 0.08;
      for (let i = 0; i < 4; i++)
        mesh(
          parent,
          GEO.sphere,
          [0xc98355, 0x85965a, 0xd6b46f][i % 3],
          x - 1.5 + i,
          1.35,
          z,
          0.35,
          0.28,
          0.35,
        );
    }
  cylinder(parent, 0xcca591, 0, 0.4, 5, 2, 0.8);
  cylinder(parent, 0x557e83, 0, 0.85, 5, 1.6, 0.1);
  for (const x of [-6, 6]) for (const z of [0, 12, 18]) lamp(parent, x, z);
}
function fort(parent: T.Object3D) {
  for (const x of [-15, 15]) {
    box(parent, 0x9f5544, x, 3.1, -12, 10, 6.2, 5);
    for (let a = x - 5; a < x + 5; a += 1.3) box(parent, 0xbd7560, a, 6.6, -12, 0.8, 1, 5.1);
    tower(parent, x, -12, 0xa9634e, 7);
  }
  box(parent, 0x974b40, 0, 7.5, -13, 20, 2, 3);
  for (const x of [-7, 7]) {
    box(parent, 0xb46b52, x, 3.5, -13, 3, 7, 4);
    dome(parent, 0xc68e6c, x, 7, -13, 1.5);
  }
  arch(parent, 0x694946, 0, 0, -11.4, 7, 6);
  for (const x of [-20, 20]) {
    box(parent, 0xa6624e, x, 2.1, 0, 3, 4.2, 18);
    for (let z = -8; z < 9; z += 2) box(parent, 0xc08463, x, 4.5, z, 3, 0.8, 1);
  }
  for (const x of [-9, 9]) box(parent, 0xb17257, x, 0.8, 7, 3, 1.6, 9);
  for (const x of [-15, 15]) for (const z of [10, 17]) tree(parent, x, z, 3);
}
function hampi(parent: T.Object3D) {
  box(parent, 0x9b947a, 0, 0.7, -14, 12, 1.4, 6);
  for (const x of [-4, -1.3, 1.3, 4])
    for (const z of [-16, -12]) {
      box(parent, 0xb7b194, x, 2.8, z, 0.6, 4.2, 0.6);
      box(parent, 0xc9bf9f, x, 4.8, z, 1.2, 0.3, 1.2);
    }
  box(parent, 0xa9a087, 0, 5.1, -14, 12, 1, 6);
  for (let i = 0; i < 4; i++)
    box(parent, 0xb5ab8c, 0, 5.8 + i * 0.5, -14, 6 - i * 1.3, 0.6, 4 - i * 0.7);
  for (const x of [-12, -6, 6, 12]) {
    box(parent, 0xbcb79b, x, 1.6, -8, 1, 3.2, 1);
    box(parent, 0x938e75, x, 3.3, -8, 1.6, 0.3, 1.6);
  }
  for (const [x, z] of [
    [-7, 5],
    [8, 11],
    [16, -11],
  ]) {
    mesh(parent, GEO.diamond, 0x96907a, x, 1.3, z, 2.5, 2.5, 2.5).rotation.y = x;
    mesh(parent, GEO.diamond, 0xb2a98e, x + 1, 2, z + 1, 1.5, 1.6, 1.6);
  }
  for (const x of [-18, 18]) for (const z of [4, 16]) tree(parent, x, z, 2.3);
}
function gateway(parent: T.Object3D) {
  for (const x of [-5, 5]) {
    box(parent, 0xbfa986, x, 3.8, -14, 3.8, 7.6, 5);
    tower(parent, x, -14, 0xc9b795, 7.8);
  }
  box(parent, 0xc1ae8e, 0, 7, -14, 14, 2, 5);
  box(parent, 0xdac6a2, 0, 8.3, -14, 15, 0.5, 6);
  arch(parent, 0x355968, 0, 0, -11.45, 6, 6.4);
  for (const x of [-5, 5]) arch(parent, 0x6e756d, x, 1, -11.45, 1.5, 3);
  box(parent, 0x326b83, 0, -0.5, -25, 85, 0.2, 13);
  for (let x = -35; x < 35; x += 3) box(parent, 0x739c9e, x, 0, -20, 0.15, 1, 0.15);
  for (const x of [-14, 14])
    for (const z of [-4, 10]) {
      box(parent, x < 0 ? 0x527f83 : 0xb78557, x, 1.4, z, 5, 2.8, 5);
      for (let dx = -2; dx < 2.5; dx += 0.5)
        box(parent, x < 0 ? 0x648f8f : 0xc49969, x + dx, 1.4, z + 2.51, 0.08, 2.5, 0.05);
    }
  box(parent, 0x947757, -6, 1.2, 2, 3, 2.4, 3);
  box(parent, 0x4a5552, -6, 1.2, 3.52, 3, 0.15, 0.05);
}
function mysore(parent: T.Object3D) {
  box(parent, 0xc9bca0, 0, 3, -14, 32, 6, 7);
  for (const x of [-12, -6, 0, 6, 12]) {
    const h = x === 0 ? 9 : 6.5;
    box(parent, 0xd8c8aa, x, h / 2, -13, 4, h, 7.5);
    dome(parent, x === 0 ? 0x98575c : 0xc58d6a, x, h, -13, 1.5);
    arch(parent, 0x59616b, x, 0.4, -9.2, 2.4, 3.6);
    for (const dx of [-1, 1]) arch(parent, 0x8b7867, x + dx, 4.4, -9.2, 0.65, 1.4);
  }
  for (const x of [-16, 16]) {
    box(parent, 0xb7a88e, x, 1.2, 1, 3, 2.4, 7);
    for (let z = -2; z < 5; z += 2) dome(parent, 0xc69373, x, 2.4, z, 0.6);
  }
  for (const x of [-7, 7]) {
    box(parent, 0x9caa88, x, 0.2, 13, 4, 0.4, 3);
    for (let i = 0; i < 3; i++) mesh(parent, GEO.sphere, 0x4b765b, x - 1 + i, 0.7, 13, 0.7, 0.6, 1);
  }
  for (const x of [-12, 12]) for (const z of [10, 16]) lamp(parent, x, z);
}
const BUILDERS = [taj, hawa, fort, hampi, gateway, mysore];
interface Particle {
  mesh: T.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
}
export class World {
  renderer: T.WebGLRenderer;
  scene = new T.Scene();
  camera = new T.OrthographicCamera();
  touchControls = false;
  root = new T.Group();
  entities = new T.Group();
  effects = new T.Group();
  objects = new Map<string, T.Group>();
  particles: Particle[] = [];
  freeParticles: T.Mesh[] = [];
  portals: T.Group[] = [];
  arenaIndex = -1;
  ray = new T.Raycaster();
  plane = new T.Plane(new T.Vector3(0, 1, 0), 0);
  target = new T.Vector3();
  shake = 0;
  quality = 'medium';
  playerSuit = 0;
  reducedMotion = false;
  width = 1;
  height = 1;
  constructor(public canvas: HTMLCanvasElement) {
    this.renderer = new T.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.scene.add(this.root, this.entities, this.effects);
    const hemi = new T.HemisphereLight(0xc4e3e7, 0x747157, 2.5);
    this.scene.add(hemi);
    const sun = new T.DirectionalLight(0xffdfb6, 3.5);
    sun.position.set(-18, 30, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -35;
    sun.shadow.camera.right = 35;
    sun.shadow.camera.top = 35;
    sun.shadow.camera.bottom = -35;
    sun.shadow.normalBias = 0.04;
    sun.shadow.bias = -0.0002;
    this.scene.add(sun);
    const rim = new T.DirectionalLight(0x73cedc, 1.8);
    rim.position.set(15, 10, -20);
    this.scene.add(rim);
    this.loadArena(0);
    this.resize();
  }
  resize() {
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    this.renderer.setSize(this.width, this.height, false);
  }
  setQuality(quality: string) {
    this.quality = quality;
    this.renderer.setPixelRatio(
      quality === 'low' ? 1 : Math.min(devicePixelRatio, quality === 'high' ? 2 : 1.5),
    );
    this.renderer.shadowMap.enabled = quality !== 'low';
    this.resize();
  }
  clear(group: T.Group) {
    group.traverse((o) => {
      if (o instanceof T.Mesh && o.userData.uniqueGeometry) o.geometry.dispose();
      if (o instanceof T.Mesh && o.userData.uniqueMaterial) (o.material as T.Material).dispose();
      if (o instanceof T.Sprite) {
        o.material.map?.dispose();
        o.material.dispose();
      }
    });
    group.clear();
  }
  loadArena(index: number) {
    if (this.arenaIndex === index) return;
    this.arenaIndex = index;
    this.clear(this.root);
    this.clear(this.entities);
    this.objects.clear();
    this.portals = [];
    const arena = ARENAS[index];
    this.scene.background = new T.Color(arena.sky);
    this.scene.fog = new T.Fog(arena.sky, 65, 130);
    box(this.root, 0x233739, 0, -1, 0, 46, 1.5, 44);
    box(this.root, arena.floor, 0, -0.2, 0, 43, 0.3, 40);
    box(this.root, 0x88938a, 0, -0.38, 0, 44, 0.2, 41);
    for (let x = -20; x <= 20; x += 2) box(this.root, 0x8b9486, x, -0.038, 0, 0.025, 0.015, 39);
    for (let z = -18; z <= 19; z += 2) box(this.root, 0x8b9486, 0, -0.035, z, 42, 0.015, 0.025);
    for (const x of [-21.5, 21.5]) box(this.root, 0x4e6461, x, 0.05, 0, 0.3, 0.3, 40);
    box(this.root, 0x4e6461, 0, 0.05, 20, 43, 0.3, 0.3);
    // Street edges and modular path tiles keep the navigable area distinct.
    for (const x of [-18, 18])
      for (let z = -15; z < 19; z += 2) box(this.root, 0xc3beaa, x, 0.015, z, 2.2, 0.08, 1.8);
    BUILDERS[index](this.root);
    if (index === 0) for (const x of [-9, 9]) box(this.root, 0x89917b, x, 0.55, 11, 5, 1.1, 2);
    for (const [x, z] of [
      [-18, -4],
      [18, -4],
      [-18, 18],
      [18, 18],
    ]) {
      const g = new T.Group();
      g.position.set(x, 1.8, z);
      const ring = mesh(g, GEO.ring, 0xff793c, 0, 0, 0, 1.25, 1.6, 1.25, true);
      ring.rotation.y = x < 0 ? 0.5 : -0.5;
      const inner = mesh(g, GEO.diamond, 0xe66a43, 0, 0, 0, 0.5, 1.1, 0.3, true);
      inner.material = mat(0xea693a, 0.1, true, 0.35);
      this.root.add(g);
      this.portals.push(g);
      cylinder(this.root, 0x293e40, x, 0.1, z, 1.5, 0.25);
    }
    for (const x of [-23, 23])
      for (let z = -16; z < 20; z += 6) {
        mesh(this.root, GEO.diamond, 0x425d52, x, -0.7, z, 2, 1.5, 2);
      }
    this.batchStatic();
  }
  batchStatic() {
    this.root.updateMatrixWorld(true);
    const batches = new Map<T.Material, T.BufferGeometry[]>();
    for (const child of [...this.root.children]) {
      if (!(child instanceof T.Mesh)) continue;
      const material = child.material as T.Material;
      const geometry = child.geometry.clone().applyMatrix4(child.matrixWorld);
      const list = batches.get(material) ?? [];
      list.push(geometry);
      batches.set(material, list);
      this.root.remove(child);
      if (child.userData.uniqueGeometry) child.geometry.dispose();
    }
    for (const [material, geometries] of batches) {
      const merged = mergeGeometries(geometries, false);
      for (const g of geometries) g.dispose();
      if (merged) {
        const m = new T.Mesh(merged, material);
        m.castShadow = true;
        m.receiveShadow = true;
        m.userData.uniqueGeometry = true;
        this.root.add(m);
      }
    }
  }
  label(parent: T.Group, text: string, color = '#9aece0', height = 2.5) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#12262ce0';
    ctx.roundRect(25, 5, 78, 50, 8);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, 64, 41);
    const texture = new T.CanvasTexture(canvas);
    const sprite = new T.Sprite(new T.SpriteMaterial({ map: texture, depthTest: false }));
    sprite.position.y = height;
    sprite.scale.set(2, 1, 1);
    parent.add(sprite);
  }
  character(player: Player | Enemy, isPlayer: boolean) {
    const g = new T.Group(),
      kind = isPlayer ? 'player' : (player as Enemy).kind,
      color = isPlayer
        ? player.id === 0
          ? [0x7ed1c8, 0xe2a96e, 0xc7dfed][this.playerSuit]
          : 0xe2a96e
        : ENEMIES[(player as Enemy).kind].color;
    const scale = isPlayer
      ? 1
      : kind === 'boss'
        ? 2.7
        : kind === 'brute'
          ? 1.5
          : kind === 'runner'
            ? 0.8
            : 1;
    const body = new T.Group();
    g.add(body);
    g.userData.body = body;
    body.scale.setScalar(scale);
    cylinder(body, 0x283d42, 0, 0.82, 0, 0.32, 0.7);
    const torso = mesh(body, GEO.cylinder, color, 0, 1.05, 0, 0.45, 0.6, 0.3);
    torso.rotation.z = isPlayer ? 0 : 0.1;
    mesh(body, GEO.sphere, 0x273e47, 0, 1.55, 0, 0.34, 0.32, 0.32);
    box(body, isPlayer ? 0x8de7e4 : 0xffaf75, 0, 1.57, 0.28, 0.47, 0.12, 0.09);
    box(body, 0x22363b, 0, 1.05, -0.3, 0.45, 0.55, 0.25);
    for (const side of [-1, 1]) {
      mesh(body, GEO.sphere, color, side * 0.43, 1.18, 0, 0.21, 0.23, 0.23);
      const leg = new T.Group();
      leg.position.set(side * 0.22, 0.65, 0);
      box(leg, 0x34484b, 0, -0.2, 0, 0.22, 0.45, 0.25);
      box(leg, 0x1e2e34, 0, -0.48, 0.08, 0.26, 0.18, 0.4);
      body.add(leg);
      g.userData[side < 0 ? 'left' : 'right'] = leg;
    }
    if (kind === 'boss') {
      for (const side of [-1, 1])
        mesh(body, GEO.cone, 0xcdd6bf, side * 0.45, 1.85, 0, 0.15, 0.8, 0.15).rotation.z =
          -side * 0.4;
      mesh(body, GEO.ring, 0xff8551, 0, 1.1, 0.34, 0.25, 0.25, 0.25, true);
    }
    if (kind === 'guardian') {
      const shield = mesh(body, GEO.sphere, 0x71c9ed, 0, 1, 0, 0.85, 1, 0.8, true);
      shield.material = mat(0x71c9ed, 0.2, true, 0.15);
    }
    if (kind === 'scavenger') {
      const cell = mesh(body, GEO.diamond, 0x87ffff, 0, 1, -0.5, 0.3, 0.4, 0.3, true);
      cell.name = 'carry';
      cell.visible = false;
    }
    if (kind === 'saboteur') box(body, 0xe9ab53, 0.55, 0.9, 0.5, 0.15, 0.16, 0.7);
    if (kind === 'bomber') mesh(body, GEO.sphere, 0xff5533, 0, 1, -0.4, 0.35, 0.4, 0.35, true);
    if (isPlayer) {
      const ring = mesh(g, GEO.ring, color, 0, 0.06, 0, 0.7, 0.7, 0.7, true);
      ring.rotation.x = Math.PI / 2;
      ring.castShadow = false;
      ring.material = mat(color, 0.05, true).clone();
      ring.material.depthTest = false;
      ring.material.depthWrite = false;
      ring.material.transparent = true;
      ring.material.opacity = 0.8;
      ring.renderOrder = 10;
      ring.userData.uniqueMaterial = true;
      g.userData.ring = ring;
      const gun = new T.Group();
      gun.position.set(0.35, 1, 0.3);
      body.add(gun);
      g.userData.gun = gun;
      g.userData.weapon = -1;
      this.label(g, `P${player.id + 1}`, isPlayer && player.id === 0 ? '#9be6df' : '#ffcb87', 2.35);
    }
    return g;
  }
  weapon(g: T.Group, index: number) {
    if (g.userData.weapon === index) return;
    g.userData.weapon = index;
    const gun = g.userData.gun as T.Group;
    gun.clear();
    const w = WEAPONS[index];
    const scale = w.id === 'pistol' ? 0.6 : w.id === 'rocket' ? 1.3 : 1;
    box(gun, 0x273a40, 0, 0, 0.25, 0.2 * scale, 0.22 * scale, 0.8 * scale);
    cylinder(gun, w.color, 0, 0.03, 0.35, 0.12 * scale, 0.3).rotation.x = Math.PI / 2;
    if (w.id === 'shotgun') box(gun, 0xa5815b, 0, -0.06, 0.6, 0.3, 0.12, 0.35);
    if (w.id === 'railgun')
      for (const x of [-0.1, 0.1]) mesh(gun, GEO.box, w.color, x, 0.06, 0.5, 0.04, 0.04, 0.7, true);
    if (['barrel', 'grenade', 'mine', 'remote', 'barricade'].includes(w.id)) {
      gun.clear();
      mesh(gun, w.id === 'barrel' ? GEO.cylinder : GEO.box, w.color, 0, 0, 0.3, 0.3, 0.4, 0.3);
    }
  }
  getObject(key: string, create: () => T.Group) {
    let g = this.objects.get(key);
    if (!g) {
      g = create();
      this.objects.set(key, g);
      this.entities.add(g);
    }
    return g;
  }
  sync(game: Game, time: number) {
    const alive = new Set<string>();
    for (const p of game.players) {
      const key = `p${p.id}`;
      alive.add(key);
      const g = this.getObject(key, () => this.character(p, true));
      g.position.set(p.x, 0, p.z);
      g.rotation.y = p.angle;
      this.weapon(g, p.weapon);
      this.animateCharacter(g, p.moving, time, p.hp <= 0);
      const ring = g.userData.ring as T.Mesh;
      ring.scale.setScalar(p.powers.shield ? 1 : 0.7);
      ring.visible = p.hp > 0;
      g.userData.body.rotation.z = p.hp <= 0 ? Math.PI / 2 : 0;
      g.userData.body.position.y = p.hp <= 0 ? -0.25 : 0;
    }
    for (const e of game.enemies) {
      const key = `e${e.id}`;
      alive.add(key);
      const g = this.getObject(key, () => this.character(e, false));
      g.position.set(e.x, 0, e.z);
      g.rotation.y = e.angle;
      this.animateCharacter(g, e.state !== 'Attack' && e.state !== 'Detonate', time, false);
      g.userData.body.position.y = e.hit > 0 ? 0.12 : 0;
      const carry = g.getObjectByName('carry');
      if (carry) carry.visible = e.carry;
      g.scale.setScalar(e.warn > 0 ? 1 + Math.sin(time * 25) * 0.1 : 1);
    }
    for (const e of game.equipment) {
      const key = `d${e.id}`;
      alive.add(key);
      const g = this.getObject(key, () => {
        const a = new T.Group();
        const c = WEAPONS.find((w) => w.id === e.kind)!.color;
        if (e.kind === 'barrel') {
          cylinder(a, c, 0, 0.65, 0, 0.5, 1.2);
          for (const y of [0.2, 1.05]) cylinder(a, 0x37494b, 0, y, 0, 0.52, 0.1);
          mesh(a, GEO.diamond, 0xffd07c, 0, 0.7, 0.5, 0.15, 0.18, 0.03, true);
        } else if (e.kind === 'barricade') {
          box(a, 0x7e9290, 0, 0.6, 0, 2.6, 1.2, 1);
          for (const x of [-0.8, 0, 0.8])
            box(a, 0xdcb76c, x, 0.6, 0.52, 0.2, 0.9, 0.04).rotation.z = 0.4;
        } else {
          mesh(a, e.kind === 'grenade' ? GEO.sphere : GEO.cylinder, c, 0, 0.2, 0, 0.32, 0.25, 0.32);
          mesh(a, GEO.sphere, 0xff674b, 0, 0.4, 0, 0.08, 0.08, 0.08, true);
        }
        return a;
      });
      g.position.set(
        e.x,
        e.kind === 'grenade' ? Math.sin(Math.min(1, e.age / 1.4) * Math.PI) * 3 : 0,
        e.z,
      );
    }
    for (const b of game.projectiles) {
      const key = `b${b.id}`;
      alive.add(key);
      const g = this.getObject(key, () => {
        const a = new T.Group();
        const color =
          b.kind === 'enemy'
            ? 0xf59872
            : (WEAPONS.find((w) => w.id === b.kind)?.color ?? '#faffdc');
        mesh(
          a,
          GEO.box,
          color,
          0,
          0,
          0,
          b.kind === 'railgun' ? 0.1 : 0.08,
          0.08,
          b.kind === 'railgun' ? 2.4 : b.kind === 'rocket' ? 0.7 : 0.5,
          true,
        );
        return a;
      });
      g.position.set(b.x, 1, b.z);
      g.rotation.y = Math.atan2(b.vx, b.vz);
    }
    for (const p of game.pickups) {
      const key = `k${p.id}`;
      alive.add(key);
      const g = this.getObject(key, () => {
        const a = new T.Group(),
          colors: Record<string, number> = {
            health: 0x80dfab,
            ammo: 0xf1ca74,
            shield: 0x6dc9ef,
            damage: 0xf88272,
            speed: 0xc7ef8d,
            rapid: 0xf4bb7b,
            shockwave: 0xd698f5,
            multiplier: 0xffdb78,
            drone: 0x8fdee1,
            equipment: 0xcbd3c7,
          };
        mesh(
          a,
          p.kind === 'health' ? GEO.box : p.kind === 'ammo' ? GEO.cylinder : GEO.diamond,
          colors[p.kind],
          0,
          0.7,
          0,
          0.35,
          0.45,
          0.35,
          true,
        );
        const ring = mesh(a, GEO.ring, colors[p.kind], 0, 0.08, 0, 0.5, 0.5, 0.5);
        ring.rotation.x = Math.PI / 2;
        this.label(
          a,
          p.weapon !== undefined ? WEAPONS[p.weapon].short : p.kind.slice(0, 3).toUpperCase(),
          '#d3eee6',
          1.6,
        );
        return a;
      });
      g.position.set(p.x, Math.sin(time * 2 + p.id) * 0.15, p.z);
      g.children[0].rotation.y = time;
    }
    for (const o of game.objectives) {
      const key = `o${o.id}`;
      alive.add(key);
      const g = this.getObject(key, () => {
        const a = new T.Group();
        cylinder(a, 0x354e50, 0, 0.25, 0, 0.9, 0.5);
        cylinder(a, 0x72898b, 0, 0.9, 0, 0.35, 1.1);
        mesh(a, GEO.diamond, 0x83f5e3, 0, 1.8, 0, 0.45, 0.8, 0.45, true);
        const r = mesh(a, GEO.ring, 0x78e6db, 0, 0.05, 0, 1.7, 1.7, 1.7, true);
        r.rotation.x = Math.PI / 2;
        this.label(a, String.fromCharCode(65 + o.id), '#b3fff0', 3);
        return a;
      });
      g.position.set(o.x, 0, o.z);
      g.children[2].rotation.y = time;
      const crystal = g.children[2] as T.Mesh;
      crystal.material = mat(
        o.underAttack > 0 ? 0xff734d : o.active ? 0x83f5e3 : 0x6d7f83,
        0.05,
        true,
      );
    }
    if (game.tactical)
      for (const c of game.cells.filter((c) => c.available)) {
        const key = `c${c.id}`;
        alive.add(key);
        const g = this.getObject(key, () => {
          const a = new T.Group();
          mesh(a, GEO.diamond, 0x85e9f6, 0, 0.45, 0, 0.22, 0.4, 0.22, true);
          return a;
        });
        g.position.set(c.x, Math.sin(time * 3 + c.id) * 0.15, c.z);
        g.rotation.y = time;
      }
    if (game.tactical && game.arena.id === 'gateway') {
      const key = 'escort';
      alive.add(key);
      const g = this.getObject(key, () => {
        const a = new T.Group();
        mesh(a, GEO.sphere, 0xbadbd9, 0, 1, 0, 0.5, 0.35, 0.5);
        for (const x of [-0.7, 0.7])
          mesh(a, GEO.ring, 0x73f0dd, x, 1, 0, 0.35, 0.35, 0.35, true).rotation.x = Math.PI / 2;
        this.label(a, 'ESCORT');
        return a;
      });
      g.position.set(game.escort.x, Math.sin(time * 3) * 0.1, game.escort.z);
    }
    for (const p of game.players)
      if (p.powers.drone) {
        const key = `drone${p.id}`;
        alive.add(key);
        const g = this.getObject(key, () => {
          const a = new T.Group();
          mesh(a, GEO.diamond, 0x8af5e7, 0, 0, 0, 0.4, 0.25, 0.4, true);
          return a;
        });
        g.position.set(p.x + Math.sin(time) * 1.5, 2.5, p.z + Math.cos(time) * 1.5);
      }
    for (const [key, g] of this.objects)
      if (!alive.has(key)) {
        this.clear(g);
        this.entities.remove(g);
        this.objects.delete(key);
      }
  }
  animateCharacter(g: T.Group, moving: boolean, time: number, dead: boolean) {
    const amount = moving && !dead ? Math.sin(time * 12) * 0.6 : 0;
    g.userData.left.rotation.x = amount;
    g.userData.right.rotation.x = -amount;
    g.userData.body.position.y = dead
      ? 0
      : Math.sin(time * (moving ? 12 : 2)) * (moving ? 0.04 : 0.02);
  }
  event(e: GameEvent) {
    const explosion = e.type === 'explosion',
      death = e.type === 'death',
      pickup = e.type === 'pickup';
    if (
      !['explosion', 'death', 'fire', 'hit', 'pickup', 'dash', 'impact', 'drone-shot'].includes(
        e.type,
      )
    )
      return;
    if (explosion) this.shake = Math.min(0.8, this.shake + 0.4);
    const count = explosion ? 32 : death ? 10 : pickup ? 8 : 4;
    const color = explosion ? 0xffa75b : pickup ? 0x93edc7 : e.type === 'hit' ? 0xe0ae7b : 0xa8ebe2;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= 250) break;
      let m = this.freeParticles.pop();
      if (!m) {
        m = new T.Mesh(GEO.diamond, mat(color, 0.05, true));
        this.effects.add(m);
      }
      m.visible = true;
      m.material = mat(color, 0.05, true);
      m.position.set(e.x, explosion ? 0.5 : 1, e.z);
      const size = explosion ? 0.12 + Math.random() * 0.25 : 0.07;
      m.scale.setScalar(size);
      const life = explosion ? 0.7 + Math.random() * 0.5 : 0.2 + Math.random() * 0.3;
      this.particles.push({
        mesh: m,
        vx: (Math.random() - 0.5) * (explosion ? 12 : 4),
        vy: Math.random() * (explosion ? 9 : 4),
        vz: (Math.random() - 0.5) * (explosion ? 12 : 4),
        life,
        max: life,
      });
    }
  }
  update(dt: number, time: number, game: Game | null) {
    for (const g of this.portals) {
      g.children[0].rotation.z = this.reducedMotion ? 0 : time * 0.3;
      g.children[1].rotation.y = time;
      g.children[1].scale.y = 1 + Math.sin(time * 2) * 0.12;
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.mesh.visible = false;
        this.freeParticles.push(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }
      p.vy -= dt * 12;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.scale.multiplyScalar(Math.pow(0.6, dt));
    }
    const aspect = this.width / this.height;
    let height: number;
    const desired = new T.Vector3();
    if (game) {
      this.sync(game, time);
      const living = game.players.filter((p) => p.hp > 0);
      const players = living.length ? living : game.players;
      desired.set(
        (players.reduce((s, p) => s + p.x, 0) / players.length) * (this.touchControls ? 1 : 0.16),
        0,
        (players.reduce((s, p) => s + p.z, 0) / players.length) * (this.touchControls ? 1 : 0.12) +
          1,
      );
      height =
        this.touchControls && players.length === 1
          ? Math.max(13, 11 / aspect)
          : Math.max(23, 24 / aspect);
      this.target.lerp(desired, 1 - Math.exp(-dt * 4));
      this.camera.position.set(this.target.x, 40, this.target.z + 31);
    } else {
      height = 23;
      desired.set(-6, 0, -1);
      this.target.lerp(desired, 1 - Math.exp(-dt * 3));
      this.camera.position.set(
        this.target.x + 25 + (this.reducedMotion ? 0 : Math.sin(time * 0.08) * 1.4),
        32,
        34,
      );
    }
    this.camera.left = -height * aspect;
    this.camera.right = height * aspect;
    const offset = game && this.touchControls && aspect < 1 ? 0.22 : 0;
    this.camera.top = height * (1 - offset);
    this.camera.bottom = -height * (1 + offset);
    this.camera.near = 0.1;
    this.camera.far = 200;
    this.camera.lookAt(this.target);
    if (!this.reducedMotion && this.shake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake;
      this.camera.position.y += (Math.random() - 0.5) * this.shake;
    }
    this.shake = Math.max(0, this.shake - dt * 2);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    this.renderer.render(this.scene, this.camera);
  }
  aim(clientX: number, clientY: number): Vec {
    const rect = this.canvas.getBoundingClientRect();
    this.ray.setFromCamera(
      new T.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        (-(clientY - rect.top) / rect.height) * 2 + 1,
      ),
      this.camera,
    );
    const p = new T.Vector3();
    this.ray.ray.intersectPlane(this.plane, p);
    return { x: p.x, z: p.z };
  }
  project(p: Vec) {
    const v = new T.Vector3(p.x, 0, p.z).project(this.camera);
    return { x: ((v.x + 1) / 2) * this.width, y: ((1 - v.y) / 2) * this.height };
  }
  get stats() {
    return {
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
    };
  }
  dispose() {
    this.clear(this.root);
    this.clear(this.entities);
    this.renderer.dispose();
  }
}

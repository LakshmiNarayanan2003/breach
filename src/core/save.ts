export const DEFAULT_BINDINGS: Record<string, string> = {
  up: 'KeyW',
  down: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  fire: 'Space',
  dash: 'ShiftLeft',
  next: 'KeyE',
  previous: 'KeyQ',
  interact: 'KeyF',
  detonate: 'KeyR',
  p2up: 'ArrowUp',
  p2down: 'ArrowDown',
  p2left: 'ArrowLeft',
  p2right: 'ArrowRight',
  p2fire: 'Slash',
  p2next: 'Period',
  p2interact: 'Enter',
  p2dash: 'ShiftRight',
  p2detonate: 'Comma',
};
export interface Save {
  version: 1;
  completed: string[];
  unlockedArenas: string[];
  unlockedWeapons: string[];
  highScore: number;
  bestWave: number;
  cosmetic: number;
  graphics: 'low' | 'medium' | 'high';
  audio: Record<string, number>;
  muted: boolean;
  reducedMotion: boolean;
  bindings: Record<string, string>;
}
export const defaults = (): Save => ({
  version: 1,
  completed: [],
  unlockedArenas: ['taj'],
  unlockedWeapons: ['pistol', 'smg', 'shotgun', 'barrel'],
  highScore: 0,
  bestWave: 0,
  cosmetic: 0,
  graphics: 'medium',
  audio: {
    master: 0.7,
    music: 0.45,
    combat: 0.65,
    environment: 0.35,
    enemies: 0.5,
    ui: 0.55,
    voice: 0.6,
  },
  muted: false,
  reducedMotion: false,
  bindings: { ...DEFAULT_BINDINGS },
});
export function parseSave(text: string | null): Save {
  const d = defaults();
  try {
    const s = JSON.parse(text ?? 'null');
    if (!s || s.version !== 1) return d;
    for (const k of ['highScore', 'bestWave', 'cosmetic'] as const)
      if (Number.isFinite(s[k])) d[k] = Math.max(0, s[k]);
    if (Array.isArray(s.completed))
      d.completed = s.completed.filter((x: unknown) => typeof x === 'string');
    if (Array.isArray(s.unlockedArenas))
      d.unlockedArenas = [
        ...new Set(['taj', ...s.unlockedArenas.filter((x: unknown) => typeof x === 'string')]),
      ];
    if (Array.isArray(s.unlockedWeapons))
      d.unlockedWeapons = [
        ...new Set(['pistol', ...s.unlockedWeapons.filter((x: unknown) => typeof x === 'string')]),
      ];
    if (['low', 'medium', 'high'].includes(s.graphics)) d.graphics = s.graphics;
    d.muted = s.muted === true;
    d.reducedMotion = s.reducedMotion === true;
    for (const k of Object.keys(d.audio))
      if (typeof s.audio?.[k] === 'number') d.audio[k] = Math.max(0, Math.min(1, s.audio[k]));
    if (
      s.bindings &&
      Object.keys(DEFAULT_BINDINGS).every((k) => typeof s.bindings[k] === 'string') &&
      new Set(Object.values(s.bindings)).size === Object.keys(s.bindings).length
    )
      d.bindings = { ...DEFAULT_BINDINGS, ...s.bindings };
    d.cosmetic = Math.min(2, Math.floor(d.cosmetic));
    return d;
  } catch {
    return d;
  }
}
export function loadSave(): Save {
  try {
    return parseSave(localStorage.getItem('breach.save.v1'));
  } catch {
    return defaults();
  }
}
export function writeSave(save: Save) {
  try {
    localStorage.setItem('breach.save.v1', JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}
export function bindKey(save: Save, action: string, code: string): boolean {
  if (
    !(action in DEFAULT_BINDINGS) ||
    Object.entries(save.bindings).some(([k, v]) => k !== action && v === code) ||
    ['Escape', 'KeyP', ...Array.from({ length: 10 }, (_, i) => `Digit${i}`)].includes(code)
  )
    return false;
  save.bindings[action] = code;
  return true;
}

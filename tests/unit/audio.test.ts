import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import manifest from '../../public/audio/manifest.json';
import { WEAPONS, ENEMIES, PICKUPS } from '../../src/core/data';
const entries = Object.entries(manifest);
describe('bundled original audio', () => {
  it('provides every weapon, enemy, pickup, arena, and music state', () => {
    const required = [
      ...WEAPONS.map((w) => w.id),
      ...Object.keys(ENEMIES).flatMap((e) =>
        ['spawn', 'idle', 'attack', 'hit', 'death'].map((a) => `${e}-${a}`),
      ),
      ...PICKUPS.map((p) => `pickup-${p}`),
      ...['taj', 'hawa', 'fort', 'hampi', 'gateway', 'mysore'].map((a) => `ambient-${a}`),
      ...[
        'menu',
        'selection',
        'calm',
        'medium',
        'intense',
        'boss',
        'suspense',
        'victory',
        'defeat',
        'credits',
      ].map((m) => `music-${m}`),
    ];
    for (const key of required) expect(manifest).toHaveProperty(key);
  });
  it('contains distinct, non-silent, unclipped PCM WAV signals with documented rights', () => {
    const hashes = new Set<string>();
    for (const [key, asset] of entries) {
      const bytes = readFileSync(resolve('public', asset.file));
      expect(bytes.toString('ascii', 0, 4), key).toBe('RIFF');
      expect(bytes.toString('ascii', 8, 12), key).toBe('WAVE');
      expect(bytes.readUInt16LE(22)).toBe(1);
      expect(bytes.readUInt32LE(24)).toBe(22050);
      expect(bytes.readUInt16LE(34)).toBe(16);
      let sum = 0,
        peak = 0;
      for (let i = 44; i < bytes.length; i += 2) {
        const x = bytes.readInt16LE(i) / 32768;
        sum += x * x;
        peak = Math.max(peak, Math.abs(x));
      }
      expect(Math.sqrt(sum / ((bytes.length - 44) / 2)), key).toBeGreaterThan(0.002);
      expect(peak, key).toBeLessThan(0.95);
      expect(asset.license).toBe('CC0-1.0');
      hashes.add(createHash('sha256').update(bytes).digest('hex'));
    }
    expect(hashes.size).toBe(entries.length);
  });
  it('music loops have no silent padding or large seam discontinuities', () => {
    for (const [key, asset] of entries.filter(([, a]) => a.category === 'music')) {
      const b = readFileSync(resolve('public', asset.file));
      const first = b.readInt16LE(44) / 32768,
        last = b.readInt16LE(b.length - 2) / 32768;
      expect(Math.abs(first - last), key).toBeLessThan(0.15);
      expect(asset.duration).toBeGreaterThan(10);
    }
  });
});

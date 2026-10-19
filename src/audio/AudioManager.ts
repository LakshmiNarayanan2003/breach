import type { Vec } from '../core/data';
import type { Save } from '../core/save';
export interface AudioAsset {
  file: string;
  category: string;
  duration: number;
  loop: boolean;
  peak: number;
  license: string;
}
export type Manifest = Record<string, AudioAsset>;
interface Voice {
  source: AudioBufferSourceNode;
  gain: GainNode;
  pan: StereoPannerNode;
  priority: number;
  key: string;
}
export function spatial(source: Vec, listener: Vec, important = false) {
  const d = Math.hypot(source.x - listener.x, source.z - listener.z);
  return {
    pan: Math.max(-0.85, Math.min(0.85, (source.x - listener.x) / 18)),
    gain: Math.max(important ? 0.35 : 0.08, 1 / (1 + d * 0.1)),
  };
}
export class AudioManager {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  analyser: AnalyserNode | null = null;
  filter: BiquadFilterNode | null = null;
  buses: Record<string, GainNode> = {};
  buffers = new Map<string, AudioBuffer>();
  manifest: Manifest = {};
  pending = new Map<string, Promise<AudioBuffer | null>>();
  voices: Voice[] = [];
  history: string[] = [];
  errors: string[] = [];
  listener: Vec = { x: 0, z: 0 };
  musicState = '';
  unlocked = false;
  ready = false;
  paused = false;
  private music: { source: AudioBufferSourceNode; gain: GainNode }[] = [];
  private ambient: AudioBufferSourceNode | null = null;
  private ambientName = '';
  private last = new Map<string, number>();
  private effectRevision = 0;
  private musicRevision = 0;
  private ambientRevision = 0;
  constructor(public settings: Save) {}
  async unlock() {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        const compressor = this.ctx.createDynamicsCompressor();
        compressor.threshold.value = -10;
        compressor.knee.value = 15;
        compressor.ratio.value = 10;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.2;
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 512;
        this.master.connect(compressor);
        compressor.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
        for (const key of ['music', 'combat', 'environment', 'enemies', 'ui', 'voice']) {
          this.buses[key] = this.ctx.createGain();
          this.buses[key].connect(this.master);
        }
        this.filter = this.ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 19000;
        this.filter.connect(this.buses.music);
        this.applySettings();
      } catch (error) {
        this.errors.push(String(error));
        return;
      }
    }
    try {
      await this.ctx.resume();
      this.unlocked = true;
      if (!this.ready) {
        const response = await fetch(`${import.meta.env.BASE_URL}audio/manifest.json`);
        if (!response.ok) throw Error('Audio manifest unavailable');
        this.manifest = await response.json();
        this.ready = true;
        await Promise.all(
          ['pistol', 'explosion', 'player-hit', 'ui-click', 'music-menu'].map((k) => this.load(k)),
        );
      }
    } catch (error) {
      this.errors.push(String(error));
    }
  }
  async load(key: string): Promise<AudioBuffer | null> {
    if (this.buffers.has(key)) return this.buffers.get(key)!;
    if (this.pending.has(key)) return this.pending.get(key)!;
    if (!this.ctx || !this.manifest[key]) return null;
    const task = (async () => {
      try {
        const r = await fetch(import.meta.env.BASE_URL + this.manifest[key].file);
        if (!r.ok) throw Error(`Audio ${key}: HTTP ${r.status}`);
        const buffer = await this.ctx!.decodeAudioData(await r.arrayBuffer());
        this.buffers.set(key, buffer);
        return buffer;
      } catch (e) {
        this.errors.push(String(e));
        return null;
      } finally {
        this.pending.delete(key);
      }
    })();
    this.pending.set(key, task);
    return task;
  }
  applySettings() {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.settings.muted ? 0 : this.settings.audio.master, t, 0.02);
    for (const [key, bus] of Object.entries(this.buses))
      bus.gain.setTargetAtTime(this.settings.audio[key] ?? 0.5, t, 0.02);
  }
  async play(key: string, position?: Vec, priority = 2) {
    if (!this.ctx || !this.unlocked || !this.ready || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (now - (this.last.get(key) ?? -10) < (key.startsWith('step') ? 0.15 : 0.045)) return;
    this.last.set(key, now);
    const revision = this.effectRevision;
    const buffer = await this.load(key);
    if (revision !== this.effectRevision || !buffer || !this.ctx || this.ctx.state !== 'running')
      return;
    if (this.voices.length >= 28) {
      const low = this.voices.reduce((a, b) => (a.priority < b.priority ? a : b));
      if (low.priority > priority) return;
      low.source.stop();
      this.remove(low);
    }
    if (this.voices.filter((v) => v.key === key).length >= 4) return;
    const source = this.ctx.createBufferSource(),
      gain = this.ctx.createGain(),
      pan = this.ctx.createStereoPanner();
    source.buffer = buffer;
    source.playbackRate.value = 0.96 + Math.random() * 0.08;
    const pos = position ? spatial(position, this.listener, priority >= 4) : { gain: 1, pan: 0 };
    gain.gain.value = pos.gain * (key === 'explosion' ? 0.5 : 0.7);
    pan.pan.value = pos.pan;
    const category = this.manifest[key].category,
      bus = category === 'weapons' || category === 'player' ? 'combat' : category;
    source.connect(gain);
    gain.connect(pan);
    pan.connect(this.buses[bus] ?? this.buses.combat);
    const voice = { source, gain, pan, priority, key };
    source.onended = () => this.remove(voice);
    this.voices.push(voice);
    source.start();
    this.history.push(key);
    if (this.history.length > 300) this.history.shift();
    if (priority >= 4) {
      const b = this.buses.music.gain;
      b.cancelScheduledValues(this.ctx.currentTime);
      b.setTargetAtTime(this.settings.audio.music * 0.45, this.ctx.currentTime, 0.05);
      b.setTargetAtTime(this.settings.audio.music, this.ctx.currentTime + 0.75, 0.25);
    }
  }
  private remove(v: Voice) {
    v.source.disconnect();
    v.gain.disconnect();
    v.pan.disconnect();
    const i = this.voices.indexOf(v);
    if (i >= 0) this.voices.splice(i, 1);
  }
  async setMusic(state: string) {
    if (this.musicState === state || !this.ready || !this.ctx) return;
    this.musicState = state;
    const revision = ++this.musicRevision;
    const buffer = await this.load('music-' + state);
    if (!buffer || !this.ctx || revision !== this.musicRevision) return;
    const t = this.ctx.currentTime;
    for (const old of this.music) {
      old.gain.gain.cancelScheduledValues(t);
      old.gain.gain.setValueAtTime(old.gain.gain.value, t);
      old.gain.gain.linearRampToValueAtTime(0, t + 1.2);
      try {
        old.source.stop(t + 1.25);
      } catch {
        /* Already stopped by a rapid screen transition. */
      }
    }
    const source = this.ctx.createBufferSource(),
      gain = this.ctx.createGain();
    source.buffer = buffer;
    source.loop = !['victory', 'defeat'].includes(state);
    source.connect(gain);
    gain.connect(this.filter!);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.65, t + 1.2);
    const track = { source, gain };
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      this.music = this.music.filter((m) => m !== track);
    };
    this.music.push(track);
    source.start();
    this.history.push('music-' + state);
  }
  async setAmbient(arena: string | null) {
    const name = arena ? 'ambient-' + arena : '';
    if (this.ambientName === name) return;
    this.ambientName = name;
    const revision = ++this.ambientRevision;
    if (this.ambient) {
      this.ambient.stop();
      this.ambient.disconnect();
      this.ambient = null;
    }
    if (!name || !this.ctx) return;
    const buffer = await this.load(name);
    if (!buffer || revision !== this.ambientRevision || !this.ctx) return;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.buses.environment);
    source.start();
    this.ambient = source;
  }
  pause(paused: boolean) {
    this.paused = paused;
    if (this.ctx && this.filter)
      this.filter.frequency.setTargetAtTime(paused ? 650 : 19000, this.ctx.currentTime, 0.2);
    if (paused) this.stopEffects();
  }
  stopEffects() {
    this.effectRevision++;
    for (const v of [...this.voices]) {
      try {
        v.source.stop();
      } catch {
        /* Ended. */
      }
      this.remove(v);
    }
  }
  async visibility(hidden: boolean) {
    if (!this.ctx) return;
    if (hidden) {
      await this.ctx.suspend();
    } else if (this.unlocked) await this.ctx.resume();
  }
  level() {
    if (!this.analyser) return 0;
    const a = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(a);
    return Math.sqrt(a.reduce((sum, v) => sum + v * v, 0) / a.length);
  }
  get activeMusic() {
    return this.music.length;
  }
  dispose() {
    this.musicRevision++;
    this.ambientRevision++;
    this.stopEffects();
    this.ambient?.stop();
    for (const m of this.music) m.source.stop();
    void this.ctx?.close();
    this.ctx = null;
  }
}

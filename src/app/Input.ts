import { idleInput, type Game, type Input } from '../core/game';
import type { Save } from '../core/save';
import type { World } from '../rendering/World';
export class Controls {
  keys = new Set<string>();
  buffered = new Map<string, number>();
  mouseUntil = 0;
  mouse = { x: innerWidth * 0.5, y: innerHeight * 0.4, down: false };
  lastAim = { x: 0, z: -1 };
  padButtons: boolean[][] = [];
  constructor(
    public save: Save,
    public world: World,
  ) {
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0 && e.target === world.canvas) {
        this.mouse.down = true;
        this.mouseUntil = 0.18;
      }
    });
    window.addEventListener('mouseup', () => (this.mouse.down = false));
    window.addEventListener('blur', () => this.clear());
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }
  press(code: string) {
    this.keys.add(code);
    this.buffered.set(code, 0.18);
  }
  clear() {
    this.keys.clear();
    this.buffered.clear();
    this.mouseUntil = 0;
    this.mouse.down = false;
  }
  read(game: Game): Input[] {
    const b = this.save.bindings,
      down = (name: string) =>
        this.keys.has(b[name]) ||
        (['fire', 'dash', 'detonate', 'p2fire', 'p2dash', 'p2detonate'].includes(name) &&
          (this.buffered.get(b[name]) ?? 0) > 0);
    const inputs = game.players.map((p, i) => {
      const pre = i ? 'p2' : '';
      const x = Number(down(pre + 'right')) - Number(down(pre + 'left')),
        z = Number(down(pre + 'down')) - Number(down(pre + 'up'));
      const input = idleInput();
      input.x = x;
      input.z = z;
      input.fire = down(pre + 'fire') || (i === 0 && (this.mouse.down || this.mouseUntil > 0));
      input.dash = down(pre + 'dash');
      input.interact = down(pre + 'interact');
      input.detonate = down(pre + 'detonate');
      if (i) {
        if (x || z) this.lastAim = { x, z };
        input.aim = this.lastAim;
      } else {
        const aim = this.world.aim(this.mouse.x, this.mouse.y);
        input.aim = { x: aim.x - p.x, z: aim.z - p.z };
      }
      return input;
    });
    const pads = navigator.getGamepads?.() ?? [];
    for (const pad of pads) {
      if (!pad) continue;
      const index = game.players.length === 2 ? (pad.index === 0 ? 1 : 0) : 0;
      if (!inputs[index]) continue;
      const input = inputs[index];
      const axis = (i: number) => (Math.abs(pad.axes[i] ?? 0) > 0.18 ? pad.axes[i] : 0);
      input.x += axis(0);
      input.z += axis(1);
      if (axis(2) || axis(3)) input.aim = { x: axis(2), z: axis(3) };
      input.fire ||= pad.buttons[7]?.pressed || pad.buttons[0]?.pressed;
      input.dash ||= pad.buttons[1]?.pressed;
      input.interact ||= pad.buttons[2]?.pressed;
      input.detonate ||= pad.buttons[3]?.pressed;
      const last = this.padButtons[pad.index] ?? [];
      if (pad.buttons[5]?.pressed && !last[5])
        game.switchWeapon(index, game.players[index].weapon + 1);
      if (pad.buttons[4]?.pressed && !last[4])
        game.switchWeapon(index, game.players[index].weapon - 1);
      this.padButtons[pad.index] = pad.buttons.map((b) => b.pressed);
    }
    for (const [key, value] of this.buffered) {
      if (value <= 1 / 60) this.buffered.delete(key);
      else this.buffered.set(key, value - 1 / 60);
    }
    this.mouseUntil = Math.max(0, this.mouseUntil - 1 / 60);
    for (const p of game.players) {
      if (inputs[p.id].fire && p.cooldown <= 0) {
        this.buffered.delete(b[p.id ? 'p2fire' : 'fire']);
        if (p.id === 0) this.mouseUntil = 0;
      }
    }
    return inputs;
  }
}

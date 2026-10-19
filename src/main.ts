import './style.css';
import { ARENAS, WEAPONS, type Difficulty, type Mode, type WeaponKind } from './core/data';
import { Game, UPGRADES } from './core/game';
import { bindKey, loadSave, writeSave } from './core/save';
import { World } from './rendering/World';
import { AudioManager } from './audio/AudioManager';
import { Controls } from './app/Input';
const app = document.querySelector<HTMLDivElement>('#app')!,
  modalRoot = document.querySelector<HTMLDivElement>('#modal-root')!,
  canvas = document.querySelector<HTMLCanvasElement>('#world')!;
const save = loadSave();
const audio = new AudioManager(save);
let world: World;
try {
  world = new World(canvas);
} catch {
  document.querySelector('#loading')!.innerHTML =
    '<strong>WebGL is unavailable</strong><p>BREACH requires a desktop browser with hardware acceleration. Enable it in your browser settings and reload.</p>';
  throw Error('WebGL renderer initialization failed');
}
world.setQuality(save.graphics);
world.reducedMotion = save.reducedMotion;
const controls = new Controls(save, world);
let game: Game | null = null,
  paused = false,
  arenaIndex = 0,
  mode: Mode = 'survival',
  difficulty: Difficulty = 'normal',
  selectedCharacter = 0,
  screen = 'menu',
  settingsTab = 'audio',
  remapping: string | null = null,
  lastTime = 0,
  accumulator = 0,
  uiTimer = 0,
  frameCount = 0,
  fps = 0,
  fpsTime = 0,
  completedHandled = false,
  modalReturn: HTMLElement | null = null;
const logo = `<svg viewBox="0 0 40 44" aria-hidden="true"><path d="M21 2 37 11 31 20 27 13 21 10 11 16 11 28 19 33 19 42 3 33 3 12Z" fill="currentColor"/><path d="m25 22 12-7v17l-12 7v-9l5-3v-4l-5 3Z" fill="currentColor"/></svg>`;
const arrow =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg>';
const arenaGlyphs = [
  `<path d="M10 34h60M18 30V12m44 18V12M16 12h4m40 0h4M26 30V19h28v11M32 18c0-13 16-13 16 0M40 5v-3M37 30v-7h6v7"/>`,
  `<path d="M10 34h60M14 31V17h6V12h9V8h22v4h9v5h6v14M22 31V21m9 10V16m9 15V13m9 18V16m9 15V21"/>`,
  `<path d="M10 34h60M14 30V14h7v-5h6v5h26V9h6v5h7v16M34 31V20q6-9 12 0v11M14 18h13m26 0h13"/>`,
  `<path d="M10 34h60M17 29V15h46v14M14 15h52M20 12h40M26 9h28M26 29V16m14 13V16m14 13V16M10 30l4-8 5 8"/>`,
  `<path d="M10 34h60M20 31V12h12v19m16 0V12h12v19M17 12h46M32 16h16M34 30V22q6-8 12 0v8M22 8h8m20 0h8"/>`,
  `<path d="M10 34h60M13 31V17h14V12h9V6h8v6h9v5h14v14M18 17q2-9 6 0m12-5q4-13 8 0m12 5q2-9 6 0M36 31V22h8v9"/>`,
];
function glyph(i: number) {
  return `<svg class="arena-glyph" viewBox="0 0 80 42" fill="none" stroke="currentColor" stroke-width="1.3">${arenaGlyphs[i]}</svg>`;
}
function number(n: number) {
  return Math.floor(n).toLocaleString('en-US');
}
function keyLabel(key: string) {
  return key
    .replace('Key', '')
    .replace('Digit', '')
    .replace('Arrow', '')
    .replace('Numpad', 'Num ')
    .replace('ShiftLeft', 'L Shift')
    .replace('ShiftRight', 'R Shift')
    .replace('Space', 'Space');
}
function persist() {
  writeSave(save);
}
function checkpoint() {
  if (!game) return;
  save.highScore = Math.max(save.highScore, game.score);
  save.bestWave = Math.max(save.bestWave, game.wave);
  if (game.tactical)
    save.unlockedWeapons = [
      ...new Set([...save.unlockedWeapons, ...[...game.unlockedWeapons].map((i) => WEAPONS[i].id)]),
    ];
  persist();
}
function menu() {
  checkpoint();
  screen = 'menu';
  game = null;
  paused = false;
  controls.clear();
  closeModal();
  world.loadArena(arenaIndex);
  world.clear(world.entities);
  world.objects.clear();
  audio.pause(false);
  audio.stopEffects();
  void audio.setAmbient(null);
  void audio.setMusic('menu');
  const a = ARENAS[arenaIndex];
  const locked = (mode === 'operations' || mode === 'coop') && !save.unlockedArenas.includes(a.id);
  app.innerHTML = `<div class="menu-shade"></div><header class="topbar"><a class="brand" href="#" aria-label="BREACH home">${logo}<span>BREACH<span class="brand-sub">RESPONSE DIVISION</span></span></a><nav><span class="status"><i></i> SYSTEMS ONLINE</span><button class="icon-button sound-toggle" aria-label="${save.muted ? 'Unmute' : 'Mute'} audio">${save.muted ? '◌' : '◖))'}</button><button class="text-button" id="settings">SETTINGS <span>⚙</span></button></nav></header>
 <main class="lobby"><section class="hero"><div class="eyebrow"><span class="line"></span> INDIA OPERATIONS / SEASON 01</div><h1>BREACH<span class="title-dot">.</span></h1><p class="tagline">Iconic arenas.<br><span>Endless chaos.</span></p><p class="intro">The world is familiar. The threat isn't.<br>${locked ? 'Complete the previous operation to unlock this zone.' : 'Gear up. Hold the line. Close the breach.'}</p><div class="mode-label">CHOOSE YOUR MISSION <span>01 — 04</span></div><div class="mode-grid">${(
   [
     ['survival', 'Survival', 'Endless waves'],
     ['operations', 'Operations', 'Tactical missions'],
     ['coop', 'Local Co-op', 'Two operators'],
     ['deathmatch', 'Deathmatch', 'First to 5'],
   ] as const
 )
   .map(
     ([id, title, sub], i) =>
       `<button class="mode-button ${mode === id ? 'selected' : ''}" data-mode="${id}" aria-pressed="${mode === id}"><span class="mode-icon">${['⌁', '◇', '⇄', '⌖'][i]}</span><span>${title}<small>${sub}</small></span>${mode === id ? '<span class="selected-dot"></span>' : ''}</button>`,
   )
   .join(
     '',
   )}</div><div class="deploy-row"><button class="deploy" id="deploy" ${locked ? 'disabled title="Complete the previous operation to unlock this arena"' : ''}>${locked ? 'LOCKED' : 'DEPLOY'} ${arrow}</button><label class="difficulty">THREAT LEVEL<select id="difficulty" aria-label="Difficulty"><option value="easy" ${difficulty === 'easy' ? 'selected' : ''}>RECRUIT</option><option value="normal" ${difficulty === 'normal' ? 'selected' : ''}>STANDARD</option><option value="hard" ${difficulty === 'hard' ? 'selected' : ''}>VETERAN</option></select></label></div><div class="hero-links"><button id="how-to">HOW TO PLAY <span>↗</span></button><span>/</span><button id="operator">OPERATOR ${String(selectedCharacter + 1).padStart(2, '0')} <i class="swatch c${selectedCharacter}"></i></button></div></section>
 <aside class="location-card"><div class="location-line"><span class="live-dot"></span> LIVE BREACH ZONE <span class="zone-number">0${arenaIndex + 1}</span></div><h2>${a.name}</h2><p>${a.location}</p><div class="location-bottom"><span>◈ ${a.subtitle}</span><span>3D ARENA</span></div></aside><div class="scene-note"><span class="crosshair-small">+</span> ${arenaIndex === 0 ? '27.1751° N / 78.0421° E' : 'RESPONSE SATELLITE / FEED 0' + (arenaIndex + 1)}<br><span class="scene-note-sub">LIVE ENVIRONMENT RENDER</span></div></main>
 <section class="arena-deck" aria-label="Arena selection"><div class="deck-heading"><span>SELECT DROP ZONE <b>06</b></span><span>ONE COUNTRY. SIX FRONTLINES.</span></div><div class="arena-list">${ARENAS.map((a, i) => `<button class="arena-card ${i === arenaIndex ? 'active' : ''}" data-arena="${i}" aria-pressed="${i === arenaIndex}"><span class="arena-top"><span>0${i + 1}</span>${save.completed.includes(a.id) ? '<span class="completed-check">✓ CONTAINED</span>' : i === arenaIndex ? '<span class="card-live">● ACTIVE</span>' : '<span>↗</span>'}</span>${glyph(i)}<strong>${a.name}</strong><span class="arena-city">${a.location.split(' · ')[0]}</span><span class="card-bar"></span></button>`).join('')}</div></section>
 <footer><span>© BREACH / AN ORIGINAL ARCADE EXPERIENCE</span><div><span class="audio-indicator">${audio.unlocked ? 'AUDIO ONLINE' : 'CLICK TO ENABLE AUDIO'}</span><button id="records">SERVICE RECORD</button><button id="credits">CREDITS</button><span class="version">V1.0</span></div></footer>`;
  app.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(
    (b) =>
      (b.onclick = () => {
        mode = b.dataset.mode as Mode;
        menu();
      }),
  );
  app.querySelectorAll<HTMLButtonElement>('[data-arena]').forEach(
    (b) =>
      (b.onclick = () => {
        arenaIndex = Number(b.dataset.arena);
        menu();
        void audio.setMusic('selection');
      }),
  );
  document
    .querySelector('#difficulty')!
    .addEventListener(
      'change',
      (e) => (difficulty = (e.target as HTMLSelectElement).value as Difficulty),
    );
  document.querySelector('#deploy')!.addEventListener('click', () => void start());
  document.querySelector('#settings')!.addEventListener('click', () => settings());
  document.querySelector('#how-to')!.addEventListener('click', help);
  document.querySelector('#credits')!.addEventListener('click', credits);
  document.querySelector('#records')!.addEventListener('click', records);
  document.querySelector('#operator')!.addEventListener('click', characters);
  document.querySelector('.sound-toggle')!.addEventListener('click', toggleMute);
}
async function start(options?: { arena?: number; mode?: Mode; seed?: number }) {
  if (options?.arena !== undefined) arenaIndex = options.arena;
  if (options?.mode) mode = options.mode;
  screen = 'game';
  closeModal();
  game = new Game({
    arena: arenaIndex,
    mode,
    difficulty,
    seed: options?.seed ?? Date.now(),
    loadout:
      mode === 'operations' || mode === 'coop' ? (save.unlockedWeapons as WeaponKind[]) : undefined,
  });
  completedHandled = false;
  paused = false;
  accumulator = 0;
  controls.clear();
  world.loadArena(arenaIndex);
  world.playerSuit = selectedCharacter;
  world.clear(world.entities);
  world.objects.clear();
  audio.stopEffects();
  audio.pause(false);
  hud();
  await audio.unlock();
  if (screen !== 'game') return;
  void audio.setMusic('calm');
  void audio.setAmbient(ARENAS[arenaIndex].id);
}
function hud() {
  app.innerHTML = `<div class="hud"><div class="hud-top"><div class="mission-panel"><div class="mini-brand">${logo}<span>${ARENAS[arenaIndex].subtitle}</span></div><h3 id="mission-title">${mode === 'deathmatch' ? 'LOCAL DEATHMATCH' : mode === 'survival' ? 'HOLD THE LINE' : 'CONTAIN THE BREACH'}</h3><p id="mission-copy">${mode === 'deathmatch' ? 'First to 5 eliminations · friendly fire enabled' : mode === 'survival' ? 'Survive the incursion. Clear waves to earn upgrades.' : ARENAS[arenaIndex].mission}</p><div id="objectives"></div></div><div class="wave-panel"><span id="wave-label">INCOMING</span><strong id="wave-value">01</strong><span id="hostiles">BREACH DETECTED</span></div><div class="tactical-panel"><div class="score-line"><span>SCORE</span><strong id="score">0</strong><button id="pause" aria-label="Pause game">Ⅱ</button></div><canvas id="minimap" width="160" height="150" aria-label="Tactical map"></canvas><span id="fps">60 FPS</span></div></div><div id="boss-bar"></div><div class="mission-alert" id="alert"></div><div class="crosshair" id="crosshair">+</div><div class="hud-bottom"><div class="players-panel" id="players"></div><div class="arsenal"><div class="weapon-detail"><span id="weapon-title"></span><span id="ammo"></span></div><div class="weapon-slots">${WEAPONS.map((w, i) => `<button data-weapon="${i}" ${game?.unlockedWeapons.has(i) ? '' : 'disabled'} title="${w.name}: ${w.description}" aria-label="Select ${w.name}"><span>${(i + 1) % 10}</span><b>${w.short}</b><i></i></button>`).join('')}</div><div class="control-strip"><span><kbd>W A S D</kbd> MOVE</span><span><kbd>SHIFT</kbd> DASH</span><span><kbd>F</kbd> INTERACT / REVIVE</span><span><kbd>R</kbd> DETONATE</span></div></div><div class="upgrade-panel"><button id="upgrade-button">UPGRADE <span id="credits-count">1</span></button><span>ESC / P TO PAUSE</span></div></div></div>`;
  document.querySelector('#pause')!.addEventListener('click', pause);
  document.querySelector('#upgrade-button')!.addEventListener('click', () => upgrades());
  app
    .querySelectorAll<HTMLButtonElement>('[data-weapon]')
    .forEach((b) => (b.onclick = () => game?.switchWeapon(0, Number(b.dataset.weapon))));
  updateHud();
}
function updateHud() {
  if (!game || screen !== 'game') return;
  const g = game,
    p = g.players[0];
  document.querySelector('#wave-label')!.textContent =
    mode === 'deathmatch' ? 'FIRST TO 5' : 'WAVE';
  document.querySelector('#wave-value')!.textContent =
    mode === 'deathmatch'
      ? g.players.map((p) => p.frags).join(':')
      : String(Math.max(1, g.wave)).padStart(2, '0');
  document.querySelector('#hostiles')!.textContent =
    g.waveDelay > 0
      ? `NEXT WAVE IN ${Math.ceil(g.waveDelay)}s`
      : `${g.enemies.length + g.spawnLeft} HOSTILES`;
  document.querySelector('#score')!.textContent = number(g.score);
  document.querySelector('#fps')!.textContent =
    `${fps} FPS · ${g.streak > 1 ? g.streak + '× STREAK' : 'LINK ACTIVE'}`;
  document.querySelector('#weapon-title')!.textContent = WEAPONS[p.weapon].name;
  document.querySelector('#ammo')!.textContent =
    p.ammo[p.weapon] < 0 ? '∞ / UNLIMITED' : `${p.ammo[p.weapon]} / ${g.capacity(p, p.weapon)}`;
  document.querySelector('#players')!.innerHTML = g.players
    .map(
      (p) =>
        `<div class="player-health p${p.id}"><div><span class="player-number">P${p.id + 1}</span><strong>${p.hp <= 0 ? 'DOWNED' : `OPERATOR 0${p.id + 1}`}</strong><b>${Math.ceil(p.hp)}<small> / ${p.maxHp}</small></b></div><div class="health-track"><i style="width:${(p.hp / p.maxHp) * 100}%"></i></div><span class="power-label">${
          p.hp <= 0
            ? mode === 'coop'
              ? `HOLD INTERACT NEARBY TO REVIVE ${Math.round((p.revive / 2) * 100)}%`
              : 'RESPAWNING…'
            : Object.entries(p.powers)
                .map(([k, v]) => `${k.toUpperCase()} ${Math.ceil(v!)}s`)
                .join(' · ') || `DASH ${p.dash <= 0 ? 'READY' : p.dash.toFixed(1) + 's'}`
        }</span>${p.id === 1 ? `<small>${WEAPONS[p.weapon].name} · ${p.ammo[p.weapon] < 0 ? '∞' : p.ammo[p.weapon]} ROUNDS</small>` : ''}</div>`,
    )
    .join('');
  document.querySelector('#objectives')!.innerHTML = g.tactical
    ? g.objectives
        .map(
          (o) =>
            `<span class="objective-chip ${o.underAttack > 0 ? 'danger' : ''}">${String.fromCharCode(65 + o.id)} <b>${o.active ? Math.max(0, Math.ceil(o.hp)) + '%' : 'OFFLINE'}</b></span>`,
        )
        .join('') +
      `<span class="objective-chip">STOLEN <b>${g.extracted}/4</b></span>${['hawa', 'gateway'].includes(g.arena.id) ? `<span class="objective-chip">SECURED <b>${g.recovered}/5</b></span>` : ''}${g.arena.id === 'gateway' ? `<span class="objective-chip">ESCORT <b>${Math.round(g.escort.progress * 100)}%</b></span>` : ''}`
    : '';
  const alert = document.querySelector('#alert')!;
  alert.textContent = g.alert;
  alert.classList.toggle('visible', g.alertUntil > g.time);
  document.querySelector('#credits-count')!.textContent = String(p.credits);
  app
    .querySelectorAll<HTMLElement>('[data-weapon]')
    .forEach((b) => b.classList.toggle('active', Number(b.dataset.weapon) === p.weapon));
  app
    .querySelectorAll<HTMLButtonElement>('[data-weapon]')
    .forEach((b) => (b.disabled = !g.unlockedWeapons.has(Number(b.dataset.weapon))));
  const boss = g.enemies.find((e) => e.kind === 'boss');
  document.querySelector('#boss-bar')!.innerHTML = boss
    ? `<span>BREACH SOVEREIGN · PHASE ${boss.phase}</span><div><i style="width:${Math.max(0, (boss.hp / boss.maxHp) * 100)}%"></i></div>`
    : '';
  drawMap(g);
}
function drawMap(g: Game) {
  const el = document.querySelector<HTMLCanvasElement>('#minimap');
  if (!el) return;
  const c = el.getContext('2d')!,
    x = (n: number) => ((n + 22) / 44) * 160,
    z = (n: number) => ((n + 20) / 42) * 150;
  c.fillStyle = '#14272bd9';
  c.fillRect(0, 0, 160, 150);
  c.strokeStyle = '#436064';
  c.strokeRect(1, 1, 158, 148);
  c.fillStyle = '#64736c';
  for (const o of g.arena.obstacles)
    c.fillRect(x(o.x - o.w / 2), z(o.z - o.d / 2), (o.w / 44) * 160, (o.d / 42) * 150);
  for (const [objects, color, size] of [
    [g.enemies, '#f29a69', 2],
    [g.objectives, '#71c8df', 4],
    [g.players, '#b7ffe7', 3],
  ] as const) {
    c.fillStyle = color;
    for (const p of objects) {
      c.beginPath();
      c.arc(x(p.x), z(p.z), size, 0, Math.PI * 2);
      c.fill();
    }
  }
}
function openModal(title: string, content: string, wide = false) {
  modalReturn = document.activeElement as HTMLElement;
  modalRoot.innerHTML = `<div class="modal-shade"><section class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${title}"><header><div><span class="eyebrow">BREACH / RESPONSE SYSTEMS</span><h2>${title}</h2></div><button class="close-modal" aria-label="Close dialog">×</button></header>${content}</section></div>`;
  modalRoot.querySelector('.close-modal')!.addEventListener('click', () => {
    if (screen === 'game' && paused) pauseMenu();
    else closeModal();
  });
  (modalRoot.querySelector('button') as HTMLButtonElement)?.focus();
}
function closeModal() {
  modalRoot.innerHTML = '';
  remapping = null;
  modalReturn?.focus();
  if (screen === 'menu') void audio.setMusic('menu');
}
function toggleMute() {
  save.muted = !save.muted;
  audio.applySettings();
  persist();
  if (screen === 'menu') menu();
}
function pause() {
  if (!game || game.status !== 'playing') return;
  paused = !paused;
  controls.clear();
  audio.pause(paused);
  if (paused) pauseMenu();
  else closeModal();
}
function pauseMenu() {
  paused = true;
  audio.pause(true);
  openModal(
    'Operation paused',
    `<p class="modal-intro">Take a breath. Your operation will wait.</p><div class="stack-buttons"><button class="deploy" id="resume">RESUME OPERATION ${arrow}</button><button id="pause-settings">SETTINGS</button><button id="restart">RESTART OPERATION</button><button id="return">RETURN TO COMMAND</button></div>`,
  );
  modalRoot.querySelector('.close-modal')!.addEventListener(
    'click',
    () => {
      paused = false;
      audio.pause(false);
      closeModal();
    },
    { once: true },
  );
  document.querySelector('#resume')!.addEventListener('click', () => {
    paused = false;
    audio.pause(false);
    closeModal();
  });
  document.querySelector('#pause-settings')!.addEventListener('click', () => settings());
  document.querySelector('#restart')!.addEventListener('click', () => void start());
  document.querySelector('#return')!.addEventListener('click', menu);
}
function settings() {
  const tabs = ['audio', 'graphics', 'controls'];
  let content = '';
  if (settingsTab === 'audio')
    content = `<p class="modal-intro">Your sound. Your battlefield. Changes apply immediately.</p><div class="sliders">${Object.entries(
      save.audio,
    )
      .map(
        ([key, value]) =>
          `<label><span>${{ master: 'Master volume', music: 'Music', combat: 'Weapons & player effects', environment: 'Environment', enemies: 'Enemy sounds', ui: 'Interface', voice: 'Mission alerts' }[key]}<output id="value-${key}">${Math.round(value * 100)}%</output></span><input type="range" min="0" max="1" step="0.01" value="${value}" data-bus="${key}" aria-label="${key} volume"></label>`,
      )
      .join(
        '',
      )}</div><label class="checkbox"><input type="checkbox" id="mute-all" ${save.muted ? 'checked' : ''}> Mute all audio</label><p class="fineprint">Original synthesized soundtrack · no streaming · browser audio activates on interaction</p>`;
  if (settingsTab === 'graphics')
    content = `<div class="settings-group"><label>Rendering quality<select id="graphics"><option value="low" ${save.graphics === 'low' ? 'selected' : ''}>Low — no shadows</option><option value="medium" ${save.graphics === 'medium' ? 'selected' : ''}>Medium — balanced</option><option value="high" ${save.graphics === 'high' ? 'selected' : ''}>High — full resolution</option></select></label><label class="checkbox"><input type="checkbox" id="motion" ${save.reducedMotion ? 'checked' : ''}> Reduce camera motion & explosion shake</label><p class="fineprint">Tip: choose Low if you experience dropped frames. All gameplay and audio remain available.</p></div>`;
  if (settingsTab === 'controls')
    content = `<p class="modal-intro">Select a binding, then press a key. Duplicate and reserved keys are rejected.</p><div class="bindings">${Object.entries(
      save.bindings,
    )
      .map(
        ([action, key]) =>
          `<button data-bind="${action}"><span>${action.startsWith('p2') ? 'P2 · ' + action.slice(2) : 'P1 · ' + action}</span><kbd>${keyLabel(key)}</kbd></button>`,
      )
      .join(
        '',
      )}</div><p class="fineprint" id="binding-note">Mouse: aim & fire · 1–0: weapons · Esc/P: pause<br>Gamepad: move/aim sticks, RT/A fire, B dash, X interact, Y detonate, LB/RB weapons. First gamepad controls P2 in local multiplayer.</p>`;
  openModal(
    'Settings',
    `<div class="tabs">${tabs.map((t) => `<button data-tab="${t}" class="${settingsTab === t ? 'active' : ''}">${t.toUpperCase()}</button>`).join('')}</div>${content}`,
  );
  modalRoot.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(
    (b) =>
      (b.onclick = () => {
        settingsTab = b.dataset.tab!;
        settings();
      }),
  );
  modalRoot.querySelectorAll<HTMLInputElement>('[data-bus]').forEach(
    (input) =>
      (input.oninput = () => {
        save.audio[input.dataset.bus!] = Number(input.value);
        audio.applySettings();
        persist();
        document.querySelector(`#value-${input.dataset.bus}`)!.textContent =
          Math.round(Number(input.value) * 100) + '%';
      }),
  );
  document.querySelector('#mute-all')?.addEventListener('change', (e) => {
    save.muted = (e.target as HTMLInputElement).checked;
    audio.applySettings();
    persist();
  });
  document.querySelector('#graphics')?.addEventListener('change', (e) => {
    save.graphics = (e.target as HTMLSelectElement).value as typeof save.graphics;
    world.setQuality(save.graphics);
    persist();
  });
  document.querySelector('#motion')?.addEventListener('change', (e) => {
    save.reducedMotion = (e.target as HTMLInputElement).checked;
    world.reducedMotion = save.reducedMotion;
    persist();
  });
  modalRoot.querySelectorAll<HTMLButtonElement>('[data-bind]').forEach(
    (b) =>
      (b.onclick = () => {
        remapping = b.dataset.bind!;
        b.querySelector('kbd')!.textContent = 'PRESS KEY';
      }),
  );
}
function help() {
  openModal(
    'Field manual',
    `<div class="help-grid"><section><h3>01 / MOVE & FIGHT</h3><p>Move with <kbd>WASD</kbd>, aim with your mouse, and fire with a click or <kbd>Space</kbd>. Dash with <kbd>Shift</kbd> to evade incoming fire.</p><h3>02 / BUILD YOUR DEFENSE</h3><p><kbd>Q/E</kbd> or <kbd>1–0</kbd> switch weapons. Fire to deploy equipment. Shoot barrels for chain reactions; <kbd>R</kbd> detonates remote charges. Explosives can hurt you.</p><h3>03 / PROTECT THE MISSION</h3><p>Orange saboteurs attack relays. Cyan scavengers steal cells and escape through portals. Hold <kbd>F</kbd> near cells to secure them, near relays to repair them, or near a downed teammate to revive.</p></section><section><h3>04 / LOCAL MULTIPLAYER</h3><p>P2 moves and aims with arrow keys. <kbd>${keyLabel(save.bindings.p2fire)}</kbd> fires, <kbd>${keyLabel(save.bindings.p2next)}</kbd> switches weapons, <kbd>Enter</kbd> interacts, right <kbd>Shift</kbd> dashes. All keys can be remapped in Settings.</p><h3>05 / GET STRONGER</h3><p>Clear waves to earn upgrade points. Use UPGRADE to improve weapons. Collect glowing pickups for healing, ammunition, shields, and temporary combat boosts.</p><h3>06 / WIN THE OPERATION</h3><p>Operations last 4 waves including a boss. Keep every relay intact and stop 4 extractions. Hawa: secure 5 cells. Hampi: activate 3 transmitters. Harbor: secure 5 cells and escort the drone. Survival continues endlessly.</p></section></div><p class="fineprint">Desktop keyboard/mouse or gamepad recommended. Progress saves locally in this browser. All six arenas and all equipment are available in Survival and Deathmatch. Operations unlock campaign zones and requisition one new weapon each wave.</p>`,
    true,
  );
}
function records() {
  openModal(
    'Service record',
    `<div class="record-grid"><div><strong>${number(save.highScore)}</strong><span>HIGH SCORE</span></div><div><strong>${String(save.bestWave).padStart(2, '0')}</strong><span>BEST WAVE</span></div><div><strong>${save.completed.length}/6</strong><span>OPERATIONS COMPLETE</span></div></div><div class="record-list">${ARENAS.map((a) => `<p><span>${a.name}</span><strong>${save.completed.includes(a.id) ? 'CONTAINED ✓' : 'AWAITING DEPLOYMENT'}</strong></p>`).join('')}</div>`,
  );
}
function credits() {
  void audio.setMusic('credits');
  openModal(
    'Built for the breach',
    `<p class="modal-intro">An original, open source arcade game.</p><div class="credits-copy"><h3>DESIGN, CODE & PROCEDURAL ART</h3><p>Created for LakshmiNarayanan2003 / BREACH.</p><h3>ORIGINAL SOUNDTRACK & SOUND DESIGN</h3><p>BREACH Synthesis Lab — deterministic original compositions and synthesized effects. All bundled audio is dedicated to the public domain under CC0 1.0. No sampled recordings or third-party music.</p><h3>BUILT WITH</h3><p>Three.js · TypeScript · Vite · Web Audio<br>Original source code: MIT license. See repository for full credits.</p><h3>YOUR DATA STAYS WITH YOU</h3><p>Settings, scores, and achievements are saved in this browser. No accounts, tracking, or gameplay servers.</p></div>`,
  );
}
function characters() {
  openModal(
    'Select operator',
    `<p class="modal-intro">Two field suits. A veteran finish unlocks after your first successful operation.</p><div class="character-options">${['FIELD / JADE', 'ASSAULT / AMBER', 'VETERAN / FROST'].map((label, i) => `<button data-character="${i}" class="${selectedCharacter === i ? 'active' : ''}" ${i === 2 && !save.completed.length ? 'disabled' : ''}><span class="operator-icon c${i}">◈</span><b>${label}</b><small>${i === 2 && !save.completed.length ? 'COMPLETE AN OPERATION' : 'SELECT SUIT'}</small></button>`).join('')}</div>`,
  );
  modalRoot.querySelectorAll<HTMLButtonElement>('[data-character]').forEach(
    (b) =>
      (b.onclick = () => {
        selectedCharacter = Number(b.dataset.character);
        save.cosmetic = selectedCharacter;
        persist();
        closeModal();
        menu();
      }),
  );
}
function upgrades(player = 0) {
  if (!game) return;
  paused = true;
  controls.clear();
  audio.pause(true);
  const p = game.players[player];
  openModal(
    'Field upgrades',
    `${game.players.length > 1 ? `<div class="tabs">${game.players.map((p) => `<button data-upgrade-player="${p.id}" class="${p.id === player ? 'active' : ''}">OPERATOR ${p.id + 1}</button>`).join('')}</div>` : ''}<p class="modal-intro">${p.credits} upgrade point${p.credits === 1 ? '' : 's'} available. Upgrades apply to your full arsenal.</p><div class="upgrade-grid">${UPGRADES.map((u) => `<button data-upgrade="${u}" ${p.credits <= 0 || p.upgrades[u] >= 5 ? 'disabled' : ''}><strong>${{ damage: 'Damage', fireRate: 'Fire rate', capacity: 'Ammo capacity', accuracy: 'Accuracy', projectiles: 'Projectile count', penetration: 'Penetration', blast: 'Blast radius', deployment: 'Deployment limit', recharge: 'Recharge' }[u]}</strong><span>${'▰'.repeat(p.upgrades[u])}${'▱'.repeat(5 - p.upgrades[u])} <b>+1</b></span></button>`).join('')}</div><button class="deploy full" id="upgrade-done">RETURN TO OPERATION ${arrow}</button>`,
  );
  modalRoot.querySelectorAll<HTMLButtonElement>('[data-upgrade]').forEach(
    (b) =>
      (b.onclick = () => {
        game!.upgrade(player, b.dataset.upgrade as (typeof UPGRADES)[number]);
        upgrades(player);
      }),
  );
  modalRoot
    .querySelectorAll<HTMLButtonElement>('[data-upgrade-player]')
    .forEach((b) => (b.onclick = () => upgrades(Number(b.dataset.upgradePlayer))));
  document.querySelector('#upgrade-done')!.addEventListener('click', () => {
    paused = false;
    audio.pause(false);
    closeModal();
  });
}
function finish() {
  if (!game || completedHandled) return;
  completedHandled = true;
  const g = game;
  save.highScore = Math.max(save.highScore, g.score);
  save.bestWave = Math.max(save.bestWave, g.wave);
  if (g.status === 'victory' && g.tactical) {
    if (!save.completed.includes(g.arena.id)) save.completed.push(g.arena.id);
    const next = ARENAS[Math.min(5, g.options.arena + 1)].id;
    if (!save.unlockedArenas.includes(next)) save.unlockedArenas.push(next);
  }
  checkpoint();
  persist();
  audio.stopEffects();
  void audio.setMusic(g.status === 'victory' ? 'victory' : 'defeat');
  void audio.setAmbient(null);
  controls.clear();
  openModal(
    g.status === 'victory' ? 'Breach contained' : 'Signal lost',
    `<div class="result-emblem">${g.status === 'victory' ? '◇' : '⌁'}</div><p class="result-reason">${g.reason}</p><div class="record-grid"><div><strong>${number(g.score)}</strong><span>SCORE</span></div><div><strong>${g.kills}</strong><span>ELIMINATIONS</span></div><div><strong>${g.wave}</strong><span>WAVES</span></div></div><div class="stack-buttons"><button class="deploy" id="retry">${mode === 'deathmatch' ? 'REMATCH' : 'DEPLOY AGAIN'} ${arrow}</button>${g.status === 'victory' && g.tactical ? '<button id="next-arena">NEXT OPERATION →</button>' : ''}<button id="command">RETURN TO COMMAND</button></div>`,
  );
  modalRoot.querySelector('.close-modal')!.addEventListener('click', menu, { once: true });
  document.querySelector('#retry')!.addEventListener('click', () => void start());
  document.querySelector('#command')!.addEventListener('click', menu);
  document.querySelector('#next-arena')?.addEventListener('click', () => {
    arenaIndex = (arenaIndex + 1) % 6;
    void start();
  });
}
window.addEventListener('keydown', (e) => {
  if (remapping) {
    e.preventDefault();
    if (e.code === 'Escape') {
      remapping = null;
      settings();
      return;
    }
    const okay = bindKey(save, remapping, e.code);
    persist();
    remapping = null;
    settings();
    if (!okay)
      document.querySelector('#binding-note')!.textContent =
        'That key is already in use or reserved. Choose a different key.';
    return;
  }
  if (e.code === 'Tab' && modalRoot.children.length) {
    const focusable = [
      ...modalRoot.querySelectorAll<HTMLElement>('button:not(:disabled),input,select'),
    ];
    const first = focusable[0],
      last = focusable.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
    return;
  }
  if (e.code === 'Escape' || e.code === 'KeyP') {
    e.preventDefault();
    if (game && game.status === 'playing') {
      pause();
    } else closeModal();
    return;
  }
  if (screen !== 'game' || paused || modalRoot.children.length) return;
  if (Object.values(save.bindings).includes(e.code) || /^Digit\d$/.test(e.code)) e.preventDefault();
  controls.press(e.code);
  if (!game || e.repeat) return;
  const b = save.bindings;
  if (e.code === b.next) game.switchWeapon(0, game.players[0].weapon + 1);
  if (e.code === b.previous) game.switchWeapon(0, game.players[0].weapon - 1);
  if (e.code === b.p2next && game.players[1]) game.switchWeapon(1, game.players[1].weapon + 1);
  if (/^Digit\d$/.test(e.code)) game.switchWeapon(0, (Number(e.code.slice(-1)) + 9) % 10);
});
let unlocking = false;
async function ensureAudio() {
  if (unlocking || audio.ready) return;
  unlocking = true;
  await audio.unlock();
  unlocking = false;
  if (audio.ready) {
    void audio.setMusic(screen === 'menu' ? 'menu' : 'calm');
    const indicator = document.querySelector('.audio-indicator');
    if (indicator) indicator.textContent = 'AUDIO ONLINE';
  }
}
document.addEventListener('pointerdown', () => void ensureAudio());
document.addEventListener('keydown', () => void ensureAudio(), { once: true });
document.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('button')) void audio.play('ui-click', undefined, 1);
});
window.addEventListener('resize', () => world.resize());
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game?.status === 'playing' && !paused) pause();
  controls.clear();
  void audio.visibility(document.hidden);
});
window.addEventListener('blur', () => {
  if (game?.status === 'playing' && !paused) pause();
});
selectedCharacter = save.cosmetic;
menu();
function frame(time: number) {
  const dt = Math.min(0.15, (time - lastTime) / 1000 || 0.016);
  lastTime = time;
  frameCount++;
  fpsTime += dt;
  if (fpsTime >= 1) {
    fps = Math.round(frameCount / fpsTime);
    fpsTime = 0;
    frameCount = 0;
  }
  if (game && screen === 'game') {
    if (!paused && game.status === 'playing') {
      accumulator += dt;
      while (accumulator >= 1 / 60) {
        game.tick(1 / 60, controls.read(game));
        accumulator -= 1 / 60;
      }
    }
    const living = game.players.filter((p) => p.hp > 0),
      listener = living.length ? living : game.players;
    audio.listener = {
      x: listener.reduce((n, p) => n + p.x, 0) / listener.length,
      z: listener.reduce((n, p) => n + p.z, 0) / listener.length,
    };
    for (const e of game.events.splice(0)) {
      world.event(e);
      if (e.sound)
        void audio.play(
          e.sound,
          e,
          e.type === 'alert' ? 5 : e.type === 'damage' ? 4 : e.type === 'fire' ? 3 : 2,
        );
    }
    uiTimer += dt;
    if (uiTimer > 0.1) {
      uiTimer = 0;
      updateHud();
      if (!paused && game.status === 'playing')
        void audio.setMusic(
          game.enemies.some((e) => e.kind === 'boss')
            ? 'boss'
            : game.objectives.some((o) => o.underAttack > 0 || o.hp < 30) ||
                game.enemies.some((e) => e.carry)
              ? 'suspense'
              : game.enemies.length > 15 || game.players.some((p) => p.hp < 25)
                ? 'intense'
                : game.wave >= 3
                  ? 'medium'
                  : 'calm',
        );
    }
    const cursor = document.querySelector<HTMLElement>('#crosshair');
    if (cursor) {
      cursor.style.left = controls.mouse.x + 'px';
      cursor.style.top = controls.mouse.y + 'px';
    }
    if (game.status !== 'playing') finish();
  }
  world.update(paused ? 0 : dt, time / 1000, game);
  document.querySelector('#loading')?.remove();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// Opt-in instrumentation for deterministic browser QA; absent during ordinary play.
if (new URLSearchParams(location.search).has('test')) {
  Object.assign(window, {
    __BREACH__: {
      get game() {
        return game;
      },
      audio,
      world,
      save,
      start,
      menu,
      get paused() {
        return paused;
      },
      setPaused(value: boolean) {
        paused = value;
        audio.pause(value);
      },
      snapshot() {
        return {
          status: game?.status,
          players: game?.players,
          wave: game?.wave,
          enemies: game?.enemies.length,
          projectiles: game?.projectiles.length,
          score: game?.score,
          audio: {
            state: audio.ctx?.state,
            music: audio.musicState,
            voices: audio.voices.length,
            level: audio.level(),
            errors: audio.errors,
          },
          render: world.stats,
        };
      },
    },
  });
}

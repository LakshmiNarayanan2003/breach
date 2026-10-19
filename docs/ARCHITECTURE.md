# Architecture

## Modules

- `src/core/data.ts`: weapon/enemy data, arena collision layouts, deterministic PRNG, vector helpers.
- `src/core/game.ts`: pure gameplay simulation. No DOM, WebGL or Web Audio dependency. `tick(dt, inputs)` advances the world and emits presentation events. Entity IDs are monotonically allocated per match.
- `src/core/navigation.ts`: bounded A*, swept projectile distance and radius-aware sliding movement.
- `src/core/save.ts`: versioned save validation, defaults and conflict-free keybinding updates.
- `src/rendering/World.ts`: original procedural architecture/characters, orthographic camera, particles, render synchronization and disposal.
- `src/audio/AudioManager.ts`: lazy PCM decoding/cache, shared context and buses, spatial effects, music state transitions and cleanup.
- `src/app/Input.ts`: keyboard/mouse and Gamepad API input mapping. Short action taps are buffered across render frames.
- `src/main.ts`: application lifecycle, menus, accessible dialogs, HUD, fixed-step scheduling, persistence and integration between systems.
- `scripts/generate_audio.py`: reproducible original audio generation using NumPy. Generated WAVs and a manifest are committed; Python is not a runtime dependency.

## Simulation and presentation

The simulation uses a fixed 1/60-second update. Rendering interpolates camera movement separately. Browser frame deltas are bounded to prevent a long background-tab stall from generating an enormous catch-up burst. On very slow rendering hardware this means simulation can run below wall-clock speed. Visibility loss pauses gameplay and suspends the audio context.

Input consists of movement, aim, fire, dash, interact and detonate values per player. Presentation events carry position, optional sound, text, damage or radius. This boundary permits a future network transport without treating static hosting as a multiplayer server. Online synchronization is not implemented.

The renderer reuses primitive geometry/materials, batches static architecture by material, caps particles at 250 and reuses particle meshes. Projectiles cap at 350 and pickups at 35. Character meshes are discarded when their simulation entities disappear. Static arena buffers and label textures are disposed when changing arenas. Player ground rings and labels remain visible through occluders; monument geometry stays solid. The camera follows a bounded fraction of the active player centroid and shows the full arena for co-op.

## Test instrumentation

`?test=1` enables `window.__BREACH__`, exposing the current simulation, renderer statistics, audio engine and a deterministic start API for browser QA. Ordinary launches do not expose it. The game has no competitive server or trusted remote state; client-side cheating is not a security boundary.

Browser tests use real input for movement, firing, local controls, settings and restart. Scenario tests deliberately set up boundary states to validate mission completion and failure transitions; they do not constitute full human playthroughs. The separate simulation controller completes all six operations using fixed successful seeds and an already-unlocked arsenal without changing health, ammo, enemies or objectives directly.

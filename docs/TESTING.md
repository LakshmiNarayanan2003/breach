# Verification record

Validation is performed in the cloud workspace using Node 24.19.0 and Chromium with software WebGL. Commands and exact test outcomes are retained in `artifacts/validation.log` after the final run. A live external deployment is a separate verification step.

## Tests

- **79 unit/integration/audio cases:** damage, invincibility, every weapon, cooldowns, ammunition, switching, swept projectile collision, railgun penetration, area damage, barrel chains, grenade fuses, mines, remote charges, barricades, every pickup and upgrade, movement/collision, all-arena paths and spawn clearance, actual sabotage and extraction, interruption/recovery, guardians, ranged/bomber/boss behavior, mission gates, escort, wave progression, boss spawn retry, co-op controls/revival, deathmatch damage/respawn/scoring, save corruption/persistence and key conflicts.
- **Six of those cases are full deterministic operation playthroughs:** Recruit difficulty, already-unlocked arsenal, ordinary initial health/ammo and fixed seeds 73 (Taj, Hawa, Fort, Gateway, Mysore) and 75 (Hampi). The input controller aims, fires, navigates, dashes, repairs, secures resources, escorts and spends earned upgrades. It does not set health, objectives, score, enemy deaths or wave completion. Each fixture must actually reach victory at wave four; there are no success retries in the committed test.
- **Audio content checks:** every bundled WAV has a valid PCM header, a nonzero RMS signal, no clipping, unique content and explicit licensing metadata. Music seams are checked for discontinuities.
- **14 production Chromium tests:** menu/all arenas, compact menu layout, real movement/fire/switching/deployment/pause, a real hostile kill, simultaneous co-op controls and revival, actual carrier extraction failure, all six mission boundary conditions, deathmatch match/rematch, settings/remapping persistence, every audio URL/browser decode/offline rendering, live analyser output and mute, music transitions/crossfade/voice limits, distinct weapon/explosion dispatch, campaign and cosmetic unlocks, restart GPU-texture cleanup, audio suspension/resumption, screenshots and browser errors.

Scenario-based browser victory tests deliberately prepare a post-boss boundary state. They are not represented as full playthroughs; full playthrough coverage comes from the separate simulation controller. Tests use opt-in `?test=1` instrumentation where direct scenario preparation or signal measurement is required.

## Commands

```sh
npm ci
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
npm audit
```

Browser tests require the production build. Playwright automatically starts a Vite preview server serving `/breach/`. It prefers the installed `/usr/bin/chromium`; otherwise use `npx playwright install chromium` to obtain the pinned browser. Test failures preserve a trace, error screenshot and HTML report. CI also uploads evidence artifacts.

`artifacts/menu.png`, `artifacts/gameplay.png`, `artifacts/arena-2.png` through `arena-6.png`, and `artifacts/mobile-menu.png` are actual browser captures, not invented visuals. The active-combat screenshot uses a deterministic prepared co-op scene and real weapon input; the other arena screenshots show actual initialized operations.

## Defects found and corrected

- Enemy spawn positions copied unrelated object fields: spawn now copies only coordinates.
- Short input taps could be missed between frames: action buffering uses simulation time and weapon-switch settling.
- Water incorrectly stopped weapon-height projectiles: water remains a movement obstacle but permits shots.
- Large enemy spawns overlapped some arena walls: spawn candidates now check the enemy's actual radius.
- Ranged/bomber damage skipped difficulty scaling: all attack categories now respect it.
- Returning to the menu discarded labels without disposal: renderer cleanup now disposes unique textures/materials.
- A blocked boss spawn could omit the required encounter: boss spawns are retried and victory requires an actual boss defeat.
- Initial test-tool versions had dependency advisories: test/lint dependencies were updated; the audit is repeated in the final run.

## What these results do not establish

Physical speaker output, subjective audio quality, real gamepad hardware, a 60 FPS hardware target, Safari/Firefox compatibility, every possible procedural seed, GitHub Actions execution or a public Pages deployment. These remain separate checks, recorded honestly in ROADMAP.md and the deployment handoff.

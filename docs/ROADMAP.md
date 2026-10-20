# Release scope and remaining work

The repository contains a playable game, not just a scene mockup: combat, tactical enemies, four modes, six arenas, progression, equipment, audio and victory/defeat behavior are implemented and tested. The complete aspirational brief is **not claimed fully complete**. The following limits remain explicit.

## Remaining product polish

- Weapon audio is original synthesis, not professionally recorded or externally mastered. Music is ten short eight-bar original compositions; longer arrangements and listening tests on physical speakers/headphones remain desirable.
- Rocket propulsion uses a launch tail and spatial impact, rather than a continuously tracked moving audio source. There is no dedicated critical-hit system or separate magazine/reload mechanic; ammunition is a reserve pool with automatic weapon cooldowns/recharge upgrades.
- Character animation is procedural and compact. Death uses a collapse/particles; the result screen carries victory feedback rather than a separate authored victory character animation. No skeletal animation assets are shipped.
- Landmark geometry is stylized and original. The flagship Taj scene is the most detailed; remaining arenas are simpler low-poly interpretations, not faithful architectural reconstructions. Camera occlusion is handled with visible player rings/labels, not dissolving building geometry.
- The first two operator options are color variants of one original response-unit model. The veteran variant is a progression unlock, not a separate character class.
- Enemies have finite-state behaviors and dynamic A* navigation, not a group-level strategic planner. Very congested routes can produce crowd bunching. Navigation is bounded and periodically refreshed.
- Touch gameplay supports dual sticks, dash, interaction, detonation, weapon selection, pause and upgrades in portrait/landscape. Touch controls Player 1; local multiplayer requires another keyboard/gamepad. Physical gamepads and split keyboard rollover have not been tested on hardware.

## Verification still needed

- Physical Android/iPhone/iPad testing and a broad GPU/browser hardware matrix remain outstanding. CI covers Chromium, Firefox and WebKit separately; passing WebKit automation is not physical Safari verification. Chromium in this environment uses software rendering; the project does not claim a measured 60 FPS on mid-range hardware. Low graphics disables shadows; medium/high retain them.
- Longer human balance sessions for all difficulties, campaign starter equipment, cooperative strategy and competitive rounds. Deterministic bots prove complete missions with fixed seeds and the full arsenal; they do not prove every seed, strategy or hardware combination is fair.
- Human sound-quality/accessibility review. Automated tests verify non-silent signals, decoding, spatial math, live mixing and lifecycle, not subjective enjoyment.
- Public GitHub Pages deployment and repository metadata are verified separately from the local build. Consult DEPLOYMENT.md for the actual publication state.

## Future expansion

1. Continuously spatialized rocket travel, richer music stems, longer compositions and mastering.
2. More authored animations, victory poses and additional operator silhouettes.
3. Critical hits, optional magazine/reload gameplay and clearer upgrade tradeoffs.
4. Measured phone/tablet hardware benchmarks, accessibility refinement and tested gamepad remapping.
5. Additional mission variants, difficulty tuning and arena decoration.
6. Optional online multiplayer with a real authoritative server. Static Pages hosting alone cannot provide one.

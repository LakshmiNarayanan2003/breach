# Audio system

## Signal routing

One user-gesture-unlocked AudioContext feeds:

```
PCM source → per-voice gain → stereo panner → category bus
Music source → crossfade gain → pause low-pass → music bus
Ambience loop → environment bus
Category buses → master gain → compressor → analyser → destination
```

Buses: Music, Weapons/Player, Environment, Enemies, Interface, Mission Alerts. Master and every bus have live sliders and persistent values. Mute sets master gain to zero. Mission Alerts is the nonverbal announcer bus; there are no recorded voices.

Sources decode lazily from a manifest under Vite's configured base path. Promises are shared per asset; decoded buffers are cached. Failed requests/decodes are recorded without throwing into the game loop. No streaming services or remote asset URLs are required.

## Effects and spatialization

Weapons have separate synthesized pressure pulses, noise spectra, mechanical transients and durations. The railgun uses a descending energy sweep; explosives combine a low-frequency pressure envelope, filtered noise and debris tail. All original samples are checked for nonzero RMS and unclipped amplitude.

Sounds pan by horizontal world displacement and attenuate by distance from the mean living-player position. Priority alerts retain an audible minimum gain. Source rates vary by ±4%. There are at most 28 active effects and four voices per sound. Repeated footsteps and individual sound triggers are rate-limited. Higher-priority sounds can steal lower-priority voices. A compressor and conservative gains control overlapping explosions. Mission warnings duck music briefly.

Short-lived weapon/impact/voice sounds use the event's position. Rocket launch/travel is represented by a synthesized propulsion tail at launch and a spatial impact; continuous moving-source tracking is not implemented. Enemy class and action pairs have distinct generated sounds. Pickup effects, footsteps, damage, dash, revival and equipment events have dedicated triggers.

## Music

Ten original eight-bar compositions share a deliberately related motif with different modes, tempos, percussion and energy. Music uses exact musical loop lengths and wrap-around delay mixing. `setMusic` is idempotent for the same state and uses revision guards to prevent late loads from replacing newer states. Old and new tracks crossfade over 1.2 seconds; stopped sources disconnect themselves.

State order during play: boss > objective danger/carrier suspense > dense combat/critical health > later waves > early waves. Menu, selection, credits, victory and defeat use separate compositions. Pause applies a low-pass filter and stops effects; visibility loss suspends the context. Returning to command cancels pending effect loads, stops effects/ambience and transitions to menu music. Buffers remain cached for efficient restart.

## Regeneration and licensing

The complete generated library is included. To regenerate it:

```sh
python3 -m venv /tmp/breach-audio-venv
/tmp/breach-audio-venv/bin/pip install numpy==2.3.5
/tmp/breach-audio-venv/bin/python scripts/generate_audio.py
```

Generation uses a fixed seed and no external recordings. Samples are mono, signed 16-bit PCM, 22,050 Hz; stereo placement happens in the browser. This conservative format is intentionally larger than compressed audio but easy to decode reliably. The library is approximately 12 MB.

Audio verification covers file content, all production URLs, browser decoding, OfflineAudioContext rendering, live analyser output, master/SFX mute, music transitions, effect dispatch and cleanup. It does not establish subjective sound quality through physical speakers, headphone spatial comfort or Safari/Firefox behavior; see TESTING.md.

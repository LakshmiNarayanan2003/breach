# Asset credits

## Original visuals

All landmark meshes, characters, robots, weapon models, props, portals, effects, UI, logo, favicon and social graphic were generated or drawn in this repository for BREACH. No models, textures or protected designs from the reference games were copied. Landmark scenes are stylized fictional interpretations, not architectural surveys. Original code and visual definitions use the repository's MIT license.

Menu glyphs and branding: original SVG paths. Labels use browser canvas text. Fonts use local system Arial/Helvetica/monospace fallbacks; no font files or remote font service are distributed.

Screenshots in `artifacts/` are actual Chromium captures of this implementation. They are not concept art or image-generation outputs.

## Third-party software

| Software                   | Purpose                            | License      |
| -------------------------- | ---------------------------------- | ------------ |
| Three.js                   | 3D renderer and geometry utilities | MIT          |
| TypeScript                 | Static type checking               | Apache-2.0   |
| Vite                       | Development server and bundling    | MIT          |
| Vitest                     | Simulation/audio tests             | MIT          |
| Playwright                 | Browser automation                 | Apache-2.0   |
| ESLint / typescript-eslint | Static linting                     | MIT          |
| Prettier                   | Source formatting                  | MIT          |
| NumPy                      | Offline audio regeneration only    | BSD-3-Clause |

Exact package versions and transitive dependencies are recorded in `package-lock.json`; package license files remain in their distributions. No third-party music or sampled sound library is included. Audio provenance is documented separately in AUDIO_CREDITS.md.

## References

The user supplied Boxhead 2Play and Mantar Jantar as gameplay/presentation references. Both URLs were attempted during development but the environment's network proxy returned 403. No claim of direct interactive study is made. The implementation follows the written brief's arcade movement, elevated camera and original landmark setting.

# Contributing

Use Node.js 24. Run `npm ci`, then `npm run dev`. Use the existing checkout; a separate worktree is unnecessary for an isolated cloud task.

Keep simulation rules independent of Three.js and Web Audio. Add tests for behavioral changes, keep the seeded RNG deterministic, and ensure new sounds have explicit triggers, visual equivalents for critical warnings, and documented redistribution rights.

Before proposing a change run `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, and `npm run test:e2e`. Browser tests require Chromium and exercise the production `/breach/` base path. Review actual screenshots and console errors. Do not remove assertions, substitute silent audio, or claim physical-device validation from mocks.

Original code is MIT; original generated audio is CC0. Do not add assets without provenance. Preserve accessibility when muted and controls for both local players. Describe the gameplay behavior, validation and relevant limitations in pull requests.

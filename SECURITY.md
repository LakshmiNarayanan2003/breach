# Security and privacy

BREACH is a static, local browser game. It makes same-origin requests for code/audio assets and stores settings/progression in localStorage. There are no accounts, analytics, uploads, API keys or gameplay services.

Do not place credentials in the frontend, asset directory or saved environment instructions. Report a suspected vulnerability through the repository owner's available GitHub contact/security channel; do not include private credentials in a public issue. No claim is made that private vulnerability reporting is enabled for this repository.

Client-side scores and saves are user-editable by design. A future online mode must validate authoritative state on a server rather than trusting these values.

Run `npm audit` when updating dependencies. Development servers are for trusted development environments. GitHub Pages serves only the generated `dist/` artifact, not the source checkout or npm cache.

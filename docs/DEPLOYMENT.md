# GitHub and deployment

## Intended destination

- Existing repository: `LakshmiNarayanan2003/breach`
- Branch target: `master`
- GitHub Pages path: `/breach/`
- Intended public URL: `https://lakshminarayanan2003.github.io/breach/`

These values describe the requested target. A production build and workflow file do not establish that the public site is live.

## Pipeline

`.github/workflows/pages.yml` runs on pushes to master/main, pull requests and manual dispatch. It installs Node 24 and frozen npm dependencies, typechecks, lints, runs gameplay/integration/audio tests, builds, installs Chromium, and tests the real production application. Browser screenshots/reports are uploaded as artifacts. Only successful non-PR runs upload/deploy the Pages artifact using the official Pages actions and scoped Pages/ID-token permissions.

A repository administrator must select **GitHub Actions** as the Pages source if it is not already configured. The app has no secrets or paid-service prerequisites. The Pages environment may have repository-specific protection rules; those cannot be inferred from local files.

## Observed access

Native Git read access through the provided HTTPS proxy succeeds. The remote master initially matched `b47fb649a334c5c3adeea092dc9cfd1a8b6c7c63` (README and license only). GitHub CLI API requests initially returned `Forbidden`. A subsequent direct HTTPS request through the existing environment proxy succeeded without extracting any credentials. It confirmed administrator/push access and that Pages had not yet been enabled. No new credentials were requested or stored. The public target returned HTTP 404 before deployment.

Network additions for `api.github.com` and `lakshminarayanan2003.github.io` were saved to the environment draft, alongside the two user-specified reference sites. Draft saving does not apply the network policy or publish the environment. Review/save the changes in environment settings and publish the prepared environment when ready. That environment publication is distinct from deploying the website with GitHub Actions.

The API denied creating the Pages site with HTTP 403: `Resource not accessible by integration`. Repository description and topic writes were also denied. The reported user role is administrator, but this integration's write permissions are narrower. The official configure-pages action documents that automatic enablement requires a separate token with administration/pages write permissions; the default workflow GITHUB_TOKEN cannot enable the site. No credentials were requested.

**Required external action:** a repository administrator must open Settings → Pages and select GitHub Actions as the source (or grant the installed integration Administration: write and Pages: write). Once Pages is enabled, rerun the deployment workflow. Network-domain review alone cannot fix an integration-permission denial.

Source commit `1b4ab17e9ebeca49ef7c13185fd0a0d7254be1c9` was successfully pushed to `master`. GitHub queued the Validate and deploy BREACH workflow (run 39317257467). The final handoff records the completed workflow result. The intended public URL returned HTTP 404 before publication; no live release is claimed until actual deployed game assets are checked.

## Repository branding

Requested description:

> A free 3D browser arena shooter featuring iconic landmarks, enemy missions, explosive barrels, powerful weapons, dynamic music, and local co-op.

Requested topics: `threejs`, `typescript`, `vite`, `webgl`, `browser-game`, `3d-game`, `arena-shooter`, `top-down-shooter`, `zombie-survival`, `wave-survival`, `local-coop`, `game-ai`, `pathfinding`, `indian-landmarks`, `open-source`, `github-pages`.

The title, metadata, original logo/favicon, Open Graph SVG, robots.txt and sitemap are in the application. A raster PNG Open Graph image is included alongside its original SVG source for social-network compatibility.

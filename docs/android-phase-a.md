# SlashPromo Android Phase A — review-only PWA foundation

Status: **Draft / not deployed**. Repository production branch: `main`.

## Audit
- Current pages are framework-free static HTML/CSS/JS served from Cloudflare Pages root.
- Existing public navigation: header menu, quick city links, and client-side doctor directory.
- Cloudflare Functions + D1 provide analytics and admin/enquiry functionality; these must remain online-only and private.
- Existing responsive assets: `assets/theme.css`, `assets/home/landing.css`, `assets/site.js`, and `assets/favicon.svg`.
- Existing mobile audit workflow: `.github/workflows/manual-mobile-lighthouse.yml`.
- No pre-existing root manifest, root service worker, or Android source project was found in the paths audited.

## Proposed changes
- `manifest.webmanifest`: Android-first standalone metadata, shortcuts, SVG icons, install scope.
- `assets/pwa-icon.svg` and `assets/pwa-maskable.svg`: scalable icon concepts. **Raster 192/512 PNG validation still required for Android compatibility**; these SVGs are not final Play Store artwork.
- `sw.js`: stores only a static noindex offline page and icon assets; no visited pages, network data, API results, doctor profiles, searches, analytics, form submissions, or credentials are cached.
- `offline.html`: educational-only offline fallback; no stale medical schedules.
- `assets/pwa-mobile.{js,css}`: app-only bottom tabs in standalone viewports up to 767px; existing website navigation unchanged for ordinary browser visitors. Suppresses PWA bootstrap on admin, analytics, enquiries and review routes.
- `assets/site.js`: additive lightweight loader; existing logic retained.
- `scripts/test-pwa-phase-a.mjs` and `.github/workflows/pwa-phase-a.yml`: review-time static contract tests and syntax checks.

## Deployment and privacy safeguards
1. Merge only after explicit owner review; no production changes in this branch.
2. Cloudflare Pages preview may publish non-production review output depending on preview rules. Do not expose the QA dashboards or credentials to preview visitors.
3. Service worker intercepts **same-origin public GET navigations only**, passes through valid online responses, and serves an offline fallback on network failure. It does not persist viewed pages.
4. Never cache POST requests, GET API responses, private endpoints, medical queries, OTP flows, or location-related data.
5. Doctor and hospital facts remain sourced from verified Slashcure pages. The app doesn't claim booking or live availability.
6. Analytics remain existing first-party website analytics; do not introduce app device identifiers in Phase A.

## Acceptance test checklist (manual before merge)
- Run `node scripts/test-pwa-phase-a.mjs`; verify GitHub Actions status.
- Check Lighthouse PWA/installability on Android Chrome with manifest/icons; add and validate PNG icons before production release if required.
- Install standalone preview on Android and inspect Home/Find/Cities/News tabs at 320px, 360px, 393px and 412px.
- Verify normal browser site menu/city navigation unchanged, responsive page content not obstructed.
- Verify `/#find-doctors`, `/cities/`, `/health-news/`, `/hospitals/`, public profile routes and external Slashcure links.
- Simulate airplane mode: previously fetched public page should show offline screen rather than stale OPD times.
- Verify no admin, questions API, private analytics, or enquiry responses in Cache Storage, and no offline handling for private routes.
- Confirm Android trusted-web-activity requirements: valid Android signing, digital asset links, store icons and privacy disclosures; none are included in this Phase A PR.

## Rollback
Revert the PWA loader commit and delete the new PWA assets via a separate approved PR. Service worker removal additionally requires an explicit unregister/migration strategy for already installed users; plan before any production rollout.

# SlashPromo premium design rollout — staged, reversible

Status as of 2026-11-09. User requested gradual rollout of the approved premium homepage look across the site, rather than an uncontrolled global change.

## Rules
1. Update one page or a small related batch at a time, not every page in one change.
2. Preserve current HTML and content in a named `backup/` GitHub branch **before** changes.
3. Reuse `assets/city-premium.css` and `assets/city-premium.js` for city pages opt-in; do not globally restyle doctor's professional profiles or privacy pages.
4. Retain canonical URL, city-specific SEO/GEO metadata, title/description, structured data, doctors/hospitals/clinics/labs links, original Slashcure links, WhatsApp-first contact, moderated public Q&A, social media links, and contextual Slashcure ad.
5. Retain original doctor and hospital records; do not invent providers or self-publish onboarding records.
6. Test Cloudflare branch preview, GitHub checks, search + specialty filters, hospital links, Q&A and footer; merge a single audited PR.
7. After live deployment verify the same production URL and all functional sections. If any regression cannot be fixed quickly, restore the affected single HTML from backup rather than revert the whole repository.

## Completed before phase 1
- Premium homepage: `/`, backup `backup/homepage-before-redesign-20261109`
- Premium Sukkur city: `/sukkur/`, backup `backup/sukkur-before-premium-20261109`
- Compact Sukkur doctor cards and filters: `/sukkur/`, backup `backup/sukkur-before-doctor-compact-20261109`

## Phase 1 (this PR)
- Khairpur city `/khairpur/`: premium dark-blue hero, accessible local name/specialty search, two existing doctor records with actual specialty filters, two hospital/clinic profiles, matching brand/color and policy footer.
- Prior version backup `backup/khairpur-before-premium-20261109`, file `khairpur/index.html`.
- New opt-in shared assets: `assets/city-premium.css` and `assets/city-premium.js`.
- Shared `assets/native-directory.js` adds Neurologist facet and allows other cities to opt into existing six-card preview behavior. It does not auto-change other cities.

## Phase 2 — Shikarpur (this PR)
- Route: `/shikarpur/` upgraded with shared premium hero/search, a Shikarpur-only local directory (physiotherapy, general surgery and dermatology tabs), premium doctor and hospital cards, and footer matching national homepage.
- Reuse existing `assets/city-premium.css` and `assets/city-premium.js` and add Shikarpur-specific card styling in `assets/shikarpur-premium.css`.
- Preserve all 3 existing doctor links, 3 original hospital profiles, city-only category routes, SEO canonical, public Q&A, social, WhatsApp and Slashcure advertising.
- Original pre-redesign Shikarpur HTML fully preserved in branch `backup/shikarpur-before-premium-20261109`.
- Roll back by restoring **only** `shikarpur/index.html` from the backup branch onto a new branch from current main, then testing and merging. This avoids losing future doctor data or other pages.

## Phase 3 — Karachi (this PR)
- Only `/karachi/` receives the approved premium dark-blue/red city design. Existing other routes and all profile records are unchanged.
- Restoreable backup branch: `backup/karachi-before-premium-20261109`. Saved original source: https://github.com/hospitalpro26/slashpromo-site/blob/backup/karachi-before-premium-20261109/karachi/index.html
- Retain all nine Karachi doctor profiles and the individual Slashcure links, including the five Astro Physiocare-associated physiotherapy listings.
- Show six doctor cards initially, with "Show more doctors" for the remaining three. Render only locally represented specialty tabs (Physiotherapy, Neurology/Neurophysician and Surgery).
- Retain separate Astro Physiocare hospital profile, four Karachi clinic spotlight cards, Karachi physiotherapist specialty page, direct provider link dropdown, dynamic city Q&A, SEO CollectionPage/ItemList/FAQPage schema, canonical, social links, WhatsApp-first contact and mid-page Slashcure advertisement.
- Reuse existing `assets/city-premium.css` and `assets/city-premium.js`; add `assets/karachi-premium.css` scoped to `body.sp-karachi-premium`.
- Safe rollback restores only `karachi/index.html` from backup onto a fresh rollback branch based on current main. Avoid resetting all commits or touching doctor, hospital, Q&A or other city files.
- All changes require preview validation before merge, then live QA on the canonical URL.

## Planned next independent batches (NOT yet deployed)
1. Lahore `/lahore/`, including NEO Medical Center and local doctor links.
2. Hyderabad, Pano Aqil and remaining active city pages, one city at a time.
3. City specialty subpages and hospital directory/clinic pages.
4. Doctor and hospital profile templates; avoid modifying unique data or structured schema.
5. Remaining public information pages; maintain high contrast and text readability.

## Safe rollback for Khairpur
1. From **current** main, open a fresh rollback branch.
2. Restore only `khairpur/index.html` from
   https://github.com/hospitalpro26/slashpromo-site/blob/backup/khairpur-before-premium-20261109/khairpur/index.html
3. Run checks, merge and verify `https://slashpromo.com/khairpur/`.
4. Unused shared CSS and JavaScript can remain; they are harmless if no other page imports them.
5. Do not reset all main commits or overwrite new doctor listings.

No scheduled or background job is implied by this document; further pages require separate audited deployments.

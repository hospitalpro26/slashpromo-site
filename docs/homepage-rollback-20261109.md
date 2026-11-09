# SlashPromo Homepage Design Rollback — 9 November 2026

## Pre-redesign snapshot
- Original production homepage preserved exactly in the GitHub branch: `backup/homepage-before-redesign-20261109`.
- Original file: [index.html](https://github.com/hospitalpro26/slashpromo-site/blob/backup/homepage-before-redesign-20261109/index.html).
- New homepage design is developed on `design/homepage-premium-20261109`.
- Live demo remains at `/demohome/` (explicitly `noindex`).
- This backup preserves the complete previous HTML, SEO metadata, script references, static featured cards and footer—not merely a screenshot.
- All shared assets, provider pages and data remain in the original repository.

## Recommended rollback procedure
1. Open the backup branch link above and view `index.html`.
2. Create a fresh rollback branch from the **current** main branch, so other changes are preserved.
3. Replace only `index.html` with the exact content of the backup branch's `index.html` (using the GitHub file-editing API or normal git).
4. Open a pull request, run the site's SEO/doctor/hospital checks, and merge it.
5. Verify `https://slashpromo.com/`, search, WhatsApp contact, social media, and Slashcure advertising.
6. Do not reset the whole repository; restoring only index.html avoids undoing new doctor or hospital pages.

## Design scope
New homepage metadata includes national Pakistan scope and explicit locality mentions. Existing `/assets/site.js`, `/assets/social-glow.js`, `/assets/theme.css` continue serving analytics, sponsored strips, Slashcure advertising, WhatsApp-first enquiries and social icons. Existing provider pages and directory records were not modified.

## Quality and deployment
Cloudflare Pages is connected to the `main` branch, so a validated merge publishes this homepage. The old site remains available via the backup branch and normal GitHub file history.

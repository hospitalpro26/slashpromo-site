# Sukkur Homepage Rollback — 9 November 2026

## Original-page snapshot
The original `sukkur/index.html` was preserved in the backup branch
`backup/sukkur-before-premium-20261109` **before any redesign edits**.

Browse the original file:
https://github.com/hospitalpro26/slashpromo-site/blob/backup/sukkur-before-premium-20261109/sukkur/index.html

The redesigned file lives at `sukkur/index.html` on main after approval.
The redesign adds:
- `assets/sukkur-premium.css` (scoped page style);
- `assets/sukkur-premium.js` (search bridge).

## Safe rollback (one route only)
1. Create a rollback branch from the *current* `main` branch.
2. Restore only `sukkur/index.html` from `backup/sukkur-before-premium-20261109`. This removes references to the premium-only assets, so those files may remain harmlessly in the repository.
3. Open a GitHub pull request, review and run all checks.
4. Merge the rollback PR and confirm `https://slashpromo.com/sukkur/` displays the original landing page, doctor/hospital searches, community questions, and partner advertisements.
5. Do not reset or revert the entire repository, to avoid erasing later doctor and hospital updates.

## Important preservation rules
The redesign must preserve:
- All existing doctor profiles, hospitals, specialties and direct provider links;
- Existing SEO canonical/schema and city-specific Sukkur content;
- Current `assets/native-directory.js` / `assets/directory.json` live search;
- `assets/city-questions.js` and moderation / question posting;
- `assets/site.js` analytics, WhatsApp-first contact and privacy-conscious location preference;
- `assets/social-glow.js` links and existing Slashcure partner promotion;
- Hospital/physiotherapy/gastroenterology and city resource sections.

This is a complete versioned HTML backup in GitHub, not just a screenshot.

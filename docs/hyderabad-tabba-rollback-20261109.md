# Hyderabad Tabba Heart Institute release and rollback — 9 November 2026

## Verified source and scope
Source: https://slashcure.com/hospitals/hyderabad/tabba-heart-institute
Source shows **13 unique doctors** associated with the Hyderabad outreach center.
The existing SlashPromo directory has **2 individual Hyderabad doctor profiles**.
The Hyderabad city page and new specialty guide now present **15 unique names**.

## Public changes (after approved merge)
- Hyderabad landing page: https://slashpromo.com/hyderabad/
- New hospital page: https://slashpromo.com/hospitals/hyderabad/tabba-heart-institute/
- New "Find Best Doctors in Hyderabad" directory: https://slashpromo.com/doctors/hyderabad/
- Hospital listing added to `assets/directory.json` and visible in the national hospitals directory.
- Added both canonical URLs to `sitemap.xml`.
- Static HTML cards with responsive speciality filters, name search and six-card Show More behavior.
- All 13 Tabba doctor's name links go to the **one verified Slashcure hospital profile**, not invented personal profiles.
- Existing Hyderabad doctors retain their own local/Slashcure links.
- No Tabba doctors are added as individual rows to the GitHub doctor-onboarding index, and no doctor-specific OPD schedules or availability fields were copied.

## Reversibility
The original Hyderabad page, hospital directory and sitemap are preserved on a dedicated branch:
`backup/hyderabad-before-tabba-20261109`.

To revert just this release while retaining subsequent work:
1. Branch from **current main** and restore `hyderabad/index.html` from the backup branch.
2. Remove the hospital record `hyderabad-tabba-heart-institute` from `assets/directory.json`.
3. Remove the two added sitemap entries; restore Hyderabad's previous lastmod if needed.
4. Remove new `hospitals/hyderabad/tabba-heart-institute/index.html`, `doctors/hyderabad/index.html` and associated Hyderabad Tabba-only assets, if no subsequent pages use them.
5. Run site/SEO/Q&A audits, open a PR, and verify the live page. Do **not** reset the whole repository and inadvertently erase other city and doctor changes.

## QA checklist
- No duplicate doctors; all 13 source-linked names matched to Tabba Hyderabad public listing.
- Verify city page, hospital page and doctor guide all use canonical URLs with no noindex.
- Verify both new pages appear in the sitemap and in-site navigation.
- On Hyderabad city and dedicated directory, initial 6 doctor cards; Show more reveals 6 and then remaining 3.
- Hospital page contains 13 Tabba doctors and connects each to the exact source link.
- No individual doctor schedules/times/availability copied, stored or shown.
- Verify search by names ("Siham", "Rehana"), cardiology and surgery specialty filters.
- Preserve moderated local Q&A and WhatsApp-first contact.
- Verify all four social links, privacy/legal/footer links and hospital directory listing.
- Verify IndexNow workflow after merge; Google indexing is not guaranteed simply by publishing a sitemap.

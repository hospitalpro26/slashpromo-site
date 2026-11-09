# Hussain Diagnostic Center Khairpur release and rollback

## Verified source
- Public Slashcure page: https://slashcure.com/hospitals/khairpur/hussain-diagnostic-center
- Address: Opposite Civil Hospital, Khairpur Mir's, Sindh, Pakistan
- Source-listed doctors (2): Dr. Muhammad Hussain Abro (Ultrasound Specialist / Sonologist) and Dr. Safdar Ali Tunio (Gastroenterologist / Consultant Physician)
- Published center services: ultrasound imaging, laboratory testing, endoscopy and physician consultations for digestive, liver and general medicine
- **No doctor dates, weekly schedules, OPD times or current availability copied.** For live information, users must open the exact source provider profile.

## New/updated routes
- New canonical hospital directory page: https://slashpromo.com/hospitals/khairpur/hussain-diagnostic-center/
- Updated Khairpur city: https://slashpromo.com/khairpur/
- Updated Khairpur best-doctors directory: https://slashpromo.com/doctors/khairpur/
- Updated national hospitals list: https://slashpromo.com/hospitals/
- Updated laboratories category: https://slashpromo.com/laboratories/

The Khairpur doctor directory contains 18 distinct names: 12 Ali Medical Center doctors, five Health Care Clinic doctors with one shared general surgeon counted once (16), plus two newly source-listed doctors from Hussain Diagnostic Center. The two new names do not get fictional independent SlashPromo doctor profiles, and the existing 92-person individual-doctor registry is unchanged.

## Structured records and search
- `assets/khairpur-hussain-diagnostic-roster.json` is the source-attributed, schedule-free two-person roster.
- `assets/directory.json` adds one facility record with `listingScope: institutional-only`, `linkedDoctorIds: []` and the exact matching Slashcure hospital profile. This is not a claim of independently verified doctor employment.
- Accessible speciality filters for `Sonologists & Ultrasound Specialists` and `Gastroenterologists` on Khairpur city, doctor directory and hospital page.
- `sitemap.xml` contains the unique new hospital URL and refreshed lastmod for updated pages.
- `llms.txt` documents all 18 local doctor names and their source profiles; `llms-full.txt` lists every canonical sitemap URL, and `ai.txt` gives a compact AI-discovery summary. These AI-readable files are not a search-engine/AI indexing guarantee.
- Public reviews, Q&A moderation, privacy and WhatsApp-first site enquiry settings remain unchanged.

## Rollback
Original pre-feature files are protected on GitHub branch:
`backup/khairpur-before-hussain-diagnostic-20261110`

If rollback is necessary, branch from **current** `main` and selectively restore the modified files from backup: Khairpur city and doctors pages, national hospitals and laboratories pages, `assets/directory.json`, `assets/khairpur-doctors.js`, and `sitemap.xml`. Remove newly added diagnostic hospital page and roster. Remove `llms.txt`, `llms-full.txt` and `ai.txt` only if no subsequent update depends on them. Run audits and merge review PR. **Never reset the entire repository** or discard unrelated doctor onboarding work.

## Release QA
- Verify exact new clinic page, canonical, XML sitemap and AI discovery URLs.
- Exactly 2 Hussain Diagnostic Center doctors on its page; exactly 18 unique Khairpur doctors on city and best-doctors pages; Show more 6→12→18.
- Search "Hussain Abro" and "Safdar"; test Ultrasound/Sonologists and Gastroenterologists filters.
- Verify other Khairpur doctors, facility links and source-linked doctor cards remain intact.
- Confirm clinic address and services grounded to public source, no OPD times, no misleading clinical "best" rankings.
- Confirm national hospital directory count now 18 and Khairpur facility count now 3.
- Validate Cloudflare staging and post-production, hospital-affiliation audit, site SEO/QA audit, IndexNow where available. Google or AI indexing is not guaranteed.

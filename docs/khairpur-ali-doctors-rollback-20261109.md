# Ali Medical Center Khairpur doctor-directory release — 2026-11-09

## Source and inclusion rules
Public source: https://slashcure.com/hospitals/khairpur/ali-medical-center-khairpur
The source's hospital roster lists **12 named doctors**. Dr. Ashfaque Ali balouch/Baloch is already a SlashPromo individual Khairpur doctor, so this release uses his existing canonical profile `/doctors/khairpur/dr-ashfaque-ali-baloch/` rather than adding a duplicate. The 11 remaining Ali Medical Center names link directly to the **one original public Slashcure hospital page**, not invented individual doctor profiles.

The Khairpur directory also retains Dr. Kanwal Aijaz at Health Care Clinic Khairpur: **13 unique doctors total** (12 Ali + 1 Health Care Clinic).

The source roster at `assets/khairpur-ali-roster.json` contains **only** names, specialties, group and source link. No OPD weekdays, appointment dates/times, availability, leave or emergency status is reproduced.

## Changes included
- `/khairpur/`: embeds searchable 13-doctor section; existing hospital/clinic search remains unchanged.
- `/doctors/khairpur/`: new SEO/GEO directory titled "Find Best Doctors in Khairpur"; 13 static doctor cards, accessible live-search, specialty count pills, Show more +6 and helpful source-linked hospital cards.
- `/hospitals/khairpur/ali-medical-center-khairpur/`: updated premium hospital page, "Find Best Doctors at Ali Medical Center in Khairpur" H1, all 12 doctor names, facility location and 100% source transparency.
- `assets/khairpur-doctors.js` + `assets/khairpur-ali.css` opt into Khairpur only; no other city templates changed.
- `sitemap.xml`: one new canonical directory URL, updated Ali hospital date.
- `functions/_lib/qa.js`: narrowly allow moderated `/doctors/khairpur/` questions under the existing Khairpur city scope. All questions still require consent, Turnstile and moderator approval.
- Existing SlashPromo doctor profile and hospital directory database `assets/directory.json` remains **unchanged**; no duplicate individual doctor registrations, no fake physician profile URLs.

## Enhancements compared with Tabba Hyderabad
- Specialty chips display the **number of matching doctors**, not just categories.
- Live accessible result count and a clear zero-match state.
- Distinguish verified individual doctor profiles from hospital-sourced roster listings on every card.
- Six cards initially, then six more per click, with SEO-friendly full HTML before JS.
- Three-way Khairpur navigation (city, dedicated doctor directory, Ali hospital) and FAQ structured data.
- Card source links do not imply patient rankings or verified appointment availability.

## Backups and rollback
The original Khairpur city page, Ali hospital page, and sitemap before this release are protected on GitHub branch `backup/khairpur-before-ali-roster-20261109`.

Safe rollback: create a new branch from **current** main; restore only `khairpur/index.html` and `hospitals/khairpur/ali-medical-center-khairpur/index.html` from backup; remove `doctors/khairpur/index.html` and the one sitemap URL; restore Q&A scope only if the directory is removed; remove new unused Khairpur-only files if no later pages reference them. Review a PR and run checks. **Never reset the whole repository**, which could erase later doctor onboarding changes.

## Testing and indexing
- Confirm 12 hospital names, 13 Khairpur city/directory names, no duplicate surname-normalized profile.
- Confirm all hospital-linked doctor names and buttons point to the exact original Slashcure Ali Medical Center profile.
- Confirm Dr. Ashfaque Ali Baloch and Dr. Kanwal Aijaz retain their current individual SlashPromo profile links.
- Check patient-friendly search, specialty counts, Show more 6→12→13, no schedule data, responsive and no duplicate IDs.
- Preserve Khairpur Q&A, privacy/contact/social links and Slashcure advertising.
- Verify canonical, ItemList, MedicalClinic, FAQPage markup and the sitemap, then inspect the production domain.
- IndexNow submission or sitemap publication **does not guarantee Google indexing**.

# Health Care Clinic Khairpur premium roster and deduplication — 9 November 2026

## Source and scope
- Source: https://slashcure.com/hospitals/khairpur/health-care-clinic-khairpur
- Published clinic page lists **five** distinct doctors: Dr. Abida Chandio (Gynecologist & Obstetrician), Dr. Kanwal Aijaz (Consultant Neurophysician), Dr. Sadaf Sagar Chandio (General Surgeon), Dr. Saeeda Chandio (Paediatrician) and Dr. Sardar Ali Chandio (Diabetologist).
- The previous Khairpur directory contained 13 names, including Dr. Kanwal Aijaz and Dr. Sadaf Sagar Chandio. Dr Sadaf is also on Ali Medical Center's published 12-doctor roster.
- New citywide count is therefore **16 distinct doctors** (12 at Ali Medical Center + 5 at Health Care Clinic - 1 cross-listed doctor). Dr Kanwal was already counted in the previous 13; the new unique names are Dr Abida Chandio, Dr Saeeda Chandio and Dr Sardar Ali Chandio.
- The five clinic names and specialty groups are stored, without schedules or status, in `assets/khairpur-health-care-roster.json`.

## Pages updated
- `/hospitals/khairpur/health-care-clinic-khairpur/`: premium royal-blue/red hospital-style header, "Find Best Doctors at Health Care Clinic in Khairpur", five source-linked doctor cards, clinic address at Chandia More/Civil Hospital Road, public clinic contact numbers, breadcrumb and MedicalClinic/ItemList/FAQ schema.
- `/doctors/khairpur/` and `/khairpur/`: **16 unique doctors** with correct specialties, the existing initial six-card preview, Show more, source-linked provider cards and no duplicated Dr Sadaf or Dr Kanwal. 
- Dr Sadaf's one citywide card links to **both** Ali Medical Center and Health Care Clinic's source hospital pages. Her individual profile is not invented.
- Dr Kanwal retains `/doctors/khairpur/dr-kanwal-aijaz/`. Dr Ashfaque Ali Baloch retains his existing individual profile.
- `assets/khairpur-doctors.js`: a new **Diabetologists** filter, versioned across the edited pages so visitor caches reload the code.
- `assets/directory.json`: update the existing Health Care Clinic record's publicly sourced service summary and address but **do not** add new doctor rows or expand the individual `linkedDoctorIds` list beyond Dr Kanwal.
- `hospitals/index.html`: updated Health Care Clinic spotlight and link to its own Slashcure source instead of merely Dr Kanwal's profile.
- `sitemap.xml`: update existing clinic page's lastmod. No new canonical route is created, since all three updated routes already exist.

## Editorial and privacy controls
- The 5-doctor clinic roster comes from its source hospital page. All four without individual SlashPromo doctor profiles open the source clinic page. Do not imply that "best doctors" is an independently verified ranking.
- No copied doctor-specific dates, weekly OPD times, live availability, leave or booking data.
- Existing WhatsApp-first contact, opt-in location preferences, privacy/footer, social channels and moderated Q&A remain unchanged.
- Clinical claims, locations and telephone numbers are only presented as publicly published source information.

## Rollback
Exact pre-change GitHub backup: `backup/khairpur-before-health-care-roster-20261110`. To reverse this work, **branch from current main** and restore only changed paths from backup: Khairpur city, doctors directory, Health Care Clinic page, hospitals index, doctor filter script, directory record and sitemap; optionally delete now-unused `assets/khairpur-health-care-roster.json`. Test and merge a review PR. Do **not** reset the entire repository or disturb unrelated doctor onboarding.

## Release checks
- Static source count: 5 clinic cards, 16 city cards, 16 dedicated-directory cards; every card for a unique name.
- Search for Sardar returns only Dr Sardar Ali Chandio; diabetologists filter matches one; general surgeons filter returns exactly Abubakar Phulpoto and Sadaf Sagar Chandio; gynecologists filter returns three; show more 6→12→16.
- Check both source links on one Dr Sadaf card; Dr Kanwal and Dr Ashfaque preserve their personal profile routes.
- Clinic page contains the correct source transparency, address, no doctor schedules and canonical / social / FAQ structured data.
- GitHub site/hospital affiliation audits, Cloudflare preview, and production live/public smoke checks must pass before marking as complete.

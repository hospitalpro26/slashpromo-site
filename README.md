# SlashPromo — Healthcare in the Spotlight

Public website: https://slashpromo.com  
Repository: hospitalpro26/slashpromo-site  
Hosting: Cloudflare Pages, production branch `main`

## Purpose
Nationwide healthcare promotion and editorial spotlights, welcoming doctors, hospitals, laboratories, and clinics from every city in Pakistan. This is a separate site from Slashcure.com and HospitalPro.online.

## Architecture
Framework-free static HTML, CSS and JavaScript:
- `index.html` — national homepage
- `cities/index.html` and `{city}/index.html` — geographic pages
- `doctors/`, `hospitals/`, `laboratories/`, `clinics/` — categories
- `about/`, `advertise/`, `contact/`, `faq/` — company pages
- `privacy/`, `terms/`, `cookie-policy/`, `advertising-policy/`, `editorial-policy/`, `accessibility/` — policies
- `assets/theme.css`, `assets/site.js`, `assets/social-glow.js` — shared styling / interactions
- `robots.txt`, `sitemap.xml`, `404.html` — crawler/navigation essentials

## Operational notes
- Cloudflare Pages should deploy the repository root (`/`) without a build step.
- All pages declare their canonical URL on `slashpromo.com`.
- The social icon block uses Slashcure's existing **official** Facebook, Instagram, WhatsApp and LinkedIn links, clearly indicating those profiles belong to the partner brand. SlashPromo profiles have not been invented.
- Initial published profile cards are **editorial examples, not paid advertisements**. Mark actual paid placements as sponsored.
- Existing external links may change; check them before promoting a campaign.
- No analytics or paid billing is implemented yet; these require distinct decisions and policy updates.
- For city campaigns, create unique pages with reviewed descriptions and valid canonical URLs, then update sitemap.
- Never use this repository to modify HospitalPro or Slashcure.

Contact for advertising and corrections: info@slashcure.com

## Nationwide doctor finder
- The homepage's `#find-doctors` section has searchable name/keyword, city/area suggestions (open to any city), and an exact specialty select.
- `assets/native-directory.js` performs native in-browser filtering of `assets/directory.json`; it never redirects searches to Slashcure. Known city slugs use the `city` parameter; other city/area text uses `loc`. The keyword is forwarded as `q` and specialties as `specialty`.
- Newly approved providers are added to `assets/directory.json` and receive a dedicated local profile page. Directory additions currently require a repository update until the private admin publishing workflow is completed.
- All filtering occurs on SlashPromo, including name/keyword, city and specialty.
- Privacy policy describes the local browser search; do not enter private patient information into public search.

## Local profile publishing
- Directory data: `assets/directory.json` (currently seeded from HospitalPro published registries and additional Sukkur profile information).
- Doctor pages: `/doctors/<city>/<doctor-name>/`; Sukkur hospital pages: `/hospitals/sukkur/<facility-name>/`.
- Update both JSON and profile page when adding doctors. Never claim live OPD timings without verified current provider updates.
- Search is an independent SlashPromo experience; public profile links to Slashcure or HospitalPro may be offered for reference only.


## Slashcure referral advertisement
- The approved slim blue/white banner, moving multicolor top line, and sequential wave lettering are styled in `assets/slashcure-strip.css`.
- The Sukkur doctor/hospital page includes a **static, SEO-readable city-specific banner** after the doctor directory and before the hospital directory; it replaces the former oversized panel.
- `assets/site.js` loads `assets/slashcure-strip.js` for other appropriate public pages. The script chooses localized copy using page route, doctor/hospital name, city and specialty and inserts **one** banner in the middle of landing/city pages or near the bottom of doctor and hospital profiles.
- This is a link to Slashcure, not a replacement for SlashPromo's own native directory search. The admin dashboard, advertising inquiry flow, contact page, editorial and legal pages are excluded.
- The dynamically inserted banners use text content rather than interpolated HTML for provider names. `prefers-reduced-motion` disables animations.
- Verify Cloudflare Pages has published the latest GitHub commit before reporting that the changes are live.

### Hospital profile publication rule
Hospital and healthcare facility pages must only be published on SlashPromo when at least one named doctor in `assets/directory.json` has a supported association to that facility. Each hospital record carries `linkedDoctorIds`, referencing existing doctor IDs. The client-side hospital search hides entries without at least one valid linked doctor. A clinic affiliation in this directory is based on published profile information and must be confirmed with providers; it is not proof of current appointment availability. Do not auto-create unsupported hospital pages from city hospital names or external search results. When an association is withdrawn, review the hospital page, internal links, sitemap and any redirects. HospitalPro and Slashcure may maintain separate institutional listings and are not governed by this SlashPromo-only rule.

To prevent unsupported hospital listings reappearing, run `node scripts/audit-hospital-affiliations.mjs`. The GitHub hospital directory integrity workflow also runs this check on pushes and pull requests. It verifies hospital pages, matching `linkedDoctorIds`, underlying doctor records, published affiliation text, profile links and sitemap entries.

## Dual doctor/hospital navigation (6 November 2026)
- Each SlashPromo directory card has its own local profile link and a separate Slashcure destination. The native search renderer produces both links without requiring post-render card patches; static fallback cards are progressively upgraded by `assets/cross-profile-links.js`.
- The shared cross-profile script also places both destinations on doctor and hospital hero sections, including the custom Dr. Ziauddin Hospital page.
- Exact individual Slashcure profile URLs appear only where the provider record contains a correctly shaped, matching doctor or hospital URL. Missing doctor destinations use a clearly labeled name-and-city Slashcure search; missing hospital destinations use the Slashcure hospitals directory. A hospital link is never mislabeled as a doctor's personal profile.
- All changes stay within the SlashPromo repository; HospitalPro and Slashcure source sites are not modified by this rollout.

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
- `assets/doctor-finder.js` forwards the search to Slashcure's authoritative `/doctors` directory rather than maintaining a duplicate static doctor list. Known city slugs use the `city` parameter; other city/area text uses `loc`. The keyword is forwarded as `q` and specialties as `specialty`.
- The search intentionally opens results on Slashcure, so newly added approved doctors appear in the source directory without a SlashPromo redeploy. It does not yet display results directly on SlashPromo.
- City and specialty URL filtering is supported by the public directory. Verify name/keyword filtering against Slashcure's live query handling when testing the deployment; coordinate with the Slashcure search implementation if its query parameter differs.
- Privacy policy discloses the cross-domain search handoff; no patient details should be entered into the public search.

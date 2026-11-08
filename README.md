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
Hospital pages may claim named doctor affiliation only when doctors in `assets/directory.json` explicitly support that affiliation and both doctor and hospital pages link to one another. Each hospital record carries `linkedDoctorIds` referencing doctor IDs. For user-requested institutional directories, an explicitly marked `listingScope: institutional-only` hospital may remain published with no SlashPromo doctor association only if its published Slashcure hospital URL matches the facility, the page clearly discloses the unverified local doctor roster, and no doctor affiliation is invented. The generic doctor-associated hospital search may continue to hide institutional-only entries until real doctors are linked. A clinic affiliation in this directory is based on published profile information and must be confirmed with providers; it is not proof of current appointment availability. Do not auto-create unsupported hospital pages from city hospital names or external search results. When an association is withdrawn, review the hospital page, internal links, sitemap and any redirects. HospitalPro and Slashcure may maintain separate institutional listings and are not governed by this SlashPromo-only rule.

To prevent unsupported hospital listings reappearing, run `node scripts/audit-hospital-affiliations.mjs`. The GitHub hospital directory integrity workflow also runs this check on pushes and pull requests. It verifies hospital pages, matching `linkedDoctorIds`, underlying doctor records, published affiliation text, profile links and sitemap entries.

## Dual doctor/hospital navigation (6 November 2026)
- Each SlashPromo directory card has its own local profile link and a separate Slashcure destination. The native search renderer produces both links without requiring post-render card patches; static fallback cards are progressively upgraded by `assets/cross-profile-links.js`.
- The shared cross-profile script also places both destinations on doctor and hospital hero sections, including the custom Dr. Ziauddin Hospital page.
- Exact individual Slashcure profile URLs appear only where the provider record contains a correctly shaped, matching doctor or hospital URL. Missing doctor destinations use a clearly labeled name-and-city Slashcure search; missing hospital destinations use the Slashcure hospitals directory. A hospital link is never mislabeled as a doctor's personal profile.
- All changes stay within the SlashPromo repository; HospitalPro and Slashcure source sites are not modified by this rollout.

## City questions and answers (8 November 2026)
- Shared module: `assets/city-questions.js`, directly referenced on all six city pages; styles: `assets/city-questions.css`.
- City landing pages: /sukkur/, /khairpur/, /shikarpur/, /ghotki/, /karachi/, /hyderabad/. These six city root pages receive city-wide Q&A. Doctor, hospital, specialty, clinic, laboratory, and health-topic pages in all six supported cities now receive their own moderated Q&A discussion via the shared loader in `assets/site.js`. Add new supported cities to both `assets/city-questions.js` and `functions/_lib/qa.js`.
- Public API: `GET /api/questions?city=sukkur` displays approved answers on the city root, and `GET /api/questions?city=sukkur&pagePath=/doctors/sukkur/dr-bashir-ahmed-khoso/` scopes answers to a Sukkur page; `POST /api/questions` accepts identified, consented questions **pending moderation**, protected by Cloudflare Turnstile, rate limits, and content checks.
- Private moderation: `/qa-admin/` (not indexed) calls `/api/qa-admin` with a private administrator key entered into the form. Never share or publish the key. The API checks the key on the server for every request. Admins can publish reviewed answers or reject questions; no question automatically becomes public.
- The API automatically creates the D1 table/indexes on first request and adds private-field columns to existing `questions` tables with additive migrations. Older approved questions remain intact; older questions have no private visitor fields.
- Public submissions are **disabled until all four runtime settings below exist**. The page displays an honest setup message rather than pretending a submission was saved.

### One-time Cloudflare Pages configuration to activate submissions
1. Cloudflare dashboard → Workers & Pages → D1 → create a new D1 database named `slashpromo-questions`.
2. Open the SlashPromo Pages project → Settings → Bindings → Add D1 database. Variable name **QA_DB**, choose `slashpromo-questions`. Configure for production, and preview if needed.
3. Create a Cloudflare Turnstile widget for **slashpromo.com** and **www.slashpromo.com**. Add its **site key** as a Pages variable `QA_TURNSTILE_SITE_KEY` and its **secret key** as an encrypted Pages secret `QA_TURNSTILE_SECRET`.
4. Add a separate random 32+ character encrypted Pages secret **QA_ADMIN_KEY**. Use that value only in the private admin dashboard at `/qa-admin/`. Never commit it to Git.
5. Save configuration and redeploy the Pages project after attaching bindings/variables. Check `/api/questions?city=sukkur` returns `"enabled":true`; test a submission, confirm it appears in the admin queue, approve a verified answer, and check it becomes visible only in the correct city.
6. Maintain Cloudflare-hosted protections, review the moderation queue regularly, and remove inappropriate or outdated content.

### Safety and privacy
- Name and city are required private submission fields. WhatsApp and suggestions are optional private fields. A provided WhatsApp number requires opt-in consent for follow-up. These fields are visible ONLY via the administrator-authenticated moderation API/dashboard; they are deliberately excluded from public GET `/api/questions`. The public question/answer is reviewed before publication and IPs are stored as keyed hashes for the four-per-24-hours anti-spam limit. Cloudflare security checks process security tokens and IP addresses.
- Do not accept patient-identifying or highly sensitive medical details in public Q&A. Refer emergencies to in-person urgent care. Do not present general information as a diagnosis or clinical encounter.
- Publish only professional contact numbers that are already public and verified; ask patients to confirm schedules and availability with the clinic. Do not invent a doctor's phone number or appointments.
- Update the privacy page when processing practices materially change.

Deployment note: After configuring QA_DB, QA_TURNSTILE_SITE_KEY, QA_TURNSTILE_SECRET, and QA_ADMIN_KEY in the Cloudflare Pages production environment, push a fresh commit to trigger deployment and apply those runtime settings. This documentation update is that deployment trigger; publishing must still be checked in Cloudflare.

### Private details and suggestions update (8 November 2026)
- The question form collects visitor name, visitor city, optional WhatsApp, opt-in contact consent, and optional suggestions for improvements. Only category, question, explicitly consented visitor name, and editorial answer appear publicly. The city entry, WhatsApp and suggestions remain private.
- Stored separately in D1 columns: `visitor_name`, `visitor_city`, `visitor_whatsapp`, `visitor_suggestion`, `contact_consent`. They are shown on `/qa-admin/` for pending and approved questions, not returned by `GET /api/questions`.
- The moderation dashboard offers an opt-in-only WhatsApp contact link for authorized administrators. Do not copy visitor details into the public editorial answer.
- No Cloudflare variable changes are required for this update. Save private details using the existing `QA_DB` binding and `QA_ADMIN_KEY`; the schema update runs automatically when the API is invoked. Redeploy from the production GitHub branch to activate.

### Public name attribution (8 November 2026)
- New question submissions require visitors to explicitly agree that their supplied name will be displayed alongside a question if the administrator approves it. The form clearly explains this before submission.
- An additive D1 column `public_name_consent INTEGER NOT NULL DEFAULT 0` prevents older, previously private visitor names from becoming public automatically. To publish an older visitor's name, separately obtain that visitor's permission using an appropriate mechanism; there is no automatic override.
- The public read endpoint selects only `CASE WHEN public_name_consent=1 THEN visitor_name ELSE NULL END AS author_name` plus existing public fields. WhatsApp, suggestions, and visitor city are never returned in the public JSON response.
- The admin dashboard displays whether a visitor has given name publication permission. Continue moderating question and answer text to avoid accidentally sharing contact details inside freeform content.

### Scoped Sukkur doctor and hospital Q&A (8 November 2026)
- All 66 indexed Sukkur-related URLs (city root, individual doctor profiles, specialty pages, hospital pages and health-topic pages) load the shared Questions & Answers component. Sukkur subpages use `assets/site.js` to load `assets/city-questions.js`; city roots load it directly.
- Each public thread is scoped by a validated `pagePath` (for example `/sukkur/best-rheumatologist/`). `functions/_lib/qa.js` enforces supported page paths so cross-city routes or unsafe URLs cannot be submitted. Other cities continue using city-root threads.
- A nullable D1 column `questions.page_path` is added safely to existing data on the next request, with index `idx_qa_page`. Previously stored rows with a NULL path remain attached to their original city root. Existing approved answers, privacy consent, WhatsApp privacy, Turnstile verification and anti-spam submission limits are unchanged.
- The private `/qa-admin/` dashboard shows the source page for each question so moderators can respond appropriately. Page paths are never supplied by patients as contact details.
- Do not expose private visitor city, WhatsApp or suggestions in the public API, editorial answers or search schema. Publish only manually reviewed answers. New Q&A threads are not automatically turned into FAQ schema or self-diagnosis guidance.
- Updated `privacy/` language discloses per-page discussion scope. No new Cloudflare secrets are required if city Q&A was already operating. Verify a question submitted on a rheumatology page remains scoped to that page, appears pending in admin, and displays publicly only after approval.


## Nationwide page-specific Q&A rollout (8 November 2026)
- The six city homepages retain their own city-wide Q&A threads. All published subpages in Sukkur, Karachi, Khairpur, Shikarpur, Ghotki, and Hyderabad share one front-end component with independent per-URL threads.
- The shared loader in assets/site.js detects supported city routes; assets/city-questions.js derives the correct city and normalized page URL. The server-side questionPage() validates that the submitted page belongs to that city; it rejects cross-city submissions.
- This does not make the patient free-text content an SEO FAQ: no unmoderated or patient-identifying Q&A is added to JSON-LD. Only administrator-approved answers appear publicly, and WhatsApp / suggestions remain private.
- The private /qa-admin/ interface supports city and page-type filtering, local search within loaded records, pending/approved/rejected queues, and loading older records 100 at a time. The admin key remains in the browser tab and is never embedded in static HTML or stored locally.
- The Q&A service still requires the existing Cloudflare QA_DB D1 binding, QA_TURNSTILE_SITE_KEY, QA_TURNSTILE_SECRET and QA_ADMIN_KEY. Pushing code does not provision these secrets or verify the live submission flow. Do not report production as functioning until a submission and moderation roundtrip succeeds.

## IndexNow automatic publication notifications (8 November 2026)
- Public key: 83dd41d8cf7d247ddf4579c34499dbc6, hosted at https://slashpromo.com/83dd41d8cf7d247ddf4579c34499dbc6.txt. This key is intentionally public and not a Cloudflare credential.
- GitHub Actions workflow: .github/workflows/indexnow.yml, script: scripts/indexnow.mjs. On changes to HTML pages / sitemap, it checks the sitemap and Git diff, then submits published canonical pages only to https://api.indexnow.org/IndexNow.
- First installation or manually dispatched workflow sends the published sitemap URLs plus homepage; subsequent pushes submit only published pages that were added or updated, or newly added to sitemap. /qa-admin/, /api/ and unpublished routes are deliberately omitted.
- The workflow verifies that the public key file is actually reachable and matches before sending notifications. It waits for Cloudflare Pages to finish publishing; failures are visible in GitHub Actions and should be resolved there rather than assumed successful.
- It uses an unauthenticated POST to IndexNow; no GitHub secret is required. IndexNow acknowledgment means notification was accepted, not that a page is indexed.
- Review Bing Webmaster Tools > IndexNow to monitor receipts. Keep XML sitemap canonical URLs and lastmod metadata current for meaningful content edits. Do not submit private admin or unapproved patient content for indexing.

### November 8 GitHub audit corrections
- All 66 indexed Sukkur pages now contain static Q&A fallback text (and a versioned shared script) so SEO checks and readers without JavaScript have honest information. Existing questions still load from the approved Q&A service.
- Hospital validation now checks each facility against its matching city page rather than demanding all hospitals appear in Sukkur; specialty directory links do not imply doctor associations.
- Alkhidmat Medical Center and Haji Lutufullah Bhayo Memorial Hospital in Shikarpur are explicitly institution-only until named local doctor associations are verified. Their visible pages disclose that limitation and link to the associated Slashcure hospital listings.
- Astro Physiocare is included in the national hospital index and associated Shikarpur doctor pages link back to Muhammad Ilyas Medical Center.
- Repository data currently includes 16 hospital listings and 30 named doctor associations. GitHub Actions must still demonstrate successful post-fix audit runs; changes to code alone do not establish successful CI or IndexNow submission.

# SlashPromo page publishing standard — SEO, GEO, metadata and AI discovery

Version: 2026-11-10
Applies to **new** and **revised** SlashPromo doctor profiles, hospital and clinic pages, city and specialty directories, and bilingual symptom guides.

## Design / experience (human first)
- Attractive, readable, mobile-first design using the site's established royal/navy blue palette, white backgrounds and accessible contrast. Prioritize scan-friendly headings, logical spacing, strong descriptive links, and functional forms.
- Keep one descriptive H1; establish H2/H3 hierarchy. Ensure keyboard focus and skip links work. Avoid duplicate headings or duplicated sidebar links.
- The sidebar should link to the doctor's source/OPD details, their verified clinic, relevant specialties, related local doctors and helpful educational guides. Do not link unrelated conditions merely to add keywords.
- Urdu content must use proper `lang="ur-PK"` and `dir="rtl"`. In mixed English–Urdu links, wrap Urdu spans separately to avoid awkward bidirectional display. Do not make users rely on auto-translation.

## Search engine optimization (SEO)
- Give every canonical page a unique, human-readable URL, concise and relevant title, compelling original meta description, and exactly one canonical link.
- Include descriptive internal links (city ↔ specialty ↔ doctor ↔ hospital ↔ related health guide). Avoid doorway pages, keyword stuffing or competing duplicate content.
- Use suitable Open Graph and Twitter preview metadata. Every changed or new URL must be reflected in sitemap.xml with an accurate lastmod date.
- Verify site header, footer, contact, FAQ, and city navigation are intact. Test page load, responsive layout, outbound links and bots' ability to read essential text without JavaScript.

## Geographic relevance / GEO
- Use precise, verified city, province and country in title/visible copy where natural: Sukkur, Sindh, Pakistan, etc. Use geo.region / geo.placename where suitable.
- Show only confirmed hospital and doctor affiliations. Do not invent an address, consultation time, fee, live availability, procedure, degree or phone number.
- Link directly to source profiles on Slashcure and use these as the definitive provider-published clinic/schedule source.
- The term 'best' is a discovery/search phrase, not an independently verified clinical ranking.

## Generative engine optimization / AI readability
- Publish informative HTML text and clear headings, not inaccessible images of text.
- Include accurate Schema.org JSON-LD for actual entities: `WebPage`, `BreadcrumbList`, `ItemList`, `Physician` when substantiated, and `FAQPage` only for genuine on-page FAQs.
- Do not fabricate review ratings, physician rankings, availability, outcomes, test accuracy or endorsements.
- Keep `ai.txt`, `llms.txt`, `llms-full.txt`, and `sitemap.xml` synchronized with new canonical pages and major guide additions. These help discovery; they do not guarantee AI citations or search indexing.
- Attribute clinical guidance to trustworthy sources where appropriate; avoid using rigid medical rules without adequate context.

## Healthcare safety and trust
- Patient symptoms are reasons for medical assessment, **not an automatic diagnosis or procedure indication**.
- For TB and respiratory pages, highlight severe breathing difficulty, severe chest pain or significant haemoptysis as emergency concerns; encourage proper testing and appropriate infection precautions.
- For endoscopy pages, do not claim all patients need endoscopy or that everyone receives sedation. State clinic-specific availability and instructions must be confirmed.
- Never claim SlashPromo provides medical advice, clinical ranking, verified availability or procedure bookings.

## Review-first publishing checks
1. Check duplicates and existing canonical route before creating a new page. Update an established guide where appropriate.
2. Confirm source profile, name, credentials, specialty and clinic; link directly to Slashcure.
3. Validate title, description, canonical, JSON-LD parsing, one H1, language/RTL, health disclaimers and internal links.
4. Update reciprocal links in city, specialty, clinic and relevant doctor pages only.
5. Add/update sitemap and AI-readable files.
6. Commit to GitHub with meaningful messages while preserving human approval in the doctor onboarding workflow.
7. Confirm the public Cloudflare route, source links and metadata by fresh fetch. Do not claim live until verified.
8. Submit or allow existing indexing workflows to announce URLs; do not equate sitemap submission with successful indexing.

This policy describes a publishing standard, not a claim that every pre-existing page has already passed all checks.

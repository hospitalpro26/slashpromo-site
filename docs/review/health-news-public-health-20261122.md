# PUBLICATION DECISION — 22 NOVEMBER 2026

**Owner approval:** User explicitly requested “Deploy in SEO GEO Meta style” after reviewing the four-story batch. This approves publication of the four reviewed articles (not any unrelated draft PRs).

**Implemented on this branch:** Four HTML articles are now indexable, with Nov 22 publication dates, SEO/GEO/OG/Twitter metadata, NewsArticle + FAQ + BreadcrumbList JSON-LD, original English content, Urdu summaries, qualified source references, and relevant Slashcure links. Four published entries added to `health-news/news.json`; regional Sindh/Pakistan/Global filters added; Health News hub schema and meta description updated; sitemap.xml, llms.txt, llms-full.txt, ai.txt, ai-map.json updated to 236 canonical URLs.

**Verification:** Draft-to-publication metadata and schema checks passed; all four articles appear once in the JSON news feed and sitemap/AI map. Global source links checked: WHO AMR official /news/item/ page; WHO rabies guidance; Pakistan PEI 12 Nov results; dengue 12 Nov newspaper report explicitly attributed to provincial department, since direct surveillance report was not found. Production deployment, HTTP 200 and indexing require separate confirmation and should not be inferred from GitHub merge.

**Editorial limitation:** Dengue statistics remain reported figures from the 12 Nov news article; not a direct official surveillance fetch and not a live count. Existing doctors and providers are not asserted as treating any specific condition.

---

# HISTORICAL REVIEW NOTES (retained for traceability)

# SlashPromo Health News: 22 November 2026 — Editorial Review Batch

**Status:** REVIEW ONLY — do not merge, deploy, publish, or submit to indexing before explicit editorial approval and completed checks.

## Proposed four news URLs (not live)
1. https://slashpromo.com/health-news/sindh-dengue-cases-november-2026/
2. https://slashpromo.com/health-news/dog-bite-rabies-prevention-pakistan/
3. https://slashpromo.com/health-news/sindh-polio-campaign-november-2026/
4. https://slashpromo.com/health-news/who-antimicrobial-resistance-awareness-week-2026/

## Source-verification and caveats
- **Dengue Sindh:** WHO dengue fact sheet supports prevention, symptoms, red flags and medication cautions. Express Tribune (12 Nov) reports 2,369 Karachi and 2,100 rest-of-Sindh cases, attributing them to provincial health department. **Original Sindh Health Department surveillance bulletin was not independently retrieved**; text explicitly reports media attribution rather than asserting verified official totals. Check an up-to-date bulletin before approval.
  Sources: https://www.who.int/news-room/fact-sheets/detail/dengue-and-severe-dengue ; https://tribune.com.pk/story/2639865/city-outpaces-rest-of-sindh-in-dengue-cases
- **Rabies:** WHO fact sheets verified wound washing at least 15 minutes, urgent clinical assessment, categories II/III, rabies vaccine and category-III RIG/RmAb indications. No unverified local fatalities, treatment-centre location, hours or stock.
  Sources: https://www.who.int/news-room/fact-sheets/detail/rabies/ ; https://www.who.int/news-room/fact-sheets/detail/animal-bites/
- **Polio:** Primary government sources checked: PEI 12 Nov 2026 reports approximately 7.104m Sindh children vaccinated in 20 selected districts during 2–8 Nov 2026; Sindh Information Department 4 Nov report identified **planned target** nearly 6.8m. Distinguish target vs achieved and reporting dates.
  Sources: https://www.poliofreepakistan.gov.pk/media-room/media-releases/2743-pakistan-vaccinates-24-million-children-in-november-sub-national-polio-campaign ; https://information.sindh.gov.pk/news/anti-polio-campaign-inaugurated
- **WHO AMR:** Primary WHO 16 Nov 2026 press release and campaign guide: 183 responding countries, 36% with specified national reference lab test capacity, 63% reporting guidelines on appropriate antimicrobial use. These are country-response figures, **not Pakistan patient statistics**. Theme: One Health, one action: Prevent AMR now.
  Sources: https://www.who.int/singapore/news/detail-global/16-11-2026-more-countries-have-antimicrobial-resistance-plans-but-patients-still-lack-testing-and-treatment ; https://www.who.int/publications/m/item/world-amr-awareness-week-2026---campaign-guide

## Duplication check
Existing published /health-news/ hub and its 3 stories cover the Sukkur kidney transplant, Civil Hospital ward inauguration and pelvic fracture surgery, respectively. The four new subjects do not duplicate those topics. No existing file at the four proposed paths on main before branch creation.

## Draft SEO/GEO/AEO specification
Each HTML article contains an original page title and meta description, canonical to its proposed final SlashPromo URL, OG/Twitter text, location tags, English body, natural Urdu summary with `lang=ur-PK` and `dir=rtl`, FAQ answers visible to readers with FAQPage JSON-LD, BreadcrumbList, and source-linked NewsArticle JSON-LD. NewsArticle has **no datePublished** until approval. No made-up author, photo, outcomes or appointments. Links to existing SlashPromo directories and/or the Slashcure homepage; no invented doctor-specific links.

## MANDATORY before publish
- [ ] Editorial and medical review of each English article and Urdu summary; confirm high-risk rabies and dengue guidance, and verify updated 2026 provincial dengue numbers at primary source if available.
- [ ] Verify current underlying original source links and ensure no stale figures are presented as current.
- [ ] Set each page's `<meta name="robots">` to `index,follow,max-image-preview:large`; add correct `datePublished` and `dateModified` upon publication, including OG article metadata.
- [ ] Remove visible **Editorial draft — not published** label and replace draft disclaimer with published date.
- [ ] Add **four approved links** to existing `/health-news/` feed and update CollectionPage/ItemList schema and news feed configuration so cards actually render. Do not show them before approval.
- [ ] Update `sitemap.xml`, `llms.txt`, `llms-full.txt`, `ai.txt`, `ai-map.json` **only after** approved publication; preserve canonical integrity and lastmod dates.
- [ ] Confirm all four HTML routes return 200 with correct metadata after production deploy; check robots crawl settings, mobile readability, and relevant Slashcure links.
- [ ] Submit/inspect URLs via Search Console after live verification. Publication, crawling, indexing and ranking are different milestones.

## Safeguards
Only four new HTML files plus this private editorial note in GitHub; no edits to live pages, scripts, sitemap, patient data, doctor records or Cloudflare config. Draft branch uses `review/*` and `[CF-Pages-Skip]` convention. This checklist is a gate to publishing, not a claim of deployment.

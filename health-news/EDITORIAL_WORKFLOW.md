# SlashPromo Health News: editorial publishing setup

This module is separate from Slashcure profiles and from SlashPromo's existing doctors/hospitals directory. It is **review-first** and must never auto-publish a scraped story or unverified provider claim.

## Scope and structure

- Public newsroom: `/health-news/`
- Public feed: `/health-news/news.json` (contains ONLY approved, publishable records; initially empty)
- Read-only filters: city, hospital, topic, keyword; deep-linked by URL query string
- Styles and behavior: `/assets/health-news.css`, `/assets/health-news.js`
- Individual article pages: create distinct static `/health-news/<unique-slug>/index.html` only after editorial approval. They need their own title, canonical URL, publication/modified timestamps, original source link and an author/editorial attribution. Add NewsArticle structured data only when article content is actually published.

## Proposed categories

- Hospital updates: facility or OPD announcements confirmed by the healthcare provider
- Public health alerts: official DRAP/NIH/health-department advisories with clear source dates
- Medical research: sourced evidence summaries with appropriate uncertainty and limitations
- Health campaigns: verified camps, vaccination drives, outreach and awareness programmes
- Health policy: relevant verified public-sector or regulatory healthcare changes
- Education & training: verified training, admissions, recruitment and professional development news
- Community health: clinically reviewed, community-focused health developments

Cities are identified by slug: sukkur, khairpur, shikarpur, karachi, hyderabad, pano-aqil, ghotki, ratodero, larkana, lahore, islamabad, quetta. Add additional cities by updating the filter options and the JavaScript city label map (not by inventing news for them).

Hospitals are **not pre-populated with dummy records**. A hospital appears in the filter only after at least one approved article references its exact verified name.

## Workflow (manual GitHub PR for this phase)

1. **Intake**: collect a source URL, original announcement, city and relevant hospital, verification contact if required, and proposed article topic. Do not expose unpublished patient data.
2. **Verify**: open the primary source; confirm headline, event date, city, hospital, provider-specific services, and current relevance. Check for duplicate articles, follow-ups, and corrections. News based only on secondhand reports must clearly attribute the reporting and not claim independent confirmation.
3. **Edit**: write an original English article, with Urdu service information where helpful. Do not copy full articles from other publishers. Use quotes sparingly and provide the original source link. Distinguish news from healthcare advertisements.
4. **Review**: confirm clinical safety when medical advice is discussed, and confirm related Slashcure links against the live profile. Privacy, legal and medical content need appropriate review.
5. **Approve**: open a PR adding the standalone article HTML and one feed record (schema below). Any images must be licensed/owned, with appropriate alt text. Do not use patient photos without consent.
6. **Publish**: merge only after owner approval. After the first verified article is ready, change newsroom robots from `noindex,follow` to `index,follow`, add article and newsroom to sitemap, test schema/canonicals/links and check production Cloudflare deployment. Never claim Google indexing without Search Console confirmation.
7. **Correct**: log significant corrections in the article with date and reason. For obsolete notices, visibly mark the story as superseded instead of quietly rewriting history.

## Feed record contract

Each `news.json` entry must have at least:
```json
{
  "status": "published",
  "title": "Verified article headline",
  "summary": "Original, source-checked summary of at least 21 characters.",
  "city": "sukkur",
  "hospitalName": "Exact confirmed hospital name, only when applicable",
  "topic": "Hospital updates",
  "datePublished": "2026-11-21",
  "url": "/health-news/verified-unique-story-slug/",
  "sourceName": "Original issuing authority or clearly attributed publisher",
  "sourceUrl": "https://example.org/original-notice"
}
```
**The JSON example is a format illustration, not an actual news item and must not be put into the public feed as a published record.**

No private keys, patient contact information, submitted unpublished tips, or unreviewed drafts belong in the public feed.

## Current rollout

- Initial hub, empty verified feed, accessible city/hospital/topic navigation: ready on review branch.
- The page is **noindex** until actual reviewed content is approved.
- The public homepage only gains a small footer navigation link; its existing hero, cards, directories, ads, and analytics are not touched.
- Future admin-dashboard content workflow is a separate, explicitly approved phase. Until then, a protected GitHub PR is the publication gate.

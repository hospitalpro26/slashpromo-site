# SlashPromo Phase 3B — Private Google Search Console Integration

**Status:** Code deployed to GitHub. Google API access remains **OFF** until owner completes Cloudflare credential setup and grants Search Console property access. Never claim that scheduled refresh, Google indexing, or connection activation has occurred without verification.

## Architecture and safeguards

- Existing dashboard: `https://slashpromo.com/analytics/search-opportunities/`
- Private API: `GET /api/search-opportunities`, **read-only**; requires existing `X-QA-Admin-Key` and optional Cloudflare Access if `ADMIN_ACCESS_REQUIRED=true`.
- No secret or Search Console query data is committed to public GitHub, static site assets, or public pages.
- Google Search Console domain property is fixed to **`sc-domain:slashpromo.com`**; property values cannot be supplied by users.
- API uses **`webmasters.readonly`**. Only Search Analytics web search is read.
- Only `QA_DB` receives the private `private_gsc_report_cache` table, created using `CREATE TABLE IF NOT EXISTS`. Existing analytics, questions, enquiries and schema remain unchanged.
- 24-hour **on-demand** cache TTL: the first authorised dashboard request after expiry fetches Google; subsequent authenticated requests get the cached report. This is not a cron job, and refreshes will not occur during inactivity.
- Search Console reports exclude the latest three UTC calendar days to avoid incomplete numbers and cover the preceding 28-day range.
- Google may omit anonymised queries and returns up to 2,500 rows per dimension in this pilot; totals come from a **separate aggregate query**, not a sum of query/page tables.
- Public `_routes.json` invokes the new function at `/api/search-opportunities`. The API requires a private admin key before any external fetch or database read.

## Activation by owner (do not send credentials in chat)

1. In **Google Cloud Console** create or select a project under your control. Enable **Google Search Console API**.
2. Create a service account dedicated to SlashPromo reporting (with no permissions to other Google Cloud resources). Create its JSON private key and keep it secret.
3. In **Google Search Console** for the **Domain property `slashpromo.com`**, add the service account's `client_email` address as a permitted property user. Select the minimum suitable read-only permission. Confirm access before enabling it.
4. In **Cloudflare → Workers & Pages → slashpromo-site → Settings → Variables and Secrets** add an **encrypted secret** named `GSC_SERVICE_ACCOUNT_JSON` containing the full JSON credential, including `type`, `client_email`, and `private_key`. **Never commit or paste the JSON into GitHub, a public issue, a chat, or JavaScript.**
5. Confirm the existing **`QA_ADMIN_KEY`** secret and **`QA_DB`** D1 binding are present on the production environment. For extra protection enable Cloudflare Access on `/analytics/*` and `/api/search-opportunities`, including the existing Access validation toggle `ADMIN_ACCESS_REQUIRED=true` only after all relevant existing admin APIs and routes are correctly protected.
6. Redeploy the production Pages build if required after adding secrets/bindings.
7. Open the private dashboard. Enter existing administrator key, then click **Load real Google search performance**. A configured API should report data source, period and the authenticated cache status.
8. Confirm anonymously browsing `/api/search-opportunities` returns **HTTP 401**, with no data or credentials, and verify no query results appear in published HTML, public GitHub commits or any generated static assets.

## Optional future scheduled refresh

**Cloudflare Pages Functions are not cron-triggered.** To refresh the cache in the background even with no dashboard visitors, use a **separate Cloudflare Worker Cron Trigger** with properly scoped private service access; do not open an unauthenticated refresh endpoint or commit an admin key. The current implementation instead refreshes automatically on the first authenticated dashboard view after 24 hours.

## Troubleshooting

- **HTTP 401:** Missing or incorrect `QA_ADMIN_KEY`; if Cloudflare Access is enabled, first complete the Access login.
- **HTTP 503, credentials not configured:** Add `GSC_SERVICE_ACCOUNT_JSON` as a secret in production.
- **HTTP 503, property access:** Grant service account access to the exact Search Console domain property; confirm API enabled in Google Cloud.
- **HTTP 503, database:** Check existing `QA_DB` binding and permissions; do not create duplicate production databases.
- **HTTP 503, generic refresh unavailable:** Review Cloudflare Pages Functions logs privately. No token, key or raw upstream response is logged by this function.
- **CSV fallback:** Export Queries and Pages from Google Search Console, import in the private browser dashboard, and close the tab when finished; no upload is performed.

## Rollback

Remove the new route from `_routes.json` and restore the previous dashboard UI via GitHub history. The previous analytics UI and data remain intact. Only after review/approval, separately decide whether the new private D1 cache table should be retained or dropped. **Never drop it automatically.**

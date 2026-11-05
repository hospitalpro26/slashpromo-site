# SlashPromo Advertisement Management — activation checklist

The code is committed, but the editing system cannot operate until the Cloudflare database and administrator authentication are configured. No separate hosting or purchase is required for the initial pilot.

## A. Confirm deployment
- Cloudflare → Workers & Pages → slashpromo-site → Deployments.
- Confirm the newest production deployment completed successfully.
- Do not enable advertising if Cloudflare reports a failed build.

## B. Create D1 database
1. Cloudflare → Storage & Databases → D1 SQL Database → Create database.
2. Database name: slashpromo_ads
3. Open the new database and its Console tab.
4. Execute the SQL from schema.sql in this GitHub repository. If the console requires it, run the SQL statements one at a time.
5. Confirm campaigns and campaign_audit tables exist.

## C. Add D1 binding to Cloudflare Pages
1. Workers & Pages → slashpromo-site → Settings → Bindings → Add → D1 database.
2. Binding variable name: DB
3. Database: slashpromo_ads
4. Save. Redeploy the latest production commit. Do not change HospitalPro bindings.

## D. Protect administrator routes with Cloudflare Access
1. Cloudflare → Zero Trust → Access controls → Applications → Create new application.
2. Choose Self-hosted. Name the application SlashPromo Admin.
3. On slashpromo.com, protect the /admin/* path. All campaign editing endpoints now live under /admin/api/*, so one Access app is sufficient.
4. Create an Allow policy for your exact administrator email address. Never use an Allow Everyone policy.
5. Select a verified sign-in method, such as one-time PIN to that email address.
6. Find the Cloudflare team domain and Application Audience (AUD) tag in the Access application settings.
7. Use just this one Access application and its Audience (AUD) tag.

## E. Set Pages variables
Workers & Pages → slashpromo-site → Settings → Variables and Secrets, or the Environment Variables section:
- ACCESS_TEAM_DOMAIN = your team domain, for example https://YOUR-TEAM.cloudflareaccess.com
- ACCESS_AUD = The SlashPromo Admin Access application's Audience tag.
- ADMIN_EMAILS = the administrator email address, or comma-separated addresses explicitly permitted.
These values belong only in Cloudflare; never put personal account tokens or passwords in GitHub.
Save, redeploy production, and test.

## F. Test the management system
1. Visit https://slashpromo.com/admin/ and sign in through Cloudflare Access.
2. Create a draft campaign with accurate provider name, description, city, category, and HTTPS destination URL.
3. Review the copy and image permissions. Move status from Draft to Pending or Approved.
4. Select Live to publish. Only Live campaigns whose schedule includes the current time appear publicly.
5. Check the relevant city or category page and verify it is marked Sponsored. Campaign-editing requests go to /admin/api/campaigns.
6. Visit an ad link and confirm the aggregate click counter increases. Counts represent outbound redirects, not unique people or true viewable impressions.

## Security and deployment notes
- Admin endpoints verify signed Cloudflare Access JWT claims, expiration, audience, team issuer, and an explicit email allowlist.
- If variables are missing, the protected UI and APIs fail closed.
- The public campaign API returns an empty campaign list until D1 is connected.
- Database writes use parameter binding and validate categories, cities, statuses, date ranges and HTTPS destination URLs.
- All sponsored placements are labelled and kept separate from editorial cards.
- Images must be licensed or approved. Image upload and public advertiser accounts are later phases.
- Do not make medical cure guarantees or unsupported superiority claims.
- Existing GitHub and Cloudflare Pages setup is retained. No WordPress or new hosting account is needed.

## Troubleshooting
- 503 Access not configured: set ACCESS_TEAM_DOMAIN, ACCESS_AUD, ADMIN_EMAILS, redeploy.
- 401 unauthenticated: open /admin/ and sign in through the configured Access application.
- 403 forbidden: check exact administrator email and Access Allow policy.
- 503 D1 unavailable: bind slashpromo_ads as DB, redeploy.
- Database schema not installed: run schema.sql in D1 console.
- Ads not visible: verify status=live, scheduled start/end, placement, city and category.
- Cloudflare build errors: inspect the latest deployment logs before changing DNS.

Source files: admin/index.html, assets/admin.js, assets/admin.css, assets/sponsored.js, functions/api, functions/admin, functions/go, schema.sql.

## Deployment after linking D1
Once the production Pages D1 binding `DB` → `slashpromo_ads` is saved, a new commit on `main` triggers Cloudflare's automatic production deployment. This setup-document update also triggers a build. Verify the newest deployment's status under Cloudflare → Workers & Pages → `slashpromo-site` → Deployments. A successful GitHub commit does not guarantee successful production deployment.

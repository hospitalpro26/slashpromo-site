# SlashPromo Q&A — approved-answer visibility recovery

**Status at last read-only public check (23 Nov 2026):** `GET /api/questions?city=sukkur&pagePath=%2Fsukkur%2F` returned HTTP 200, `enabled:true`, and `questions:[]`. Earlier checks in this project returned two approved responses for the Sukkur city-root page. An empty public result does **not** establish deletion, corruption, or an empty database.

## Completed safeguards

- The public API remains restricted to `status='approved'`.
- Legacy city-root records are recognized only on the matching city root when `page_path` is `NULL`, empty, or uses `/city` without its trailing slash. Provider page Q&A remains separately scoped.
- Approved questions on non-homepage pages must have a nonempty public answer.
- Private admin API `GET /api/qa-admin?diagnostic=1` returns aggregate counts only, authenticated with the existing admin key and optional Access protection. No visitor names, numbers, or Q&A text are returned from this diagnostic mode.
- `/qa-admin/` provides a **Run private data-integrity check** button.
- `scripts/test-qa-legacy-visibility.mjs` is intended to cover legacy path compatibility, approval filtering, private names and city/provider isolation. The existing Q&A persistence workflow calls it.

## Safe investigation when an authorized operator is available

1. Open https://slashpromo.com/qa-admin/ on the production domain. Enter the Cloudflare Q&A admin key **only in the private dashboard**.
2. Run the private data-integrity check. Note the Sukkur city-root totals and **approved with answers** count, and the overview for `sukkur` (approved, rejected, pending). Do not copy patient text or contact details into tickets.
3. In **View → Published**, **City → Sukkur**, load all questions and check both Active and Archived views. Confirm whether old records are still present and have the expected city/page path. Do not change status before identifying the cause.
4. If `approved with answers > 0` but the public page still returns `[]`, compare the current live `QA_DB` Cloudflare Pages production binding with the actual D1 database containing the records. Verify that preview and production do not point to different databases. Also inspect logs for SQL/D1 errors.
5. If city-root approved count is zero but approved `sukkur` records exist under different page paths, review their paths individually before any migration. Do not expand the public query to all city pages; that would incorrectly show doctor-specific questions on the city home page.
6. If old IDs cannot be found in the production D1 database, inspect authorized encrypted backup manifests and prior binding history. Do not restore an entire database or overwrite recent records without explicit approval and a restore plan.
7. Once diagnosed, choose the minimal corrective action, recheck the exact previously published Q&A IDs (with consent respected), and verify public listing plus admin status. Do not reapprove or insert missing answers speculatively.

## Release acceptance checklist

- Public GET returns HTTP 200 with `enabled:true` when configured.
- Public API serves **only approved** questions scoped to the correct page; names are shown only with explicit consent.
- Existing confirmed approved Sukkur city-root answers reappear if they are still approved and have nonempty answers.
- Private `/api/qa-admin` returns 401 without authorization.
- Moderator tools can save private drafts and publish only with deliberate operator action.
- Optional email alerts are not considered delivered until `QA_NOTIFY_TO`, `QA_NOTIFY_FROM`, and `RESEND_API_KEY` are configured privately and a test email is received.

**No existing question, answer, or moderation status should be changed solely because the public array is empty.**

# SlashPromo Secure D1 Backups & Recovery

Current implementation: private Cloudflare Access + admin-key verification and encrypted logical exports. This is designed to **fail closed** until Cloudflare Access settings exist.

## Cloudflare configuration required

1. Cloudflare Zero Trust > Access controls > Applications > add self-hosted Access protection for both https://slashpromo.com/secure-backups/ and https://slashpromo.com/api/secure-backup. Make sure the complete /secure-backups/* path is included. Only explicitly authorised administrator email identities should be allowed. Require MFA in your identity provider.
2. Set production Pages variables ACCESS_TEAM_DOMAIN (actual *.cloudflareaccess.com team domain), ACCESS_AUD (actual Access application audience tag or comma-separated tags), and ADMIN_EMAILS (comma-separated exact approved email addresses).
3. Keep the existing QA_DB D1 binding and secret QA_ADMIN_KEY. Do not publish keys or add them to GitHub; this implementation requires **both** a valid signed Cloudflare Access JWT and QA_ADMIN_KEY.
4. Redeploy production and test sign-in. The secure page is deliberately locked until the configuration above is present. No unauthenticated exports can run.
5. Optional step to protect ALL existing private admin APIs: configure Cloudflare Access for /control-center/, /enquiries/, /qa-admin/, /analytics/ and /api/control-center, /api/enquiries-admin, /api/enquiry-replies, /api/qa-admin, /api/analytics-report; then set ADMIN_ACCESS_REQUIRED=true and redeploy. Do this only AFTER the Access applications cover those routes and are tested. Without this setting, those existing APIs continue using their existing private admin keys; secure-backup requires Access regardless.

Configuration of an Access policy, identity provider and Pages secrets is an account-owner action. No Access application, MFA policy or new Cloudflare secret has been provisioned automatically by GitHub commits.

## Primary recovery: D1 Time Travel

Cloudflare D1 Time Travel is automatic on modern production D1 storage. Current published limits are **7 days on Workers Free** and **30 days on Workers Paid**. Confirm the exact D1 database and plan; inspect the actual version field before relying on Time Travel. The native recovery history is separate from independent downloaded backups.

Commands below are for a securely authenticated, authorised administrator workstation. Replace ACTUAL_DB_NAME with the real Cloudflare D1 database name; the QA_DB binding name alone is NOT necessarily the database name.

~~~bash
npx wrangler d1 info ACTUAL_DB_NAME
npx wrangler d1 time-travel info ACTUAL_DB_NAME
npx wrangler d1 time-travel info ACTUAL_DB_NAME --timestamp="2026-11-08T12:00:00+00:00"
~~~

A production restore is **destructive**, overwrites data and cancels in-flight queries. Never automate a production restore in CI. For an incident: stop writes, determine the correct database and recovery time, record the current bookmark, preserve an independent encrypted copy if feasible, obtain explicit approval, then use the command below only when authorised.

~~~bash
npx wrangler d1 time-travel restore ACTUAL_DB_NAME --timestamp="APPROVED_UTC_TIME"
~~~

Record the bookmark returned for undo, verify row counts and relationships, and only then reopen submissions.

Official references:
- https://developers.cloudflare.com/d1/reference/time-travel/
- https://developers.cloudflare.com/d1/platform/limits/

## Independent complete SQL exports (important)

A logical browser export is **not** an exact database snapshot. Regularly export the production D1 database from an encrypted workstation or secure maintenance environment.

~~~bash
npx wrangler d1 export ACTUAL_DB_NAME --remote --output=/PRIVATE_ENCRYPTED_DISK/qa-db-full.sql
~~~

If campaigns use a separate D1 database on the DB binding, export that database **separately** using its actual database name.

The SQL files contain plaintext personal data; immediately encrypt with your approved encryption solution, limit access, and keep a separately controlled offsite copy. Never put SQL, .spbk, decrypted JSON or passphrases in GitHub, workflow artifacts, public cloud buckets, email, or chats. Backups must follow a documented retention/deletion policy.

Official reference: https://developers.cloudflare.com/d1/best-practices/import-export-data/

## Browser-encrypted logical archive

1. After Access is configured, open https://slashpromo.com/secure-backups/ and sign in with Cloudflare Access.
2. Enter the existing QA_ADMIN_KEY and select Check database. The read-only verifier runs PRAGMA quick_check, reads row counts of four QA_DB application tables, and checks for orphaned enquiry replies.
3. Enter and confirm a SEPARATE 16+ character archive passphrase. Generate an encrypted .spbk archive. The browser uses AES-256-GCM and PBKDF2-SHA256 with 310,000 iterations, a fresh salt and IV.
4. Keep your archive passphrase in an approved password manager, separately from the encrypted file. Losing the passphrase makes the backup unrecoverable.
5. Verify the downloaded archive on an offline/private workstation with Node 20+; never upload the file for verification.

~~~bash
read -rsp 'Archive passphrase: ' SLASHPROMO_BACKUP_PASSPHRASE; echo
export SLASHPROMO_BACKUP_PASSPHRASE
node scripts/verify-slashpromo-archive.mjs /PRIVATE/path/backup.spbk
unset SLASHPROMO_BACKUP_PASSPHRASE
~~~

The verifier authenticates the AES-GCM encrypted archive, checks SHA-256 per-table manifests, row counts and orphaned reply references. The private browser export includes questions, enquiries, enquiry_replies and site_analytics_daily only; it EXCLUDES short-lived enquiry_rate records, future/new tables, the separate ad DB, and D1's Time Travel metadata. Multi-page exports are not an atomic database snapshot if visitors are writing during the export.

## Offline staging restore rehearsal

To convert a verified logical archive into SQL for a NEW, EMPTY and access-controlled D1 test database only:

~~~bash
read -rsp 'Archive passphrase: ' SLASHPROMO_BACKUP_PASSPHRASE; echo
export SLASHPROMO_BACKUP_PASSPHRASE
node scripts/verify-slashpromo-archive.mjs /PRIVATE/path/backup.spbk --emit-sql /PRIVATE/path/recovery.private.sql
unset SLASHPROMO_BACKUP_PASSPHRASE
~~~

The verifier writes a private file with owner-only permissions and refuses overwriting existing files. The SQL includes the application table schema and records, does not contain explicit BEGIN/COMMIT transaction statements, and is intended only for staging.

~~~bash
npx wrangler d1 create slashpromo-recovery-test
npx wrangler d1 execute slashpromo-recovery-test --remote --file=/PRIVATE/path/recovery.private.sql
npx wrangler d1 execute slashpromo-recovery-test --remote --command="PRAGMA quick_check;"
npx wrangler d1 execute slashpromo-recovery-test --remote --command="SELECT COUNT(*) FROM enquiries;"
~~~

Compare staging counts for all four tables to the verifier manifest; inspect foreign-key checks; keep the test database and copied personal data restricted. Delete staging data and decrypted SQL after validation. Do NOT import a logical archive directly into live production without an approved downtime/migration plan.

For full SQL backups, use the same approach: import into a separate staging DB first with Wrangler, verify the data, and never make production the default target. If a SQL import fails with a nested transaction error, the Cloudflare guide advises removing BEGIN TRANSACTION and COMMIT from imported SQLite dumps.

## Verification and schedule

- **Automatic:** Cloudflare Time Travel is managed by Cloudflare, with plan-specific retention. It does not create an independent offsite export.
- **Weekly:** Run a full SQL export to protected storage; store checksum/date/size and record ownership privately.
- **Monthly:** Verify an encrypted archive offline and rehearse a restore to an isolated test database.
- **After database changes:** Re-run the private health check and inspect row counts, schema and orphaned references.
- **Incident:** Freeze writes, record current D1 bookmark, obtain approval before any destructive restore, restore the correct historical point, compare counts and resume operations after verification.

GitHub CI only runs **synthetic backup tests** and public/authentication smoke tests. It has no production database passphrases and does not export private data. Cloudflare Pages source deployment alone does NOT establish that an independent backup was downloaded or that a production restore succeeded.

There is intentionally **no restore endpoint** exposed by the SlashPromo website.

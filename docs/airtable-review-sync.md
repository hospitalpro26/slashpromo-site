# SlashPromo → Airtable private doctor review queue

This integration is **review-first** and keeps the existing SlashPromo publishing
process unchanged. Nothing in this sync merges GitHub branches, publishes pages,
submits IndexNow URLs, or reads patient enquiries.

## How it works

1. The existing GitHub Actions doctor discovery scans public Slashcure pages.
2. The script already in this repository identifies publicly verifiable **new**
   doctors, filters duplicate city/name/profile identities, and prepares a
   **draft GitHub pull request** (or safe comparison branch when GitHub blocks PR creation).
3. After a review link exists, `sync-airtable-doctor-reviews.mjs` fetches the
   current private Airtable Doctors table, pages through every record, and
   checks duplicates again by canonical Slashcure URL **or doctor name + city**.
4. Only missing public doctor candidates are created in Airtable with
   **Ready for human review**; the approved SlashPromo URL remains a *draft*.
5. The already-enabled Airtable automation, **Log new doctor for human review**,
   creates one pending Onboarding Activity entry for every new Doctors record.

## Required one-time private credential

ChatGPT's Airtable connector session **does not transfer** into GitHub Actions.
For secure automatic access, the repository owner must create one restricted
Airtable personal access token (PAT) and save it **directly in GitHub**.

1. In Airtable Developer Hub > Personal access tokens > Create token, name
   it `SlashPromo GitHub review queue`.
2. Scopes: **data.records:read** and **data.records:write** only.
   Grant access to the **single** Airtable base
   `Slashcure & SlashPromo — Doctor Onboarding`.
   Do not authorize all workspaces or other bases.
3. In GitHub, open
   `hospitalpro26/slashpromo-site` >
   **Settings > Secrets and variables > Actions > New repository secret**.
4. Name the secret exactly `SLASHPROMO_AIRTABLE_PAT`, paste the complete token
   directly into GitHub, and save. **Never paste the token into chat or commit it.**
5. After approving and merging this integration PR, go to
   **Actions > Daily review-first Slashcure doctor onboarding > Run workflow**
   for an optional manual check. The existing schedule remains 03:00 UTC
   (08:00 Pakistan time).

The Airtable base and table identifiers embedded in the integration are **not
authentication credentials**. Access requires the restricted PAT above.

## What success looks like

- GitHub Actions output says `Airtable review sync: added N doctor(s)`
  when new eligible draft candidates are prepared.
- Your Airtable **Doctors** table gains review-only rows.
- Your existing **Onboarding Activity** automation creates pending audit entries.
- The GitHub doctor draft remains **unmerged**, awaiting your review.
- On runs with no new eligible doctors, the sync creates **nothing**.
- On runs where the GitHub PR cannot be created, the script uses the fallback
  compare link and never falsely labels that link as a pull request.

## Safety and troubleshooting

- Missing secret: the step emits a warning and safely skips Airtable writes;
  GitHub doctor review continues working.
- Invalid token or denied scopes: the step reports an authorization failure;
  it cannot expose or log the token.
- Existing doctor (including URL or city spelling variants): skipped.
- Missing GitHub review link: **no Airtable write**.
- Unexpected Airtable response: stop rather than claim successful creation.
- Sync API errors are non-blocking for the doctor discovery workflow, so
  one service outage cannot prevent the original draft review process.
- Airtable access can be revoked at any time by deleting the GitHub secret
  and/or the scoped PAT.

## Privacy and human approval

- Only the doctor's public name, city, specialty, source profile URL, drafted
  SlashPromo URL, review link, and editorial review status are synced.
- No doctor's private email/phone, private contact messages, patient questions,
  health records, passwords, or credentials are written.
- A review-queue record is **not** approval and is **not** evidence that a page
  is published or indexed.
- Publication remains a separate human decision on the GitHub draft PR.

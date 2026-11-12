# SlashPromo onboarding security review — proposed changes, not deployed

This document accompanies a draft human-review PR. Do not merge without the owner's explicit approval.

## Changes prepared for review

- Block public Q&A answer approval when the answer contains a contact number, email, patient ID or medical-record identifier detected by the existing public-question filter.
- Add a regression test for protected Q&A approvals, authentication, and short answers. Run in the existing read-only GitHub PR audit.
- Fail safely if Slashcure's primary national doctor directory is unavailable. Clearly report optional/unavailable discovery sources rather than calling a partial discovery scan complete.
- Exclude the catch-all "Pakistan" value from city-specific source URLs, preventing false /doctors/pakistan probes.
- Remove automatic deletion of legacy onboarding review branches. Review-queue history should not be deleted by the daily scanner.

## Required administrator decisions (not accomplished by this PR)

1. Protect GitHub `main`: require PR reviews and relevant passing checks, restrict direct pushes, and carefully decide whether any administrator bypass is appropriate. The repository currently lacks branch protection/rulesets; code cannot enforce this repository setting.
2. Confirm Cloudflare Pages preview-branch controls. For this draft branch, use `[CF-Pages-Skip]` to skip builds; independently confirm no preview deployment was started.
3. Verify the daily 03:00 UTC scheduled GitHub Actions run using actual `schedule` event history. A successful `push`-event run does not prove scheduling works.
4. Confirm the production admin Access policy, including `ADMIN_ACCESS_REQUIRED` and verified Cloudflare Access configuration, before requiring it in code. Do not accidentally lock out the legitimate administrator.
5. Check Slashcure's supported national directory and sitemap endpoints, replacing any 404 source only after verifying its official replacement.
6. Verify the Airtable review-queue integration with a real, legitimate new doctor candidate after human approval. Mock tests are not proof of a production write.

## Explicit constraints

- No real patient information, private WhatsApp numbers, passwords or access tokens belong in this repository or in public draft previews.
- Never merge automated doctor candidates or publish their pages without review.
- Do not claim that a successful IndexNow request proves search indexing.
- The Q&A text matcher catches common direct identifiers but is not sufficient to detect all personal health information. Human moderation remains necessary.

# SlashPromo: private email alert when a new question is submitted

**Implementation:** Cloudflare Pages Functions calls Resend `POST https://api.resend.com/emails` after a NEW Q&A question has successfully been saved to the existing `QA_DB` D1 database.

## Existing safety guarantees

- Notification occurs only after a successful new question submission, Turnstile verification, and D1 save.
- Duplicates returned by the existing same-visitor/same-page/24h duplicate guard do **not** trigger a second alert.
- The email includes only the saved question reference, city, category, source-page path, and private moderation URL. It omits question text, patient details, visitor name, email and WhatsApp.
- Incoming questions remain **pending** and unpublished until reviewed by the existing admin dashboard.
- The send is scheduled via `ctx.waitUntil()`, so email service failures do not fail the question submission. It is a best-effort notification, not guaranteed delivery.
- No API tokens or recipient addresses are committed to public GitHub. No public endpoint exposes delivery settings.
- No migration of the existing questions table, deletion, or change to old questions is required.
- The Resend `Idempotency-Key` is based on the unique saved question ID, reducing accidental duplicate alerts on provider retries.

## One-time activation

1. In [Resend](https://resend.com/), create an API key with permission to send email. Verify a sending domain under your control (for example a subdomain of slashpromo.com).
2. In Cloudflare Dashboard → Workers & Pages → your SlashPromo Pages project → Settings → Variables and Secrets for **production**, set the three values as **encrypted secrets**:
   - `RESEND_API_KEY`: your sending API key.
   - `QA_NOTIFY_TO`: the private administrative inbox you want alerts sent to (single mailbox).
   - `QA_NOTIFY_FROM`: a verified sender email on your Resend sending domain.
3. Redeploy production if necessary to apply the new bindings. Do **not** paste the API key in GitHub, public comments or ChatGPT.
4. Submit one **test** question from a normal page and complete Cloudflare Turnstile. Do not submit a real patient's details during testing.
5. Check the admin Q&A moderation queue at https://slashpromo.com/qa-admin/ to confirm the test question is pending. Check `QA_NOTIFY_TO` for a message with its reference and category.
6. If no email arrives, review Resend's private send logs and Cloudflare Pages Functions logs. Confirm sender verification, the API key, and that secrets are attached to the production environment. A saved question is not evidence that an email was sent.

## Fail-closed/no-configuration behavior

When one or more of the three required secrets is absent or invalid, the notification is disabled. Public submissions and moderation continue to operate as before; no user-facing or public error mentions the private recipient or API key.

## Future optional enhancements

If durable delivery status and retry are needed, use a private D1 outbox plus a suitably authenticated background worker or queue. Do not introduce automated public answers, or forward question text/visitor PII over third-party email, without separate privacy review and approval.

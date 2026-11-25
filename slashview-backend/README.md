# Slashview authentication foundation (v0.8.0)
Standalone Cloudflare Worker and dedicated D1 database. Never bind the Slashpromo Q&A database. No credentials in source. This is a review-only foundation, not a production service.
- Create a separate D1 database, apply schema.sql, copy wrangler.example.toml to a local wrangler.toml with its actual ID, and deploy only after review.
- Pending accounts cannot log in. Email verification delivery, administrator approval UI, subscription entitlement checks, device limits and Android authentication UI are subsequent work. No approval bypass or bootstrap public endpoint.
- Passwords use salted PBKDF2-SHA256 (600000 iterations); opaque session tokens are hashed at rest and expire after 24 hours. Rate limits are persisted in D1. Validate real Worker CPU limits and abuse protections before launch.
- Do not enable mandatory login until owner access, verification, recovery, data-preserving offline access and subscription expiry are tested.
- Add scheduled cleanup of expired sessions/rate-limit buckets, email verification and password reset, admin MFA and audit log before public access. Existing Android application ID and library files must remain unchanged.
- Approved policy: three calendar months from approval, $1 monthly, two devices, manual payment initially; no deletion of personal books on expiry.

## Google sign-in
Use Android Credential Manager with Google ID tokens and a dedicated Slashview OAuth configuration. Validate signature, issuer, audience, expiration and one-time nonce server-side. Use Google subject as stable identity; never automatically merge existing password accounts based only on matching email. Require explicit authenticated linking. Verified Google email can satisfy email verification, but new accounts remain pending administrator approval. Existing approval, trial, entitlement and device restrictions apply identically. No OAuth client secrets in the APK. Configure production signing certificate and client IDs before enabling the preview control. Google sign-in is not active yet.

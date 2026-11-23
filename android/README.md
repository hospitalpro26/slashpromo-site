# SlashPromo Android Phase B — review-only packaging scaffold

**Not an APK or Play release.** This directory contains a versioned Bubblewrap/TWA configuration template, not generated Android source. The Android package ID `com.slashpromo.app` is provisional and must be checked against the owner's Play Console before the first signed build.

## Preconditions
- Approve and deploy the PWA PNG assets and updated `manifest.webmanifest` (this draft branch does **not** publish them).
- Install supported Node.js, JDK and Android SDK locally or on an approved build runner.
- Verify the live web manifest and icons load with correct MIME types.
- Choose the permanent package ID before production registration.
- Generate and protect a signing key **outside** source control (or configure Play App Signing). Never upload the keystore or credentials to the public repository.

## Bubblewrap generation (after deployment and approvals)
Install the maintained Bubblewrap CLI using the documented npm package; then use the web manifest to create an Android project in a fresh local directory:

```bash
npm install --global @bubblewrap/cli
mkdir -p android-generated && cd android-generated
bubblewrap init --manifest=https://slashpromo.com/manifest.webmanifest
```

During `init`, confirm the proposed package ID, label, app launcher, status-bar colors, fallback behavior and signing-key handling against this directory's `twa-manifest.json`. Bubblewrap generates its own `twa-manifest.json`; apply reviewed settings and run `bubblewrap update`. Never blindly overwrite a generated config.

For a local **unsigned** build only:

```bash
bubblewrap build --skipSigning
```

A signed APK/AAB requires a real signing key, controlled passwords and review approval. An unsigned APK is **not** installable as a normal Android release.

## Digital Asset Links: do not publish placeholders
Trusted Web Activity verification requires `https://slashpromo.com/.well-known/assetlinks.json` with:
- `relation: ["delegate_permission/common.handle_all_urls"]`
- `target.namespace: "android_app"`
- `target.package_name` matching the **final** package ID
- `target.sha256_cert_fingerprints` containing the genuine SHA-256 signing certificate fingerprint(s), including the Play App Signing certificate fingerprint when applicable.

Do **not** publish a guessed fingerprint or a test signing identity. The existing Slashcure links lead to a separate site and should remain normal external-browser links; do not add Slashcure as a trusted origin.

## Verification gates
1. Review PR and ensure PWA icons on staging/prod are valid 192/512 PNGs.
2. Generate Android project via Bubblewrap with real tools and verified configuration.
3. Build unsigned testing artifacts; check on Android emulator.
4. Add legitimate Digital Asset Links from the final signing key, then test app verification (otherwise TWA can show browser UI).
5. Test phone sizes, back navigation, Deep Links, offline fallback, public directory, WhatsApp handoffs, permissions, and accessibility.
6. Review the privacy policy and Google Play health-related content requirements.
7. Only then request explicit Play publishing approval. No auto-release.

No release signing secret, patient data, or app store credentials may be stored in GitHub source.


## Direct Android debug project (Phase B continuation)
A minimal Gradle Android Browser Helper Trusted Web Activity project is now checked in at `android/app/`. This is an independently reviewable alternative to Bubblewrap generation; choose one generated app project as the source of truth before final Play release and avoid maintaining duplicate release builds.

It uses a provisional `com.slashpromo.app` application ID, Android compile SDK 36 (target SDK 35), Java 17 and Android Browser Helper. The **debug** build intentionally uses `com.slashpromo.app.debug`, making it unable to impersonate the eventual production package. It requests INTERNET only; no camera, microphone, location, messaging or notification Android permissions. Browsing data is handled through the installed browser and existing public website, not a native patient database.

The GitHub Actions job `.github/workflows/android-debug-apk.yml` builds an Android **debug-signed test APK** from the PR branch with ephemeral runner credentials and uploads a seven-day artifact. A debug APK is suitable for manual functional tests, not Google Play release or formal TWA origin verification.

Local test if Android SDK, Java 17 and Gradle 8.13 are available:
```bash
cd android
gradle --no-daemon :app:assembleDebug
```

Important: origin verification requires actual Digital Asset Links. Before signature verification, the app may use a Custom Tab with browser UI rather than a verified full-screen TWA. Do not confuse a successful debug build with a verified trusted relationship. Confirm and secure the permanent release signing key through the owner's Android publishing process.

# Slashview ECG replacement pack — 0.12.10

Adds 30 distinct real clinical tracings and 90 sequential answer reveals under Exam → TOACS Part-II → ECG. Tracings are bundled in the APK and work offline. The viewer supports pinch zoom and panning; it does not use the reader's annotation storage. All stations keep the existing clinical-review draft label.

## Scope and source limitations

This is an original replacement practice bank built around verified reusable clinical tracings, not a transcription or a one-to-one reconstruction of the 29 uploaded book stations. It includes alternative examples of some patterns. It does **not** claim to include matching tracings for every original topic: HOCM, pre-excited AF, TCA toxicity, cerebral T waves and digoxin-induced AV block remain without a verified matching image in this release. Those diagnoses must not be inferred from unrelated tracings. Pre-excited AF is discussed as a safety point in the WPW answers, not represented as the rhythm in the resting WPW images.

The sotalol stem is fictional and the source image illustrates QT prolongation, not proven sotalol poisoning in the source patient. PE cannot be diagnosed from an ECG alone. Second-degree 2:1 block cannot be conclusively typed from a purely 2:1 strip. The inferior-MI/Wenckebach source contains inconsistent type wording; the answer notes this and uses the observable conduction sequence. Some original images have educational arrows/annotations; these remain visible and unchanged. All images retain their original resolution and calibration. Some are short rhythm strips or lead extracts rather than full 12-lead ECGs.

## Provenance and builds

`android/ecg-sources.json` records each original URL, attribution, source page, license, size and SHA-256. Images are reproduced unchanged under the listed CC BY, CC BY-SA or public-domain terms. Share-alike terms continue to apply to those images. Attribution and source links appear after the station answers. The source pages and original images remain freely accessible independently of the application.

`node scripts/fetch-ecg-assets.mjs` fetches the pinned originals **at build time**, with bounded retries and integrity verification. Both Android build workflows run it before compilation and fail if any image is missing, changed or corrupt. The app itself makes no image network requests. Image assets are about 41 MB uncompressed. Local development must run the fetch and validation commands before building an APK. The installed images are not a separately selectable content download in this release.

## Validation

- `node scripts/test-ecg-pack.mjs`: 30 distinct image hashes and stable IDs, file signatures, 90 populated answers, mark totals, attribution/license fields and reordered stations.
- Existing Android native/privacy and Phase B structural checks.
- Visual inspection of all source images; individual checking of special calibration and source labels.
- Existing station pack files, authentication, updater, books, notes, highlights and bookmark storage remain unchanged.
- Android compilation and protected signing run in GitHub Actions. Device UI/offline interaction testing is not claimed by the static checks.

Clinical management is concise educational material, retaining clinician-review status. References include the original image source discussions and the Resuscitation Council UK 2025 adult ALS guidance:
https://www.resus.org.uk/professional-library/2025-resuscitation-guidelines/adult-advanced-life-support-guidelines

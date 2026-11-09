# Slashcure to Slashpromo — daily doctor onboarding

This is a **review-first** automation. A GitHub Action runs daily at **03:00 UTC / 08:00 PKT**. Open the GitHub Actions page and select **Daily review-first Slashcure doctor onboarding** to run it manually as well.

It reads *public* Slashcure doctor listing pages for existing Slashpromo cities, plus the public Slashcure sitemap if available. It compares source doctor URLs against `assets/directory.json`, avoids obvious name/city duplicates, then inspects the doctor page for a supported name and specialty. It prepares at most **three drafts per run** for review. The resulting GitHub draft pull request contains proposed doctor pages, sitemap entries, directory records, and city/specialty links where the target page exists.

**Not automatically assumed:** qualifications, hospital affiliation, contact number, OPD timings, appointment availability, treatment prices. These must be reviewed and explicitly added with trustworthy sources before approval. Reviewers should verify each proposed doctor, name/city/specialty, correct hospital association, all links, current published schedule and information, and preview the deployment before marking the draft PR ready and merging.

**Nothing publishes just because the daily check runs.** Merging an approved PR triggers the regular Cloudflare deployment, SEO integrity tests and IndexNow notification. The Action will not create overlapping proposals while a previous doctor draft PR remains open.

The checker intentionally skips unknown cities, unsupported specialty URL patterns, duplicate profiles, ambiguous names and temporary source errors. Public directory listings may be paginated or partly JavaScript-rendered, so detection is **best effort**, not guaranteed exhaustive. The published sitemap, if available, increases coverage. All data processed is public doctor-directory information; no patient records or private profile details are collected.

If GitHub Action fails when creating a PR, check **Repository Settings → Actions → General → Workflow permissions → Allow GitHub Actions to create and approve pull requests**. The run will leave a draft branch for review, and show its name in the job log. A manually approved PR must still be merged by an authorized repository maintainer.

For development, use `node scripts/test-sync-slashcure-doctors.mjs` and `node scripts/sync-slashcure-doctors.mjs` (no `--apply` means dry-run). The Action uses `--apply` only to prepare an unmerged GitHub branch. The report is stored as a workflow artifact for 14 days.
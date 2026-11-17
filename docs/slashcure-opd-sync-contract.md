# Slashcure → Slashpromo public OPD schedule integration (review proposal)

Status: **proposed, not activated**. Slashcure and Slashpromo are separate projects. This document does not authorize a change to Slashcure.

## Objective

Make Slashpromo's AI Doctor Finder show **scheduled for today** only when that claim is supported by a recent, published Slashcure timetable. Slashcure remains the authoritative source. No claim of physical presence or confirmed appointments should be inferred from ordinary weekly hours.

## Required input from the Slashcure developer

Provide a documented, permissioned, read-only endpoint or export, for example `GET /api/public/opd-schedules`. The exact path is the developer's choice. Do not scrape private pages or bypass authentication.

The feed should contain only publicly approved fields and stable IDs:

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-11-16T14:00:00Z",
  "timezone": "Asia/Karachi",
  "doctors": [
    {
      "doctorId": "stable-public-id",
      "profileUrl": "https://slashcure.com/consultant-physicians/ratodero/dr-nadia-khan-arbani",
      "clinicId": "stable-public-clinic-id",
      "clinicName": "Barkat Clinic",
      "city": "Ratodero",
      "weeklySlots": [
        {"day": "Monday", "start": "16:30", "end": "20:30"}
      ],
      "exceptions": [
        {"date": "2026-11-17", "closed": true}
      ],
      "status": "schedule_published",
      "updatedAt": "2026-11-16T10:00:00Z"
    }
  ]
}
```

The example is illustrative, **not a representation of a live feed**.

## Privacy and trust boundaries

- Do not export patient names, phone numbers, appointments, health records, private notes, or access tokens.
- Publish only doctors and schedules explicitly approved for public visibility.
- Match existing Slashpromo doctors by **exact verified Slashcure profile URL or immutable public ID**. Reject unknown IDs; do not auto-create doctors.
- Validate HTTPS hostname `slashcure.com`, schema version, timezone, slot/day/time formats, and unique doctor-clinic-slot keys.
- Treat cancellations and exceptions as higher priority than weekly schedules.
- Treat real-time `available_at_clinic` as a **separate optional signal** with its own `observedAt` timestamp and short expiry; never infer it from a weekly timetable.
- Display `Scheduled today — confirm on Slashcure` only while the feed is fresh. Fail closed to `Check OPD on Slashcure` on fetch error, stale data, ambiguity, or missing records.
- Serve a cached sanitized snapshot from Slashpromo, not a live request to Slashcure for every patient query. Use a review-first deployment of the sync job.
- Maintain logs of import counts and validation failures without logging patient search queries.
- Keep the existing manually reviewed snapshot pilot until a tested feed replaces it. Avoid duplicate schedule sources in the UI.

## Proposed sync acceptance tests

1. Correct Monday/Sunday timetable in Pakistan timezone and midnight boundary.
2. Exceptions override recurring slots.
3. Removed/closed schedules immediately disappear from `todayOnly` results on next successful sync.
4. Stale/failed imports never display `Scheduled today`.
5. Unknown doctors, mismatched cities, duplicate slots, bad URLs and invalid times are rejected.
6. No surgeon appears for a physician query; no cross-city leakage; gender filters still require reviewed metadata.
7. A successful sync does not update Slashcure, create provider profiles, merge PRs, or deploy by itself.

## Implementation sequence

1. Obtain feed contract and a sanitized sample from Slashcure's authorized developer.
2. Implement an offline validator and dry-run matching report against `assets/directory.json`.
3. Test in a review-only Slashpromo PR, including simulated outages and invalid data.
4. After separate approval, schedule Cloudflare/GitHub sync with secrets managed in the platform (if required).
5. Verify live sample doctors and observe freshness/expiry before widening rollout.

**Approval gate:** no scheduled import, production credential, workflow enablement, or publication until the developer's feed is available and the owner explicitly approves the implementation.

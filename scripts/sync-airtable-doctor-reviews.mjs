#!/usr/bin/env node
/**
 * GitHub Actions -> private Airtable doctor review queue.
 *
 * Only verified public draft candidates from .doctor-sync/report.json are sent.
 * No patient records, communications, or credentials are copied to the repository.
 * A new Airtable record triggers the existing "Log new doctor for human review" automation.
 *
 * The API credential is supplied solely through the SLASHPROMO_AIRTABLE_PAT
 * GitHub Actions secret. No authorization token is committed to git.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseDoctorUrl, doctorIdentity, normalizedCitySlug} from './sync-slashcure-doctors.mjs';

const BASE_ID = 'appvI05OTnWWQeXaZ';
const TABLE_ID = 'tbl5cEkwJ3wts5aQt';
const ENDPOINT = 'https://api.airtable.com/v0/' + BASE_ID + '/' + TABLE_ID;
const MAX_PAGES = 100;
const PAUSE = ms => new Promise(resolve => setTimeout(resolve, ms));

export function sourceKey(value) {
  if (typeof value !== 'string' || !value.startsWith('https://slashcure.com/')) return null;
  return parseDoctorUrl(value)?.source || null;
}
export function identityKey(name, city) {
  if (typeof name !== 'string' || typeof city !== 'string') return null;
  const n = doctorIdentity(name), c = normalizedCitySlug(city);
  return n && c ? c + ':' + n : null;
}
function validReviewUrl(value) {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' &&
      u.hostname === 'github.com' &&
      (/^\/hospitalpro26\/slashpromo-site\/pull\/[0-9]+$/.test(u.pathname) ||
       /^\/hospitalpro26\/slashpromo-site\/compare\/main\.\.\.automation\/slashcure-onboarding-[0-9]+$/.test(u.pathname));
  } catch { return false; }
}
function isPullUrl(value) {
  return /^https:\/\/github\.com\/hospitalpro26\/slashpromo-site\/pull\/[0-9]+$/.test(value || '');
}

/** Pure, deterministic and idempotent batch planning; never updates existing rows. */
export function planNewRecords(drafts, existingRecords, reviewUrl) {
  if (!validReviewUrl(reviewUrl)) throw new Error('Missing or invalid human-review URL. No Airtable records written.');
  const sources = new Set(), identities = new Set();
  for (const row of existingRecords) {
    const fields = row.fields || row.cellValuesByFieldId || {};
    const s = sourceKey(fields['Slashcure Profile URL'] || fields.fld7AYqVLDSGRC9ya);
    const n = identityKey(fields['Doctor Name'] || fields.fldeieAKwx25sCxZp,
                          fields.City || fields.fldu5egxesDZYyQGw);
    if (s) sources.add(s);
    if (n) identities.add(n);
  }

  const out = [];
  for (const doctor of drafts) {
    if (!doctor || typeof doctor !== 'object') continue;
    const source = sourceKey(doctor.externalProfile);
    const identity = identityKey(doctor.name, doctor.city);
    const local = doctor.url;
    if (!source || !identity || !/^Dr[.]? /i.test(doctor.name) ||
        typeof local !== 'string' ||
        !/^\/doctors\/[a-z0-9-]+\/dr-[a-z0-9-]+\/$/.test(local) ||
        typeof doctor.specialty !== 'string' || !doctor.specialty.trim()) continue;
    const sourceCity = normalizedCitySlug(parseDoctorUrl(source).city);
    if (sourceCity !== normalizedCitySlug(doctor.city)) continue;
    if (sources.has(source) || identities.has(identity)) continue;

    const fields = {
      'Doctor Name': doctor.name.trim().slice(0, 130),
      'Slashcure Profile URL': source,
      'City': doctor.city.trim().slice(0, 100),
      'Specialty': doctor.specialty.trim().slice(0, 100),
      'Review Status': 'Ready for human review',
      'SlashPromo URL': 'https://slashpromo.com' + local,
      'IndexNow Status': 'Not submitted',
      'Google Indexing': 'Not checked',
      'Internal Notes': 'Public doctor candidate discovered by GitHub Actions. Verify credentials, OPD, clinic and city. Do not publish until human approval. ' +
        (isPullUrl(reviewUrl) ? 'Draft PR: ' : 'Fallback review comparison (not a PR): ') + reviewUrl
    };
    if (isPullUrl(reviewUrl)) fields['GitHub Pull Request'] = reviewUrl;
    out.push({fields});
    sources.add(source);
    identities.add(identity);
  }
  return out;
}

async function apiCall(token, url, options = {}, fetchImpl = fetch) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetchImpl(url, {
      ...options,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      signal: AbortSignal.timeout(20000)
    });
    if (response.ok) return response.json();
    if ((response.status === 429 || response.status >= 500) && attempt < 3) {
      await PAUSE(response.status === 429 ? 30000 : 1000 * (attempt + 1));
      continue;
    }
    if (response.status === 401 || response.status === 403)
      throw new Error('Airtable authorization failed (HTTP ' + response.status + '). Check the scoped PAT secret.');
    throw new Error('Airtable API request failed with HTTP ' + response.status + '. No private response details logged.');
  }
}

export async function readExisting(token, fetchImpl = fetch) {
  const rows = [];
  let offset;
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(ENDPOINT);
    url.searchParams.set('pageSize', '100');
    for (const field of ['Doctor Name', 'Slashcure Profile URL', 'City'])
      url.searchParams.append('fields[]', field);
    if (offset) url.searchParams.set('offset', offset);
    const data = await apiCall(token, url, {}, fetchImpl);
    if (!Array.isArray(data.records)) throw new Error('Unexpected Airtable list response; no writes performed.');
    rows.push(...data.records);
    if (!data.offset) return rows;
    offset = data.offset;
  }
  throw new Error('Too many Airtable pages. Stopped rather than risking duplicate records.');
}

export async function createNew(token, rows, fetchImpl = fetch) {
  let created = 0;
  for (let i = 0; i < rows.length; i += 10) {
    const batch = rows.slice(i, i + 10);
    const data = await apiCall(token, ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({records: batch, typecast: false})
    }, fetchImpl);
    if (!Array.isArray(data.records) || data.records.length !== batch.length)
      throw new Error('Airtable returned an unexpected create response. Review the table before retrying.');
    created += data.records.length;
  }
  return created;
}

async function main() {
  const reportFile = process.argv[2] || '.doctor-sync/report.json';
  const data = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  if (!Array.isArray(data.drafts)) throw new Error('Discovery report has no draft array; refusing to sync.');
  if (!data.drafts.length) {
    console.log('Airtable review sync: zero new doctor drafts. Nothing to create.');
    return;
  }
  const token = process.env.SLASHPROMO_AIRTABLE_PAT;
  if (!token) {
    console.log('::warning::Airtable sync not configured: add repository secret SLASHPROMO_AIRTABLE_PAT (scoped read/write PAT).');
    return;
  }
  const reviewUrl = process.env.DOCTOR_REVIEW_URL;
  if (!validReviewUrl(reviewUrl)) throw new Error('No valid GitHub review URL; refusing to create Airtable records.');
  const rows = await readExisting(token);
  const additions = planNewRecords(data.drafts, rows, reviewUrl);
  if (!additions.length) {
    console.log('Airtable review sync: every eligible doctor already exists, or requires manual verification.');
    return;
  }
  const created = await createNew(token, additions);
  console.log('Airtable review sync: added ' + created + ' doctor(s) for human review, no publication.');
  if (process.env.GITHUB_STEP_SUMMARY)
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      '\n### Airtable review queue\nCreated ' + created + ' candidate records; nothing auto-published.\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]))
  main().catch(error => { console.error('Airtable review sync: ' + error.message); process.exitCode = 1; });

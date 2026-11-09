import assert from 'node:assert/strict';
import {
  sourceKey, identityKey, planNewRecords, readExisting, createNew
} from './sync-airtable-doctor-reviews.mjs';

const review = 'https://github.com/hospitalpro26/slashpromo-site/pull/91';
const fallback = 'https://github.com/hospitalpro26/slashpromo-site/compare/main...automation/slashcure-onboarding-123?expand=1';
const candidate = {
  name: 'Dr. Saba Ali Raza Mahesar',
  city: 'Pano Aqil',
  specialty: 'Gynecologist & Obstetrician',
  externalProfile: 'https://slashcure.com/gynecologists-obstetricians/panoaqil/dr-saba-ali-raza-mahesar',
  url: '/doctors/pano-aqil/dr-saba-ali-raza-mahesar/'
};
assert.equal(sourceKey(candidate.externalProfile), candidate.externalProfile);
assert.equal(sourceKey('https://other-site.example/gynecologists-obstetricians/panoaqil/dr-saba-ali-raza-mahesar'), null);
assert.equal(sourceKey('https://slashcure.com/gynecologists-obstetricians/panoaqil/dr-saba-ali-raza-mahesar?fake=1'), null);
assert.equal(identityKey('Dr. Komal Kandhir PT','Sukkur'),identityKey('Dr. Komal Kandhir','sukkur'));
assert.equal(identityKey('Dr. Saba Ali Raza Mahesar','panoaqil'),identityKey('Dr. Saba Ali Raza Mahesar','Pano Aqil'));

const first = planNewRecords([candidate, candidate], [], review);
assert.equal(first.length,1,'Do not create two copies of the same doctor in one run');
assert.equal(first[0].fields['Review Status'], 'Ready for human review');
assert.equal(first[0].fields['GitHub Pull Request'], review);
assert.equal(first[0].fields['SlashPromo URL'], 'https://slashpromo.com' + candidate.url);
assert.equal(first[0].fields['Google Indexing'], 'Not checked');
assert.equal(first[0].fields['IndexNow Status'], 'Not submitted');
assert.equal(planNewRecords([candidate],[{fields:{
  'Slashcure Profile URL': candidate.externalProfile, 'Doctor Name':candidate.name, City:candidate.city
}}],review).length,0,'Existing exact URL must be skipped');
assert.equal(planNewRecords([candidate],[{fields:{
  'Doctor Name':candidate.name, City:'Panoaqil'
}}],review).length,0,'Existing name + city alias must be skipped');
assert.equal(planNewRecords([candidate],[{fields:{
  'Doctor Name': 'Dr. Different Person', City:'Pano Aqil'
}}],review).length,1,'Different doctor in same city remains eligible');
const compareFields=planNewRecords([candidate],[],fallback)[0].fields;
assert.equal('GitHub Pull Request' in compareFields,false,'A comparison link is not a PR');
assert.match(compareFields['Internal Notes'],/Fallback review comparison/);
assert.equal(planNewRecords([{...candidate,externalProfile:'https://example.com/steal'}],[],review).length,0);
assert.equal(planNewRecords([{...candidate,url:'https://attacker.example/path'}],[],review).length,0);
assert.throws(()=>planNewRecords([candidate],[],'https://attacker.example/pull/99'),/review URL/);
console.log('PASS: public URLs, city aliases, identity deduplication, review-first safeguards');

let reads = 0;
const fakeRead = async (url, opts) => {
  assert.equal(opts.headers.Authorization,'Bearer test-pat');
  assert.equal(opts.method || 'GET','GET');
  const u = new URL(url);
  reads++;
  if (!u.searchParams.get('offset')) {
    return new Response(JSON.stringify({records:[{id:'rec1',fields:{'Doctor Name':'Dr. X'}}],offset:'next-page'}),{status:200});
  }
  assert.equal(u.searchParams.get('offset'),'next-page');
  return new Response(JSON.stringify({records:[{id:'rec2',fields:{'Doctor Name':'Dr. Y'}}]}),{status:200});
};
const rows=await readExisting('test-pat',fakeRead);
assert.equal(rows.length,2);
assert.equal(reads,2);
let writes = [];
const fakeWrite=async (url,opts)=>{
  assert.equal(url.startsWith('https://api.airtable.com/v0/'),true);
  assert.equal(opts.headers.Authorization,'Bearer test-pat');
  assert.equal(opts.method,'POST');
  const json=JSON.parse(opts.body);
  assert.equal(json.typecast,false);
  assert.ok(json.records.length <= 10);
  writes.push(json.records.length);
  return new Response(JSON.stringify({records:json.records.map((r,i)=>({id:'rec'+i,fields:r.fields}))}),{status:200});
};
const created=await createNew('test-pat',Array.from({length:12},()=>first[0]),fakeWrite);
assert.equal(created,12);
assert.deepEqual(writes,[10,2]);
await assert.rejects(()=>readExisting('bad',async()=>new Response('{}',{status:401})),/authorization failed/);
console.log('PASS: API pagination, limited batch size, safe error handling, and no real API calls');

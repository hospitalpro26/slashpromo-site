import assert from 'node:assert/strict';
import {parseDoctorUrl,extractDoctorLinks,extractDoctorName,escapeHtml,slug,normalizedCitySlug,doctorIdentity,isAlreadyListedByIdentity} from './sync-slashcure-doctors.mjs';
assert.equal(parseDoctorUrl('https://slashcure.com/paediatricians/sukkur/dr-rizwana-qureshi')?.city,'sukkur');
assert.equal(parseDoctorUrl('https://slashcure.com/hospitals/sukkur/dr-rizwana-qureshi'),null);
assert.equal(parseDoctorUrl('https://example.com/paediatricians/sukkur/dr-rizwana-qureshi'),null);
assert.equal(parseDoctorUrl('https://slashcure.com/paediatricians/sukkur/dr-rizwana-qureshi?token=x'),null);
assert.equal(extractDoctorLinks('<a href="/paediatricians/sukkur/dr-rizwana-qureshi">Doctor</a><a href="/hospitals/sukkur/x">Hospital</a>').length,1);
assert.equal(extractDoctorLinks('<loc>https://slashcure.com/paediatricians/sukkur/dr-rizwana-qureshi</loc>').length,1);
assert.equal(extractDoctorName('<h1>Dr. Rizwana Qureshi</h1>','dr-rizwana-qureshi'),'Dr. Rizwana Qureshi');
assert.equal(extractDoctorName('<h1>Welcome to Slashcure</h1>','dr-rizwana-qureshi'),null);
assert.equal(extractDoctorName('<h1>Dr. Another Doctor</h1>','dr-rizwana-qureshi'),null);
assert.equal(escapeHtml('<script>x</script>'),'&lt;script&gt;x&lt;/script&gt;');
assert.equal(slug('Pano Aqil'),'pano-aqil');
console.log('PASS: secure URL allowlist, source parsing, name verification, and HTML escaping');
const komalExisting=[{name:'Dr. Komal Kandhir',city:'Sukkur',url:'/doctors/sukkur/dr-komal-kandhir/',externalProfile:'https://slashcure.com/consultant-physiotherapists/sukkur/dr-komal-kandhir-pt'}];
assert.equal(doctorIdentity('Dr. Komal Kandhir PT'),doctorIdentity('Dr. Komal Kandhir'));
assert.equal(doctorIdentity('dr-komal-kandhir-pt'),doctorIdentity('Dr. Komal Kandhir'));
assert.equal(isAlreadyListedByIdentity({city:'sukkur',doctorSlug:'dr-komal-kandhir-pt'},komalExisting),true);
assert.equal(isAlreadyListedByIdentity({city:'sukkur',doctorSlug:'dr-another-doctor'},komalExisting),false);
assert.equal(isAlreadyListedByIdentity({city:'karachi',doctorSlug:'dr-komal-kandhir-pt'},komalExisting),false);
console.log('PASS: Duplicate doctor identity matched across physiotherapy specialty URLs and PT suffixes');
assert.equal(normalizedCitySlug('panoaqil'),'pano-aqil');
assert.equal(normalizedCitySlug('Pano Aqil'),'pano-aqil');
assert.equal(parseDoctorUrl('https://slashcure.com/gynecologists-obstetricians/panoaqil/dr-saba-ali-raza-mahesar')?.city,'panoaqil');
assert.equal(isAlreadyListedByIdentity({city:'panoaqil',doctorSlug:'dr-saba-ali-raza-mahesar'},[{name:'Dr. Saba Ali Raza Mahesar',city:'Pano Aqil',url:'/doctors/pano-aqil/dr-saba-ali-raza-mahesar/'}]),true);
console.log('PASS: Pano Aqil URL spellings normalize and newly listed doctors do not duplicate');
assert.equal(normalizedCitySlug('panoaqi'),'pano-aqil');
assert.equal(normalizedCitySlug('pano-aqil-sindh'),'pano-aqil');
assert.equal(normalizedCitySlug('lakhi-ghulam-shah-shikarpur-sindh'),'lakhi-ghulam-shah');
assert.equal(normalizedCitySlug('dina-jhelum'),'jhelum');
assert.equal(isAlreadyListedByIdentity({city:'panoaqi',doctorSlug:'dr-parvez-ahmed'},[{name:'Dr. Parvez Ahmed',city:'Pano Aqil',url:'/doctors/pano-aqil/dr-parvez-ahmed/'}]),true);
console.log('PASS: Alias city paths do not re-onboard existing doctors');

/* Regression coverage for professional prefixes, PT suffixes and location aliases. */
assert.equal(doctorIdentity('Prof. Dr. Kirpal Das Makheja'),doctorIdentity('dr-kirpal-das-makheja'));
assert.equal(doctorIdentity('Assistant Professor Dr. Amna'),doctorIdentity('dr-amna'));
assert.equal(doctorIdentity('Dr. Komal Kandhir (PT)'),doctorIdentity('dr-komal-kandhir-pt'));
assert.equal(doctorIdentity('Dr. Komal Kandhir DPT'),doctorIdentity('dr-komal-kandhir'));
assert.equal(isAlreadyListedByIdentity({city:'sukkur',doctorSlug:'dr-kirpal-das-makheja'},[
  {name:'Prof. Dr. Kirpal Das Makheja',city:'Sukkur',url:'/doctors/sukkur/prof-dr-kirpal-das-makheja/'}
]),true);
assert.equal(isAlreadyListedByIdentity({city:'pano-aqil-sindh',doctorSlug:'dr-farooq-illahi'},[
  {name:'Dr. Farooq Illahi',city:'Pano Aqil',url:'/doctors/pano-aqil/dr-farooq-illahi/'}
]),true);
console.log('PASS: Professor/assistant prefixes, PT suffixes and location aliases deduplicate');

const fs = await import('node:fs');
const data=JSON.parse(fs.readFileSync('assets/directory.json','utf8'));
let checked=0;
for(const entry of data.doctors){
  if(!entry.externalProfile)continue;
  const parsed=parseDoctorUrl(entry.externalProfile);
  if(!parsed)continue;
  assert.equal(isAlreadyListedByIdentity(parsed,data.doctors),true,
    'Existing doctor cannot be a new candidate: '+entry.name);
  checked++;
}
assert(checked>=15,'Expected at least 15 existing linked doctor tests');
console.log('PASS: '+checked+' existing public Slashcure profiles all deduplicate safely');

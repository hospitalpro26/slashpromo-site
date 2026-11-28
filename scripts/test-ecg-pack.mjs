import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root));
const pack=JSON.parse(read('android/app/src/main/assets/toacs-ecg.json'));
const sources=JSON.parse(read('android/ecg-sources.json'));
assert.equal(pack.length,30);assert.equal(sources.length,30);
const ids=new Set(),images=new Set(),hashes=new Set();
for(const [index,s] of pack.entries()){
  assert.match(s.id,/^SV-TOACS-ECG-\d{3}$/);assert(!ids.has(s.id));ids.add(s.id);
  assert.notEqual(Number(s.id.slice(-3)),index+1,'Station order must change');
  assert.equal(s.status,'draft_pending_clinical_review');
  assert.equal(s.questions.length,3);assert.equal(s.totalMarks,10);
  assert.equal(s.questions.reduce((n,q)=>n+q.marks,0),s.totalMarks);
  assert(s.questions.every(q=>q.question && q.answer && q.marks>0));
  assert(s.scenario && Array.isArray(s.findings) && s.learningPoints.length);
  assert(s.ecgCredit.includes('License:')&&s.ecgCredit.includes('Source:'));
  assert(!images.has(s.ecgImage));images.add(s.ecgImage);
  const source=sources.find(x=>'ecg/'+x.file===s.ecgImage);assert(source);
  assert(!hashes.has(source.sha256),'Each tracing must be distinct');hashes.add(source.sha256);
  const bytes=read('android/app/src/main/assets/'+s.ecgImage);
  assert.equal(bytes.length,source.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sha256);
  assert((bytes[0]===0xff&&bytes[1]===0xd8)||bytes.subarray(1,4).toString()==='PNG','Actual image bytes required');
  assert(!/NC|NoDerivatives/.test(source.license),'Only reusable image licenses permitted');
}
console.log('PASS 30 distinct offline ECGs, integrity, credits, 90 answers, marks and reordered stable IDs');

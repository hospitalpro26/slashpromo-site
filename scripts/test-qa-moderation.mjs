import assert from 'node:assert/strict';
import {onRequestPost} from '../functions/api/qa-admin.js';
import {hasPrivateInfo} from '../functions/_lib/qa.js';

const id='00000000-0000-4000-8000-000000000000';
const key='local-test-only-admin-key';
const env={QA_ADMIN_KEY:key,QA_DB:{}};
async function attempt(status,answer,authorized=true){
  const request=new Request('https://slashpromo.com/api/qa-admin',{
    method:'POST',
    headers:{'Content-Type':'application/json','X-QA-Admin-Key':authorized?key:'invalid'},
    body:JSON.stringify({id,status,answer})
  });
  return onRequestPost({request,env});
}
const blocked=[
  'Please contact 03001234567 about OPD timings.',
  'Send private details to patient@example.com.',
  'Patient ID 12345678 must be checked privately.',
  'CNIC: 12345-1234567-1 should not appear publicly.'
];
for(const answer of blocked){
  assert.equal(hasPrivateInfo(answer),true,answer);
  const response=await attempt('approved',answer);
  assert.equal(response.status,400,'Private information must be rejected before a database write');
  assert.match((await response.json()).error,/private contact details/i);
}
assert.equal((await attempt('approved','A general, verified answer without contact details.',false)).status,401);
assert.equal((await attempt('approved','short')).status,400);
console.log('PASS: private details rejected in approved Q&A answers; unauthenticated moderation and short answers blocked.');

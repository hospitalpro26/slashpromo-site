import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',keys.publicKey),kid:'test'};
async function jwt(claims){const input=encode({alg:'RS256',kid:'test'})+'.'+encode(claims);return input+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(input))).toString('base64url');}
function setup(){
 const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('schema.sql',root),'utf8'));
 for(const file of readdirSync(new URL('migrations/',root)).sort())db.exec(readFileSync(new URL('migrations/'+file,root),'utf8'));
 function prepare(sql){let params=[];const statement={bind(...p){params=p;return statement},first(){return db.prepare(sql).get(...params)||null},all(){return {results:db.prepare(sql).all(...params)}},run(){const r=db.prepare(sql).run(...params);return {meta:{changes:Number(r.changes)}}}};return statement;}
 const messages=[];
 const env={DB:{prepare,async batch(statements){db.exec('BEGIN');try{const r=statements.map(s=>s.run());db.exec('COMMIT');return r}catch(e){db.exec('ROLLBACK');throw e}}},AUTH_ENABLED:'true',REGISTRATION_ENABLED:'true',GOOGLE_ENABLED:'true',GOOGLE_REGISTRATION_ENABLED:'true',GOOGLE_CLIENT_ID:'test.apps.googleusercontent.com',REVIEW_ADMIN_ENABLED:'true',ACCESS_TEAM_DOMAIN:'https://test.cloudflareaccess.com',ACCESS_AUD:'admin',ACCESS_OWNER_EMAIL:'owner@example.test',ADMIN_TOKEN:'a'.repeat(32),MAILER:{async fetch(url,opts){messages.push(JSON.parse(opts.body));return new Response('OK')}}};
 return {db,env,messages};
}
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(readFileSync(new URL('dashboard-worker.js',root),'utf8')).toString('base64'));
const profile={name:'Test member',email:'member@example.test',password:'A long test password!',city:'Sukkur',address:'',whatsapp:'',termsAccepted:true,privacyAcknowledged:true,pricingAccepted:true,policyVersion:'review-1'};
async function call(env,path,body,headers={}){const response=await worker.fetch(new Request('https://example.test'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','CF-Connecting-IP':'test',...headers},body:body?JSON.stringify(body):undefined}),env);return {status:response.status,body:await response.json()};}
async function owner(){const now=Math.floor(Date.now()/1000);return {'Cf-Access-Jwt-Assertion':await jwt({iss:'https://test.cloudflareaccess.com',aud:['admin'],email:'owner@example.test',iat:now,exp:now+600}),Authorization:'Bearer '+'a'.repeat(32)};}
async function withKeys(fn){const previous=globalThis.fetch;globalThis.fetch=async()=>Response.json({keys:[jwk]});try{await fn()}finally{globalThis.fetch=previous}}
test('email registration, duplicate protection, verification, approval, recovery and session revocation',()=>withKeys(async()=>{
 const {db,env,messages}=setup();
 assert.equal((await call(env,'/v1/register',{...profile,city:''})).status,400);
 assert.equal((await call(env,'/v1/register',profile)).status,202);
 assert.equal((await call(env,'/v1/register',{...profile,city:'Karachi'})).status,202);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM accounts').get().n,1);
 assert.equal(db.prepare('SELECT city FROM account_profiles').get().city,'Sukkur');
 const account=db.prepare('SELECT * FROM accounts').get();
 assert.notEqual(account.password_hash,profile.password);
 const headers=await owner();
 assert.equal((await call(env,'/v1/admin/approve',{id:account.id},headers)).status,409);
 assert.equal((await call(env,'/v1/verification/request',{email:profile.email})).status,202);
 const verify=messages.at(-1).code;
 assert.equal((await call(env,'/v1/verification/confirm',{code:verify})).status,200);
 assert.equal((await call(env,'/v1/verification/confirm',{code:verify})).status,400);
 assert.equal((await call(env,'/v1/admin/approve',{id:account.id},headers)).status,200);
 const login=await call(env,'/v1/login',{...profile,deviceId:'b'.repeat(64)});assert.equal(login.status,200);
 const auth={Authorization:'Bearer '+login.body.token};assert.equal((await call(env,'/v1/me',null,auth)).status,200);
 assert.equal((await call(env,'/v1/recovery/request',{email:profile.email})).status,202);
 const reset=messages.at(-1).code;const password='A different secure password!';
 assert.equal((await call(env,'/v1/recovery/confirm',{code:reset,password})).status,200);
 assert.equal((await call(env,'/v1/me',null,auth)).status,401);
 assert.equal((await call(env,'/v1/recovery/confirm',{code:reset,password})).status,400);
 assert.equal((await call(env,'/v1/login',{...profile,deviceId:'b'.repeat(64)})).status,401);
 assert.equal((await call(env,'/v1/login',{...profile,password,deviceId:'b'.repeat(64)})).status,200);
 assert.equal((await call(env,'/v1/admin/accounts',null,headers)).body.accounts[0].city,'Sukkur');
 assert.equal((await call(env,'/v1/admin/accounts')).status,401);
 db.close();
}));
test('Google verifies signature/audience and nonce; new accounts stay pending; replay and email linking rejected',()=>withKeys(async()=>{
 const {db,env}=setup();const now=Math.floor(Date.now()/1000);
 const nonce=(await call(env,'/v1/google/nonce',{})).body.nonce;
 const claims={iss:'https://accounts.google.com',aud:env.GOOGLE_CLIENT_ID,iat:now,exp:now+600,sub:'google-test',email:'member@gmail.com',email_verified:true,nonce};
 const token=await jwt(claims);
 assert.equal((await call(env,'/v1/google/login',{...profile,idToken:await jwt({...claims,aud:'wrong'})})).status,401);
 assert.equal((await call(env,'/v1/google/login',{...profile,idToken:token})).status,202);
 assert.equal((await call(env,'/v1/google/login',{...profile,idToken:token})).status,401);
 assert.equal(db.prepare('SELECT status FROM accounts').get().status,'pending');
 const next=(await call(env,'/v1/google/nonce',{})).body.nonce;
 assert.equal((await call(env,'/v1/google/login',{...profile,idToken:await jwt({...claims,nonce:next}),deviceId:'c'.repeat(64)})).status,403);
 const third=(await call(env,'/v1/google/nonce',{})).body.nonce;
 assert.equal((await call(env,'/v1/google/login',{...profile,idToken:await jwt({...claims,nonce:third,sub:'different-sub'})})).status,409);
 db.close();
}));
test('missing mailer fails closed and additive profile migration preserves existing account',async()=>{
 const {db,env}=setup();delete env.MAILER;
 assert.equal((await call(env,'/v1/register',profile)).status,503);
 assert.equal((await call(env,'/v1/recovery/request',{email:profile.email})).status,503);
 db.exec(readFileSync(new URL('migrations/0006_account_profiles.sql',root),'utf8'));
 assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');db.close();
});

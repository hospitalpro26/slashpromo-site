import {accessOwner} from "./access-owner.js";
import {verifyGoogle} from "./google-identity.js";
const encoder = new TextEncoder();
const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2,"0")).join("");
const random = n => hex(crypto.getRandomValues(new Uint8Array(n)));
const digest = async s => hex(await crypto.subtle.digest("SHA-256", encoder.encode(s)));
async function passwordHash(password,salt) {
 const key=await crypto.subtle.importKey("raw",encoder.encode(password),"PBKDF2",false,["deriveBits"]);
 return hex(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:encoder.encode(salt),iterations:600000},key,256));
}
function equal(a,b) { if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0; }
const json=(body,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
async function limited(db,key,max,window) {
 const now=Math.floor(Date.now()/1000),bucket=await digest(key+":"+Math.floor(now/window));
 const row=await db.prepare("INSERT INTO rate_limits(bucket,hits,expires_at) VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET hits=hits+1 RETURNING hits").bind(bucket,now+window).first();
 return row.hits>max;
}
function entitlement(account, now=Date.now()) {
 const active = value => typeof value === "string" && Number.isFinite(Date.parse(value)) && Date.parse(value)>now;
 return active(account.paid_until) ? "paid" : active(account.trial_until) ? "trial" : "expired";
}
async function createSession(env,account,deviceId){
 if(typeof deviceId!=="string"||!/^[a-f0-9]{64}$/.test(deviceId))return json({error:"Installation identifier required"},400);
 const device=await digest(deviceId), token=random(32), hash=await digest(token), expires=Math.floor(Date.now()/1000)+86400;
 const results=await env.DB.batch([
  env.DB.prepare("INSERT INTO devices(account_id,device_hash,created_at) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM accounts WHERE id=? AND status='approved') AND ((SELECT COUNT(*) FROM devices WHERE account_id=?)<2 OR EXISTS(SELECT 1 FROM devices WHERE account_id=? AND device_hash=?)) ON CONFLICT(account_id,device_hash) DO NOTHING").bind(account.id,device,new Date().toISOString(),account.id,account.id,account.id,device),
  env.DB.prepare("DELETE FROM sessions WHERE account_id=? AND device_hash=?").bind(account.id,device),
  env.DB.prepare("INSERT INTO sessions(token_hash,account_id,expires_at,device_hash) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM devices WHERE account_id=? AND device_hash=?) AND EXISTS(SELECT 1 FROM accounts WHERE id=? AND status='approved' AND email_verified_at IS NOT NULL)").bind(hash,account.id,expires,device,account.id,device,account.id)
 ]);
 if(results[2].meta.changes!==1)return json({error:"Device limit reached or account unavailable"},403);
 return json({token,expires_at:expires});
}
async function readJson(req,max=4096){
 if(!req.headers.get("Content-Type")?.startsWith("application/json"))return null;
 const reader=req.body?.getReader();if(!reader)return null;
 let size=0, chunks=[];try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();return null}chunks.push(value)}}finally{reader.releaseLock()}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
 try{return JSON.parse(new TextDecoder().decode(bytes))}catch{return null}
}
async function sendCode(env,email,code,purpose){
 // Optional service binding to a separately provisioned transactional mail Worker.
 if(!env.MAILER)throw Error("Mail delivery unavailable");
 const response=await env.MAILER.fetch("https://mailer.internal/send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,code,purpose})});
 if(!response.ok)throw Error("Mail delivery unavailable");
}
async function issueCode(env,account,purpose){
 const code=random(32), hash=await digest(code), expires=Math.floor(Date.now()/1000)+1800;
 await env.DB.prepare("INSERT INTO account_tokens(account_id,purpose,token_hash,expires_at) VALUES (?,?,?,?) ON CONFLICT(account_id,purpose) DO UPDATE SET token_hash=excluded.token_hash,expires_at=excluded.expires_at").bind(account.id,purpose,hash,expires).run();
 try{await sendCode(env,account.email,code,purpose)}catch(e){await env.DB.prepare("DELETE FROM account_tokens WHERE token_hash=?").bind(hash).run();throw e}
}
export default {
 async scheduled(event,env,ctx){
  const now=Math.floor(Date.now()/1000);
  await env.DB.batch([
   env.DB.prepare("DELETE FROM sessions WHERE expires_at<=?").bind(now),
   env.DB.prepare("DELETE FROM rate_limits WHERE expires_at<=?").bind(now),
   env.DB.prepare("DELETE FROM account_tokens WHERE expires_at<=?").bind(now),
   env.DB.prepare("DELETE FROM google_nonces WHERE expires_at<=?").bind(now)
  ]);
 },
 async fetch(req,env){
 try {
  const path=new URL(req.url).pathname;
  if(!env.DB)return json({error:"Service unavailable"},503);
  if(req.method==="GET" && (path==="/" || path==="/health")) {
   await env.DB.prepare("SELECT 1").first();
   return json({application:"Slashview",service:"Authentication API",status:"online",database:"connected"});
  }
  if(env.AUTH_ENABLED!=="true")return json({error:"Authentication not enabled"},503);
  const ip=req.headers.get("CF-Connecting-IP")||"unknown";
  if(req.method==="POST"&&["/v1/google/nonce","/v1/google/login"].includes(path)){
   if(env.GOOGLE_ENABLED!=="true"||!env.GOOGLE_CLIENT_ID)return json({error:"Google sign-in unavailable"},503);
   if(await limited(env.DB,"google:"+ip,15,900))return json({error:"Try again later"},429);
   const now=Math.floor(Date.now()/1000);
   if(path.endsWith("/nonce")){
    const nonce=random(32);
    await env.DB.prepare("INSERT INTO google_nonces(nonce_hash,expires_at) VALUES (?,?)").bind(await digest(nonce),now+300).run();
    return json({nonce});
   }
   const input=await readJson(req,12000);if(!input)return json({error:"Invalid request"},400);
   let claims;try{claims=await verifyGoogle(input.idToken,env.GOOGLE_CLIENT_ID)}catch{return json({error:"Invalid Google credential"},401)}
   const consumed=await env.DB.prepare("DELETE FROM google_nonces WHERE nonce_hash=? AND expires_at>?").bind(await digest(claims.nonce),now).run();
   if(consumed.meta.changes!==1)return json({error:"Invalid or expired challenge"},401);
   let account=await env.DB.prepare("SELECT a.* FROM accounts a JOIN google_identities g ON g.account_id=a.id WHERE g.subject=?").bind(claims.sub).first();
   if(!account){
    if(env.REGISTRATION_ENABLED!=="true")return json({error:"Registration not enabled"},503);
    if(input.termsAccepted!==true||input.privacyAcknowledged!==true||input.pricingAccepted!==true||input.policyVersion!=="review-1")return json({error:"Consent required"},400);
    const email=typeof claims.email==="string"?claims.email.trim().toLowerCase():"";
    if(claims.email_verified!==true||email.length>254||!/^\S+@\S+\.\S+$/.test(email)||!(email.endsWith("@gmail.com")||(typeof claims.hd==="string"&&claims.hd)))return json({error:"Additional email verification required"},403);
    const existing=await env.DB.prepare("SELECT id FROM accounts WHERE email=?").bind(email).first();
    if(existing)return json({error:"Use your existing sign-in method; automatic linking is not supported"},409);
    const id=random(16), stamp=new Date().toISOString(),name=typeof claims.name==="string"?claims.name.trim().slice(0,100)||"Slashview member":"Slashview member";
    await env.DB.batch([
     env.DB.prepare("INSERT INTO accounts(id,email,name,password_hash,salt,email_verified_at,terms_version,privacy_version,pricing_version,consent_at) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(id,email,name,random(32),random(32),stamp,"review-1","review-1","review-1",stamp),
     env.DB.prepare("INSERT INTO google_identities(subject,account_id) VALUES (?,?)").bind(claims.sub,id)
    ]);
    return json({status:"pending",message:"Registration received; administrator approval required"},202);
   }
   if(account.status!=="approved"||!account.email_verified_at)return json({status:account.status,error:"Account approval required"},403);
   if(entitlement(account)==="expired")return json({error:"Membership expired",membership:"expired"},403);
   return createSession(env,account,input.deviceId);
  }
  if(req.method==="POST" && ["/v1/verification/request","/v1/verification/confirm","/v1/recovery/request","/v1/recovery/confirm"].includes(path)){
   if(await limited(env.DB,"mail-ip:"+ip,15,900))return json({error:"Try again later"},429);
   const input=await readJson(req);if(!input)return json({error:"Invalid request"},400);
   const purpose=path.includes("/verification/")?"verify":"reset";
   const now=Math.floor(Date.now()/1000);
   if(path.endsWith("/request")){
    if(!env.MAILER)return json({error:"Email service unavailable"},503);
    const email=typeof input.email==="string"?input.email.trim().toLowerCase():"";
    if(email.length>254||!/^\S+@\S+\.\S+$/.test(email))return json({error:"Invalid email"},400);
    if(await limited(env.DB,"mail:"+purpose+":"+email,3,3600))return json({error:"Try again later"},429);
    const account=await env.DB.prepare("SELECT id,email,email_verified_at,status FROM accounts WHERE email=?").bind(email).first();
    if(account && (purpose==="verify"?!account.email_verified_at:!!account.email_verified_at) && !["rejected","suspended"].includes(account.status)){
     try{await issueCode(env,account,purpose)}catch{/* generic response prevents disclosure of account existence */}
    }
    return json({message:"If eligible, an email will be sent."},202);
   }
   if(typeof input.code!=="string"||!/^[a-f0-9]{64}$/.test(input.code))return json({error:"Invalid or expired code"},400);
   const hash=await digest(input.code);
   if(purpose==="verify"){
    const result=await env.DB.prepare("UPDATE accounts SET email_verified_at=? WHERE email_verified_at IS NULL AND id=(SELECT account_id FROM account_tokens WHERE token_hash=? AND purpose='verify' AND expires_at>?)").bind(new Date().toISOString(),hash,now).run();
    await env.DB.prepare("DELETE FROM account_tokens WHERE token_hash=? AND purpose='verify'").bind(hash).run();
    return result.meta.changes===1?json({message:"Email verified; approval required"}):json({error:"Invalid or expired code"},400);
   }
   if(typeof input.password!=="string"||input.password.length<12||input.password.length>128)return json({error:"Password must be 12–128 characters"},400);
   const salt=random(32),password=await passwordHash(input.password,salt);
   const results=await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE account_id=(SELECT account_id FROM account_tokens WHERE token_hash=? AND purpose='reset' AND expires_at>?)").bind(hash,now),
    env.DB.prepare("UPDATE accounts SET password_hash=?,salt=? WHERE id=(SELECT account_id FROM account_tokens WHERE token_hash=? AND purpose='reset' AND expires_at>?) AND email_verified_at IS NOT NULL").bind(password,salt,hash,now),
    env.DB.prepare("DELETE FROM account_tokens WHERE token_hash=? AND purpose='reset'").bind(hash)
   ]);
   return results[1].meta.changes===1?json({message:"Password reset; sign in again"}):json({error:"Invalid or expired code"},400);
  }
  // Operator-only approval API. Secret provisioned out of band; never bundled in APK.
  if(path.startsWith("/v1/admin/")){
   if(env.REVIEW_ADMIN_ENABLED!=="true")return json({error:"Admin access unavailable"},503);
   if(!await accessOwner(req,env))return json({error:"Administrator identity required"},401);
   if(!env.ADMIN_TOKEN||env.ADMIN_TOKEN.length<32||!equal(req.headers.get("Authorization")||"","Bearer "+env.ADMIN_TOKEN))return json({error:"Unauthorized"},401);
   if(path.endsWith("/accounts")&&req.method==="GET"){
    const rows=await env.DB.prepare("SELECT id,name,email,status,email_verified_at,approved_at,trial_until,paid_until FROM accounts ORDER BY created_at DESC LIMIT 100").all();
    return json({accounts:rows.results});
   }
   if(path==="/v1/admin/approve"&&req.method==="POST"){
    const input=await readJson(req,1024);
    if(typeof input?.id!=="string"||!/^[a-f0-9]{32}$/.test(input.id))return json({error:"Invalid account"},400);
    const now=new Date(), end=new Date(now);const day=end.getUTCDate();end.setUTCDate(1);end.setUTCMonth(end.getUTCMonth()+3);const last=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()+1,0)).getUTCDate();end.setUTCDate(Math.min(day,last));
    const result=await env.DB.prepare("UPDATE accounts SET status='approved',approved_at=?,trial_until=? WHERE id=? AND status='pending' AND email_verified_at IS NOT NULL").bind(now.toISOString(),end.toISOString(),input.id).run();
    return result.meta.changes===1?json({message:"Approved",trial_until:end.toISOString()}):json({error:"Account not pending or email not verified"},409);
   }
   if(path==="/v1/admin/renew"&&req.method==="POST"){
    const input=await readJson(req,1024);
    if(!input||typeof input.id!=="string"||!/^[a-f0-9]{32}$/.test(input.id)||typeof input.reference!=="string"||!/^[A-Za-z0-9_-]{8,100}$/.test(input.reference))return json({error:"Invalid payment reference or account"},400);
    const account=await env.DB.prepare("SELECT id,paid_until,trial_until FROM accounts WHERE id=? AND status='approved' AND email_verified_at IS NOT NULL").bind(input.id).first();
    if(!account)return json({error:"Account not eligible"},409);
    const now=new Date(), end=new Date(Math.max(now.getTime(),Date.parse(account.paid_until)||0,Date.parse(account.trial_until)||0));
    const day=end.getUTCDate();end.setUTCDate(1);end.setUTCMonth(end.getUTCMonth()+1);end.setUTCDate(Math.min(day,new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()+1,0)).getUTCDate()));
    const expiry=end.toISOString();
    const results=await env.DB.batch([
     env.DB.prepare("INSERT INTO manual_payments(reference,account_id,amount_cents,currency,recorded_at,paid_until) SELECT ?,id,100,'USD',?,? FROM accounts WHERE id=? AND status='approved' AND paid_until IS ? AND trial_until IS ?").bind(input.reference,now.toISOString(),expiry,input.id,account.paid_until,account.trial_until),
     env.DB.prepare("UPDATE accounts SET paid_until=? WHERE id=? AND status='approved' AND EXISTS(SELECT 1 FROM manual_payments WHERE reference=? AND account_id=? AND paid_until=?) AND paid_until IS ? AND trial_until IS ?").bind(expiry,input.id,input.reference,input.id,expiry,account.paid_until,account.trial_until)
    ]);
    return results[1].meta.changes===1?json({message:"Manual payment recorded",paid_until:expiry}):json({error:"Account changed; reload and retry"},409);
   }
   if(path==="/v1/admin/devices/reset"&&req.method==="POST"){
    const input=await readJson(req,1024);if(typeof input?.id!=="string"||!/^[a-f0-9]{32}$/.test(input.id))return json({error:"Invalid account"},400);
    await env.DB.batch([env.DB.prepare("DELETE FROM sessions WHERE account_id=?").bind(input.id),env.DB.prepare("DELETE FROM devices WHERE account_id=?").bind(input.id)]);
    return json({message:"Device authorizations reset"});
   }
   if(path==="/v1/admin/status"&&req.method==="POST"){
    const input=await readJson(req,1024);
    if(!input||typeof input.id!=="string"||!/^[a-f0-9]{32}$/.test(input.id)||!["suspended","rejected"].includes(input.status))return json({error:"Invalid request"},400);
    const results=await env.DB.batch([
     env.DB.prepare("UPDATE accounts SET status=? WHERE id=? AND status IN ('pending','approved')").bind(input.status,input.id),
     env.DB.prepare("DELETE FROM sessions WHERE account_id=?").bind(input.id),
     env.DB.prepare("DELETE FROM account_tokens WHERE account_id=?").bind(input.id)
    ]);
    return results[0].meta.changes===1?json({message:"Account access revoked"}):json({error:"Account not eligible"},409);
   }
   return json({error:"Not found"},404);
  }
  if(req.method==="POST" && ["/v1/register","/v1/login"].includes(path)){
   if(await limited(env.DB,"ip:"+ip,20,900))return json({error:"Try again later"},429);
   if(!req.headers.get("Content-Type")?.startsWith("application/json"))return json({error:"JSON required"},415);
   const raw=await req.text();if(raw.length>4096)return json({error:"Request too large"},413);
   let input;try{input=JSON.parse(raw)}catch{return json({error:"Invalid request"},400)}
   const email=typeof input?.email==="string"?input.email.trim().toLowerCase():"";
   const pass=input?.password;
   if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||typeof pass!=="string"||pass.length<12||pass.length>128)return json({error:"Valid email and password of 12–128 characters required"},400);
   if(await limited(env.DB,"email:"+email,8,900))return json({error:"Try again later"},429);
   if(path==="/v1/register"){
    if(env.REGISTRATION_ENABLED!=="true")return json({error:"Registration not enabled"},503);
    if(!env.MAILER)return json({error:"Email service unavailable"},503);
    if(input.termsAccepted!==true||input.privacyAcknowledged!==true||input.pricingAccepted!==true||input.policyVersion!=="review-1")return json({error:"Current terms, privacy and pricing acceptance required"},400);
    const name=typeof input.name==="string"?input.name.trim():"";
    if(!name||name.length>100)return json({error:"Valid name required"},400);
    const salt=random(32), hash=await passwordHash(pass,salt);
    await env.DB.prepare("INSERT INTO accounts(id,email,name,password_hash,salt,terms_version,privacy_version,pricing_version,consent_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(email) DO NOTHING").bind(random(16),email,name,hash,salt,"review-1","review-1","review-1",new Date().toISOString()).run();
    return json({message:"Registration request received. Account approval and verification are required."},202);
   }
   const account=await env.DB.prepare("SELECT * FROM accounts WHERE email=?").bind(email).first();
   const hash=await passwordHash(pass,account?.salt||"0".repeat(64));
   if(!account||!equal(hash,account.password_hash))return json({error:"Invalid credentials"},401);
   if(account.status!=="approved"||!account.email_verified_at)return json({status:account.status,error:"Account approval and email verification required"},403);
   if(entitlement(account)==="expired")return json({error:"Membership expired",membership:"expired"},403);
   return createSession(env,account,input.deviceId);
  }
  if(["/v1/me","/v1/logout"].includes(path)){
   const auth=req.headers.get("Authorization")||"";
   if(!/^Bearer [a-f0-9]{64}$/.test(auth))return json({error:"Unauthorized"},401);
   const hash=await digest(auth.slice(7));
   if(path==="/v1/logout"&&req.method==="POST"){await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(hash).run();return json({message:"Signed out"});}
   if(path!=="/v1/me"||req.method!=="GET")return json({error:"Not found"},404);
   const account=await env.DB.prepare("SELECT a.id,a.name,a.email,a.status,a.email_verified_at,a.trial_until,a.paid_until FROM accounts a JOIN sessions s ON s.account_id=a.id WHERE s.token_hash=? AND s.expires_at>? AND EXISTS(SELECT 1 FROM devices d WHERE d.account_id=a.id AND d.device_hash=s.device_hash)").bind(hash,Math.floor(Date.now()/1000)).first();
   if(!account||account.status!=="approved"||!account.email_verified_at)return json({error:"Unauthorized"},401);
   const membership=entitlement(account);
   if(membership==="expired")return json({error:"Membership expired",membership},403);
   return json({account,membership});
  }
  return json({error:"Not found"},404);
 }catch{return json({error:"Service unavailable"},503)}
}};

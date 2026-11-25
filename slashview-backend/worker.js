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
export default {async fetch(req,env){
 try {
  const path=new URL(req.url).pathname;
  if(!env.DB)return json({error:"Service unavailable"},503);
  if(req.method==="GET" && (path==="/" || path==="/health")) {
   await env.DB.prepare("SELECT 1").first();
   return json({application:"Slashview",service:"Authentication API",status:"online",database:"connected"});
  }
  if(env.AUTH_ENABLED!=="true")return json({error:"Authentication not enabled"},503);
  const ip=req.headers.get("CF-Connecting-IP")||"unknown";
  // Operator-only approval API. Secret provisioned out of band; never bundled in APK.
  if(path==="/v1/admin/accounts"||path==="/v1/admin/approve"){
   if(!env.ADMIN_TOKEN||env.ADMIN_TOKEN.length<32||!equal(req.headers.get("Authorization")||"","Bearer "+env.ADMIN_TOKEN))return json({error:"Unauthorized"},401);
   if(path.endsWith("/accounts")&&req.method==="GET"){
    const rows=await env.DB.prepare("SELECT id,name,email,status,email_verified_at,approved_at,trial_until,paid_until FROM accounts ORDER BY created_at DESC LIMIT 100").all();
    return json({accounts:rows.results});
   }
   if(path.endsWith("/approve")&&req.method==="POST"){
    const raw=await req.text();if(raw.length>1024)return json({error:"Request too large"},413);
    let input;try{input=JSON.parse(raw)}catch{return json({error:"Invalid request"},400)}
    if(typeof input?.id!=="string"||!/^[a-f0-9]{32}$/.test(input.id))return json({error:"Invalid account"},400);
    const now=new Date(), end=new Date(now);const day=end.getUTCDate();end.setUTCDate(1);end.setUTCMonth(end.getUTCMonth()+3);const last=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()+1,0)).getUTCDate();end.setUTCDate(Math.min(day,last));
    const result=await env.DB.prepare("UPDATE accounts SET status='approved',approved_at=?,trial_until=? WHERE id=? AND status='pending' AND email_verified_at IS NOT NULL").bind(now.toISOString(),end.toISOString(),input.id).run();
    return result.meta.changes===1?json({message:"Approved",trial_until:end.toISOString()}):json({error:"Account not pending or email not verified"},409);
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
   const token=random(32), expires=Math.floor(Date.now()/1000)+86400;
   await env.DB.prepare("INSERT INTO sessions(token_hash,account_id,expires_at) VALUES (?,?,?)").bind(await digest(token),account.id,expires).run();
   return json({token,expires_at:expires});
  }
  if(["/v1/me","/v1/logout"].includes(path)){
   const auth=req.headers.get("Authorization")||"";
   if(!/^Bearer [a-f0-9]{64}$/.test(auth))return json({error:"Unauthorized"},401);
   const hash=await digest(auth.slice(7));
   if(path==="/v1/logout"&&req.method==="POST"){await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(hash).run();return json({message:"Signed out"});}
   if(path!=="/v1/me"||req.method!=="GET")return json({error:"Not found"},404);
   const account=await env.DB.prepare("SELECT a.id,a.name,a.email,a.status,a.email_verified_at,a.trial_until,a.paid_until FROM accounts a JOIN sessions s ON s.account_id=a.id WHERE s.token_hash=? AND s.expires_at>?").bind(hash,Math.floor(Date.now()/1000)).first();
   if(!account||account.status!=="approved"||!account.email_verified_at)return json({error:"Unauthorized"},401);
   const membership=entitlement(account);
   if(membership==="expired")return json({error:"Membership expired",membership},403);
   return json({account,membership});
  }
  return json({error:"Not found"},404);
 }catch{return json({error:"Service unavailable"},503)}
}};

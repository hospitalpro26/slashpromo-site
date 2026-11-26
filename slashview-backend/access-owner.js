// Cloudflare Access assertion verification. Never trust unsigned identity headers.
const bytes=s=>{const b=s.replace(/-/g,"+").replace(/_/g,"/");return Uint8Array.from(atob(b+"=".repeat((4-b.length%4)%4)),c=>c.charCodeAt(0))};
const decode=s=>JSON.parse(new TextDecoder().decode(bytes(s)));
export async function accessOwner(req,env){
 const fail=reason=>{console.log(JSON.stringify({evt:"admin_access_denied",reason}));return false};
 try{
  const team=String(env.ACCESS_TEAM_DOMAIN||"").trim().replace(/\/+$/,""),aud=String(env.ACCESS_AUD||"").trim(),owner=String(env.ACCESS_OWNER_EMAIL||"").trim().toLowerCase();
  if(!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(team))return fail("config_team");
  if(!aud)return fail("config_aud");
  if(!owner)return fail("config_owner");
  const token=req.headers.get("Cf-Access-Jwt-Assertion");
  if(!token)return fail("header_missing");
  if(token.length>12000)return fail("token_too_long");
  const parts=token.split(".");if(parts.length!==3||parts.some(p=>!/^[A-Za-z0-9_-]+$/.test(p)))return fail("token_malformed");
  const [h,p,s]=parts;let header,claims;
  try{header=decode(h);claims=decode(p)}catch{return fail("token_undecodable")}
  const now=Math.floor(Date.now()/1000);
  if(header.alg!=="RS256"||typeof header.kid!=="string")return fail("invalid_header");
  if(claims.iss!==team)return fail("issuer_mismatch");
  if(!Array.isArray(claims.aud)||!claims.aud.includes(aud))return fail("audience_mismatch");
  if(!Number.isInteger(claims.exp)||claims.exp<=now)return fail("expired");
  if(!Number.isInteger(claims.iat)||claims.iat>now+60)return fail("invalid_iat");
  if(claims.nbf!==undefined&&(!Number.isInteger(claims.nbf)||claims.nbf>now+60))return fail("not_before");
  if(typeof claims.email!=="string"||claims.email.toLowerCase()!==owner)return fail("email_mismatch");
  let data;
  try {
   const endpoint=team+"/cdn-cgi/access/certs";
   const r=await fetch(endpoint,{redirect:"error",headers:{"Accept":"application/json"}});
   if(!r.ok)throw new Error("jwks_http");
   data=await r.json();
   if(!Array.isArray(data.keys))throw new Error("jwks_shape");
  }catch{
   // Operator-provisioned public keys, never supplied by the requester.
   // Explicit expiry prevents indefinite trust in a stale key snapshot.
   try{
    const backup=JSON.parse(String(env.ACCESS_JWKS_BACKUP||""));
    if(backup.issuer!==team||!Number.isInteger(backup.expires)||backup.expires<=now||backup.expires>now+86400||!Array.isArray(backup.keys))return fail("jwks_backup_invalid");
    data=backup;
    console.log(JSON.stringify({evt:"admin_access_jwks_backup"}));
   }catch{return fail("jwks_fetch_failed")}
  }
  const jwk=data.keys.find(k=>k.kid===header.kid&&k.kty==="RSA");
  if(!jwk)return fail("kid_not_found");
  let key;try{key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"])}catch{return fail("jwk_import_failed")}
  const valid=await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,bytes(s),new TextEncoder().encode(h+"."+p));
  return valid||fail("signature_invalid");
 }catch{return fail("unexpected_exception")}
}

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
  let r;try{
   const endpoint=team+"/cdn-cgi/access/certs";
   r=await fetch(endpoint,{redirect:"manual",headers:{"Accept":"application/json"}});
   if(r.status>=300&&r.status<400){
    const location=r.headers.get("Location");
    if(!location)return fail("jwks_redirect_missing");
    const target=new URL(location,endpoint);
    if(target.origin!==team||target.pathname!=="/cdn-cgi/access/certs"||target.username||target.password)return fail("jwks_redirect_rejected");
    r=await fetch(target.href,{redirect:"manual",headers:{"Accept":"application/json"}});
   }
  }catch(e){
   const message=String(e?.message||"");
   return fail(/loop/i.test(message)?"jwks_fetch_loop":/redirect/i.test(message)?"jwks_fetch_redirect":/timeout/i.test(message)?"jwks_fetch_timeout":/dns/i.test(message)?"jwks_fetch_dns":"jwks_fetch_failed");
  }
  if(!r.ok)return fail("jwks_http_"+r.status);
  let data;try{data=await r.json()}catch{return fail("jwks_bad_json")}
  const jwk=data.keys?.find(k=>k.kid===header.kid&&k.kty==="RSA");
  if(!jwk)return fail("kid_not_found");
  let key;try{key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"])}catch{return fail("jwk_import_failed")}
  const valid=await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,bytes(s),new TextEncoder().encode(h+"."+p));
  return valid||fail("signature_invalid");
 }catch{return fail("unexpected_exception")}
}

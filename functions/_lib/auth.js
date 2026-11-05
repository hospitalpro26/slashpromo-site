export function respond(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}})}
function decode(str){const s=str.replace(/-/g,"+").replace(/_/g,"/");return Uint8Array.from(atob(s+"=".repeat((4-s.length%4)%4)),c=>c.charCodeAt(0))}
function part(str){return JSON.parse(new TextDecoder().decode(decode(str)))}
export async function authenticate(ctx){
 const e=ctx.env||{};const allowed=String(e.ADMIN_EMAILS||"").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);
 if(!e.ACCESS_TEAM_DOMAIN||!e.ACCESS_AUD||!allowed.length)return {response:respond({error:"Configure ACCESS_TEAM_DOMAIN, ACCESS_AUD and ADMIN_EMAILS in Cloudflare before using admin."},503)};
 let domain;try{domain=new URL(String(e.ACCESS_TEAM_DOMAIN).startsWith("https://")?e.ACCESS_TEAM_DOMAIN:"https://"+e.ACCESS_TEAM_DOMAIN);if(domain.protocol!=="https:"||!domain.hostname.endsWith(".cloudflareaccess.com")||domain.pathname!=="/"||domain.port)throw Error()}catch(_){return {response:respond({error:"Invalid Access configuration."},503)}}
 const token=ctx.request.headers.get("CF-Access-Jwt-Assertion")||((ctx.request.headers.get("Cookie")||"").match(/(?:^|;\s*)CF_Authorization=([^;]+)/)||[])[1];
 if(!token)return {response:respond({error:"Cloudflare Access sign-in required."},401)};
 try{
  const [h,p,s,...extra]=token.split(".");if(!h||!p||!s||extra.length)throw Error();
  const header=part(h),claims=part(p),aud=Array.isArray(claims.aud)?claims.aud:[claims.aud];
  if(header.alg!=="RS256"||!header.kid||claims.iss!==domain.origin||!aud.some(x=>String(e.ACCESS_AUD).split(",").map(v=>v.trim()).includes(x))||!claims.sub||!Number.isFinite(claims.exp)||claims.exp<=Math.floor(Date.now()/1000)||claims.nbf>Math.floor(Date.now()/1000)+30)throw Error();
  const r=await fetch(domain.origin+"/cdn-cgi/access/certs");if(!r.ok)throw Error();
  const keys=await r.json();const jwk=(keys.keys||[]).find(k=>k.kid===header.kid&&k.kty==="RSA");if(!jwk)throw Error();
  const key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
  if(!await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,decode(s),new TextEncoder().encode(h+"."+p)))throw Error();
  const email=String(claims.email||"").trim().toLowerCase();
  if(!allowed.includes(email))return {response:respond({error:"This email is not authorized."},403)};
  return {email};
 }catch(_){return {response:respond({error:"Invalid or expired Access login."},401)}}
}
export function dbMissing(ctx){return ctx.env?.DB?null:respond({error:"D1 database is not connected. Bind slashpromo_ads as DB."},503)}

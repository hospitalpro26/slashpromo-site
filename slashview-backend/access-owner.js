// Cloudflare Access assertion verification. No identity is trusted from plain headers.
const bytes=s=>Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0));
const decode=s=>JSON.parse(new TextDecoder().decode(bytes(s)));
export async function accessOwner(req,env){
 try{
  const team=env.ACCESS_TEAM_DOMAIN,aud=env.ACCESS_AUD,owner=env.ACCESS_OWNER_EMAIL;
  if(!team||!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(team)||!aud||!owner)return false;
  const token=req.headers.get("Cf-Access-Jwt-Assertion")||"";
  if(token.length>12000)return false;
  const parts=token.split(".");if(parts.length!==3||parts.some(p=>!/^[A-Za-z0-9_-]+$/.test(p)))return false;
  const [h,p,s]=parts,header=decode(h),claims=decode(p),now=Math.floor(Date.now()/1000);
  if(header.alg!=="RS256"||typeof header.kid!=="string"||claims.iss!==team||!Array.isArray(claims.aud)||!claims.aud.includes(aud)||!Number.isInteger(claims.exp)||claims.exp<=now||!Number.isInteger(claims.iat)||claims.iat>now+60||claims.iat<now-3600||typeof claims.email!=="string"||claims.email.toLowerCase()!==owner.toLowerCase())return false;
  const r=await fetch(team+"/cdn-cgi/access/certs",{redirect:"error"});if(!r.ok)return false;
  const data=await r.json(),jwk=data.keys?.find(k=>k.kid===header.kid&&k.kty==="RSA");
  if(!jwk)return false;
  const key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
  return await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,bytes(s),new TextEncoder().encode(h+"."+p));
 }catch{return false}
}

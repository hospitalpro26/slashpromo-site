// Review-only Google OpenID Connect verifier; never trusts client profile data.
const bytes=s=>Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0));
const decode=s=>JSON.parse(new TextDecoder().decode(bytes(s)));
let cached=null,expires=0;
async function keys(){
 if(cached&&Date.now()<expires)return cached;
 let r,data;
 for(const endpoint of ["https://www.googleapis.com/oauth2/v3/certs","https://oauth2.googleapis.com/certs"]){
  try{const response=await fetch(endpoint,{redirect:"follow",headers:{"Accept":"application/json"}});if(!response.ok){console.log(JSON.stringify({evt:"google_jwks_http",status:response.status,host:new URL(endpoint).hostname}));continue;}const candidate=await response.json();if(!Array.isArray(candidate.keys)||!candidate.keys.length)continue;r=response;data=candidate;break;}catch(e){console.log(JSON.stringify({evt:"google_jwks_fetch_error",host:new URL(endpoint).hostname,kind:e?.name||"Error"}));}
 }
 if(!data)throw Error("Google keys unavailable");
 const age=Number(r.headers.get("cache-control")?.match(/max-age=(\d+)/)?.[1]||60);
 cached=data.keys;expires=Date.now()+Math.min(age,3600)*1000;return cached;
}
export async function verifyGoogle(token,audience){
 if(typeof token!=="string"||token.length>8192||!audience||!/^[-\w.]+\.apps\.googleusercontent\.com$/.test(audience))throw Error("Invalid configuration or token");
 const parts=token.split(".");if(parts.length!==3||parts.some(p=>! /^[A-Za-z0-9_-]+$/.test(p)))throw Error("Invalid token");
 const [h,p,s]=parts,header=decode(h),claims=decode(p);
 if(header.alg!=="RS256"||typeof header.kid!=="string")throw Error("Invalid algorithm");
 const jwk=(await keys()).find(k=>k.kid===header.kid&&k.kty==="RSA"&&(!k.alg||k.alg==="RS256")&&(!k.use||k.use==="sig"));
 if(!jwk)throw Error("Unknown signing key");
 const key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
 if(!await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,bytes(s),new TextEncoder().encode(h+"."+p)))throw Error("Invalid signature");
 const now=Math.floor(Date.now()/1000);
 if(claims.aud!==audience)throw Error("Google audience mismatch");
 if(claims.azp!==undefined&&claims.azp!==audience&&!(audience==="166627999058-jhqsuk4urhlalnlcrhh98djdoh0lui5l.apps.googleusercontent.com"&&claims.azp==="166627999058-nvtn6rua7dseqp7t7cgmv2n7qj7e1s88.apps.googleusercontent.com"))throw Error("Google authorized party mismatch");
 if(!["accounts.google.com","https://accounts.google.com"].includes(claims.iss)||!Number.isInteger(claims.exp)||claims.exp<=now||!Number.isInteger(claims.iat)||claims.iat>now+60||claims.iat<now-600||typeof claims.sub!=="string"||!claims.sub||claims.sub.length>255||typeof claims.nonce!=="string"||!/^[a-f0-9]{64}$/.test(claims.nonce))throw Error("Invalid claims");
 return claims;
}

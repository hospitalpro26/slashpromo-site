/* Phase 3B: private server-side Google Search Console read-only integration.
 * Requires QA_ADMIN_KEY, QA_DB, GSC_SERVICE_ACCOUNT_JSON and a Search Console
 * permission grant for the service account on sc-domain:slashpromo.com.
 * Query data stays in private Cloudflare D1, not the public GitHub repository.
 * Cache refresh is triggered only on authorised report requests (24h TTL).
 */
import {requireOptionalAccess} from "../_lib/optional-access.js";
import {constantTimeEqual} from "../_lib/qa.js";

const HEADERS={"Content-Type":"application/json; charset=utf-8","Cache-Control":"private, no-store, max-age=0","X-Content-Type-Options":"nosniff","X-Robots-Tag":"noindex,nofollow","Referrer-Policy":"no-referrer"};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:HEADERS});
const PROPERTY="sc-domain:slashpromo.com";
const MAX_ROW=2500;
const TTL=24*60*60*1000;
const encode=(v)=>{const a=typeof v==="string"?new TextEncoder().encode(v):v;let s="";for(const b of a)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")};
function importPem(pem){
  if(typeof pem!=="string"||!pem.includes("BEGIN PRIVATE KEY"))throw Error("Invalid private key");
  const body=pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,"");
  const bytes=atob(body),out=new Uint8Array(bytes.length);
  for(let i=0;i<bytes.length;i++)out[i]=bytes.charCodeAt(i);
  return out.buffer;
}
async function token(credentials){
  const now=Math.floor(Date.now()/1000);
  const head=encode(JSON.stringify({alg:"RS256",typ:"JWT"}));
  const payload=encode(JSON.stringify({iss:credentials.client_email,scope:"https://www.googleapis.com/auth/webmasters.readonly",aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3300}));
  const signer=await crypto.subtle.importKey("pkcs8",importPem(credentials.private_key),{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]);
  const msg=head+"."+payload;
  const signature=encode(new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5",signer,new TextEncoder().encode(msg))));
  const body=new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:msg+"."+signature});
  const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body,signal:AbortSignal.timeout(14000)});
  if(!response.ok)throw Error("Google OAuth token could not be issued");
  const data=await response.json();
  if(typeof data.access_token!=="string")throw Error("Google OAuth token was not returned");
  return data.access_token;
}
function dates(){
  // GSC reporting often lags. Exclude most recent 3 UTC days.
  const end=new Date();end.setUTCHours(0,0,0,0);end.setUTCDate(end.getUTCDate()-3);
  const start=new Date(end);start.setUTCDate(start.getUTCDate()-27);
  return {startDate:start.toISOString().slice(0,10),endDate:end.toISOString().slice(0,10)};
}
async function query(tokenValue,dim,startDate,endDate){
  const url="https://www.googleapis.com/webmasters/v3/sites/"+encodeURIComponent(PROPERTY)+"/searchAnalytics/query";
  const res=await fetch(url,{method:"POST",headers:{"Authorization":"Bearer "+tokenValue,"Content-Type":"application/json"},body:JSON.stringify({startDate,endDate,searchType:"web",dimensions:dim?[dim]:[],rowLimit:dim?MAX_ROW:1,aggregationType:"auto"}),signal:AbortSignal.timeout(17000)});
  if(!res.ok){if(res.status===403||res.status===401)throw Error("Google Search Console access is not authorised for the service account");throw Error("Google Search Console API request failed");}
  const body=await res.json();return Array.isArray(body.rows)?body.rows:[];
}
const cleanNumber=(x)=>Number.isFinite(Number(x))?Number(x):0;
function validPage(raw){
  try{const u=new URL(raw);return u.protocol==="https:"&&["slashpromo.com","www.slashpromo.com"].includes(u.hostname)&&!u.username&&!u.password?u.origin+u.pathname:null}catch{return null}
}
function convert(rows,kind){
 const seen=new Map();
 for(const r of rows){const name=String(r.keys?.[0]||"").slice(0,600);const key=kind==="pages"?validPage(name):name;if(!key)continue;
  const imp=Math.max(0,cleanNumber(r.impressions)),clk=Math.max(0,cleanNumber(r.clicks)),p=Math.max(0,cleanNumber(r.position));
  if(!Number.isFinite(imp)||!Number.isFinite(clk))continue;
  const old=seen.get(key)||{label:key,impressions:0,clicks:0,weightedPosition:0,weight:0};
  old.impressions+=imp;old.clicks+=clk;if(p>0&&imp>0){old.weightedPosition+=p*imp;old.weight+=imp}seen.set(key,old)
 }
 return [...seen.values()].map(v=>({label:v.label,impressions:v.impressions,clicks:v.clicks,ctr:v.impressions?v.clicks/v.impressions:0,position:v.weight?v.weightedPosition/v.weight:0})).sort((a,b)=>b.impressions-a.impressions);
}
function summary(row){
 const r=row||{};return {clicks:cleanNumber(r.clicks),impressions:cleanNumber(r.impressions),ctr:cleanNumber(r.ctr),position:cleanNumber(r.position)}
}
async function getFresh(env){
 let creds;try{creds=JSON.parse(env.GSC_SERVICE_ACCOUNT_JSON)}catch{throw Error("Google service account secret is not valid JSON")}
 if(!creds?.client_email||!creds?.private_key||creds.type!=="service_account")throw Error("Google service account secret is incomplete");
 const auth=await token(creds),range=dates();
 const [total,pages,queries]=await Promise.all([query(auth,null,range.startDate,range.endDate),query(auth,"page",range.startDate,range.endDate),query(auth,"query",range.startDate,range.endDate)]);
 return {source:"Google Search Console API",property:PROPERTY,period:range,fetchedAt:new Date().toISOString(),total:summary(total[0]),pages:convert(pages,"pages"),queries:convert(queries,"queries"),dataLimitNote:"Google Search Console may omit anonymised queries and caps returned rows; query/page totals must not be added together."};
}
export async function onRequestGet(ctx){
 const {request,env}=ctx;
 if(!env.QA_ADMIN_KEY||!constantTimeEqual(request.headers.get("X-QA-Admin-Key")||"",env.QA_ADMIN_KEY))return reply({error:"Unauthorized."},401);
 const denied=await requireOptionalAccess(ctx);if(denied)return denied;
 const url=new URL(request.url);
 if(url.searchParams.size>0)return reply({error:"This endpoint does not accept parameters."},400);
 if(!env.QA_DB)return reply({error:"Existing private QA_DB binding is not configured."},503);
 if(!env.GSC_SERVICE_ACCOUNT_JSON)return reply({configured:false,error:"GSC_SERVICE_ACCOUNT_JSON Cloudflare secret and service account property access are required."},503);
 try{
  await env.QA_DB.prepare("CREATE TABLE IF NOT EXISTS private_gsc_report_cache (cache_key TEXT PRIMARY KEY, updated_at TEXT NOT NULL, report_json TEXT NOT NULL)").run();
  const cached=await env.QA_DB.prepare("SELECT updated_at,report_json FROM private_gsc_report_cache WHERE cache_key=?").bind(PROPERTY).first();
  if(cached?.report_json&&Date.now()-Date.parse(cached.updated_at)<TTL){
    try{const data=JSON.parse(cached.report_json);return reply({...data,cache:"24-hour private D1 cache"})}catch{/* invalid cached data => refetch */}
  }
  const live=await getFresh(env);
  await env.QA_DB.prepare("INSERT INTO private_gsc_report_cache(cache_key,updated_at,report_json) VALUES(?,?,?) ON CONFLICT(cache_key) DO UPDATE SET updated_at=excluded.updated_at,report_json=excluded.report_json").bind(PROPERTY,live.fetchedAt,JSON.stringify(live)).run();
  return reply({...live,cache:"new secure fetch"});
 }catch(e){
  // Never expose raw upstream errors, secrets or Google credentials.
  const message=String(e?.message||"");
  if(message.includes("not authorised"))return reply({error:"Grant the Google service account access to the Search Console domain property."},503);
  if(message.includes("secret"))return reply({error:"Google credential configuration needs review."},503);
  return reply({error:"Private Search Console refresh is unavailable. Existing CSV import remains available."},503)
 }
}
export async function onRequestPost(){return reply({error:"Method not allowed."},405)}

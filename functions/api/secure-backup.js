import {authenticate} from "../_lib/auth.js";
import {constantTimeEqual} from "../_lib/qa.js";
import {DATASETS,DATASET_NAMES,backupResponse} from "../_lib/secure-backup.js";

/* A valid admin key and *verified* Cloudflare Access JWT are BOTH required.
 * Unconfigured Access fails closed (503); forged/missing tokens cannot export. */
async function authorize(ctx){
 const {request,env}=ctx;
 if(!env.QA_ADMIN_KEY||!constantTimeEqual(request.headers.get("X-QA-Admin-Key")||"",env.QA_ADMIN_KEY))
   return {response:backupResponse({error:"Administrator key required."},401)};
 const access=await authenticate(ctx);
 if(access.response){
   return {response:backupResponse({
     error:access.response.status===503?"Cloudflare Access has not been configured for secure backups. Configure ACCESS_TEAM_DOMAIN, ACCESS_AUD and ADMIN_EMAILS.":"A valid Cloudflare Access login is required in addition to the admin key."
   },access.response.status)};
 }
 return {email:access.email};
}
export async function onRequestGet(ctx){
 const auth=await authorize(ctx);
 if(auth.response)return auth.response;
 if(!ctx.env.QA_DB)return backupResponse({error:"The existing QA_DB binding is missing."},503);
 const p=new URL(ctx.request.url).searchParams;
 const mode=p.get("mode")||"verify";
 if(!["verify","export"].includes(mode))return backupResponse({error:"Unsupported backup operation."},400);
 const db=ctx.env.QA_DB;
 try{
   if(mode==="verify"){
     if([...p.keys()].some(k=>k!=="mode"))return backupResponse({error:"Unknown verification parameter."},400);
     const quick=await db.prepare("PRAGMA quick_check").all();
     const status=String(quick.results?.[0]?.quick_check||"unknown");
     const tableRows=await db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name IN ('questions','enquiries','enquiry_replies','site_analytics_daily') ORDER BY name").all();
     const present=new Set((tableRows.results||[]).map(x=>x.name));
     const counts={};for(const table of DATASET_NAMES){
       counts[table]=present.has(table)?Number((await db.prepare("SELECT COUNT(*) AS n FROM "+table).first())?.n||0):null;
     }
     const orphaned=present.has("enquiry_replies")&&present.has("enquiries")
       ?Number((await db.prepare("SELECT COUNT(*) AS n FROM enquiry_replies r LEFT JOIN enquiries e ON r.enquiry_id=e.id WHERE e.id IS NULL").first())?.n||0):null;
     const valid= status.toLowerCase()==="ok"&&DATASET_NAMES.every(name=>present.has(name))&&orphaned===0;
     return backupResponse({
       ready:valid,checkedAt:new Date().toISOString(),integrityCheck:status,
       tables:counts,orphanedReplies:orphaned,
       scope:"Four SlashPromo QA_DB application tables only. Does not verify Cloudflare Time Travel snapshots or the separate advertising DB.",
       caution:"An integrity check and live row counts are not proof that an independent encrypted backup has been created or can be restored."
     });
   }
   if([...p.keys()].some(k=>!["mode","table","offset","limit"].includes(k)))return backupResponse({error:"Unknown export parameter."},400);
   const name=p.get("table")||"";
   if(!Object.hasOwn(DATASETS,name))return backupResponse({error:"Unsupported export dataset."},400);
   const limit=Number(p.get("limit")||"150"),offset=Number(p.get("offset")||"0");
   if(!Number.isSafeInteger(limit)||limit<1||limit>200||!Number.isSafeInteger(offset)||offset<0||offset>1000000)
     return backupResponse({error:"Export limit must be 1–200 and offset 0–1,000,000."},400);
   const cols=DATASETS[name].map(s=>'"'+s+'"').join(",");
   const order=name==="site_analytics_daily"?'day,page_path,city,event':'rowid';
   // All SQL identifiers come exclusively from the static DATASETS allowlist.
   const [total,records]=await db.batch([
     db.prepare("SELECT COUNT(*) AS n FROM "+name),
     db.prepare("SELECT "+cols+" FROM "+name+" ORDER BY "+order+" LIMIT ? OFFSET ?").bind(limit,offset)
   ]);
   const n=Number(total.results?.[0]?.n||0);
   return backupResponse({schema:"slashpromo-d1-logical-v1",table:name,columns:DATASETS[name],
     offset,limit,total:n,rows:records.results||[],hasMore:offset+(records.results||[]).length<n,
     generatedAt:new Date().toISOString()});
 }catch{return backupResponse({error:"Secure backup verification/export failed. Confirm the QA_DB tables are available."},503)}
}
export function onRequestPost(){return backupResponse({error:"Method not allowed. Restore operations are deliberately not exposed through the website."},405)}

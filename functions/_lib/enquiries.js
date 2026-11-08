import {cleanPath,pathCity} from "./analytics.js";
import {sameOrigin,hasPrivateInfo,ipDigest,constantTimeEqual} from "./qa.js";

export const STATUSES=["new","contacted","resolved","closed"];
export {cleanPath,pathCity,sameOrigin,hasPrivateInfo,ipDigest,constantTimeEqual};
export function respond(data,status=200){
  return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store, private","X-Content-Type-Options":"nosniff","X-Robots-Tag":"noindex,nofollow","Referrer-Policy":"no-referrer"}});
}
export function configured(env){
  return Boolean(env.QA_DB&&env.QA_ADMIN_KEY&&env.QA_TURNSTILE_SITE_KEY&&env.QA_TURNSTILE_SECRET);
}
export async function ensureEnquiryDb(env){
  if(!env.QA_DB)throw Error("Missing QA_DB");
  await env.QA_DB.batch([
    env.QA_DB.prepare("CREATE TABLE IF NOT EXISTS enquiries (id TEXT PRIMARY KEY, visitor_name TEXT NOT NULL, visitor_area TEXT NOT NULL, visitor_phone TEXT, enquiry_text TEXT NOT NULL, source_path TEXT NOT NULL, source_title TEXT NOT NULL, source_city TEXT NOT NULL, consent_at TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','contacted','resolved','closed')), admin_note TEXT, closed_at TEXT, whatsapp_sent_confirmed INTEGER NOT NULL DEFAULT 0)"),
    env.QA_DB.prepare("CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status,created_at)"),
    env.QA_DB.prepare("CREATE INDEX IF NOT EXISTS idx_enquiries_city ON enquiries(source_city,created_at)"),
    env.QA_DB.prepare("CREATE TABLE IF NOT EXISTS enquiry_rate (day TEXT NOT NULL, ip_hash TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(day,ip_hash))")
  ]);
}
export async function cleanupEnquiries(env){
  // Closed enquiries are automatically erased after 180 days, not earlier.
  const limit=new Date(Date.now()-180*86400000).toISOString();
  const day=new Date(Date.now()-2*86400000).toISOString().slice(0,10);
  await env.QA_DB.batch([
    env.QA_DB.prepare("DELETE FROM enquiries WHERE status='closed' AND closed_at IS NOT NULL AND closed_at<?").bind(limit),
    env.QA_DB.prepare("DELETE FROM enquiry_rate WHERE day<?").bind(day)
  ]);
}
export function validPhone(phone){
  if(!phone)return true;
  return /^\+?[\d ()-]{10,24}$/.test(phone)&&phone.replace(/\D/g,"").length>=10&&phone.replace(/\D/g,"").length<=15;
}
export async function verifyTurnstile(env,token,request){
  if(!token||token.length>3000)return false;
  const payload=new URLSearchParams({secret:env.QA_TURNSTILE_SECRET,response:token});
  const ip=request.headers.get("CF-Connecting-IP");if(ip)payload.set("remoteip",ip);
  const result=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:payload});
  if(!result.ok)return false;
  const checked=await result.json();
  return checked?.success===true;
}

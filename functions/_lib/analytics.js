/* Privacy-first aggregate events: no IP, user ID, query or message text stored. */
export const EVENTS=new Set(["page_view","slashcure_click","whatsapp_open","whatsapp_continue","qa_submitted"]);
export const CITY_NAMES=new Set(["sukkur","khairpur","shikarpur","ghotki","karachi","hyderabad","lahore","islamabad","rawalpindi","peshawar","quetta","larkana","bahawalpur","faisalabad"]);
const PROVIDERS=new Set(["doctors","hospitals","laboratories","clinics"]);
export function cleanPath(value){
  if(typeof value!=="string"||value.length>180)return null;
  if(value==="/")return "/";
  if(!/^\/(?:[a-z0-9-]+\/){1,5}$/.test(value))return null;
  return value;
}
export function pathCity(path){
  const parts=path.split("/").filter(Boolean);
  if(CITY_NAMES.has(parts[0]))return parts[0];
  if(PROVIDERS.has(parts[0])&&CITY_NAMES.has(parts[1]))return parts[1];
  return "other";
}
export function json(data,status=200){
  return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","X-Robots-Tag":"noindex, nofollow"}});
}
export function sameOrigin(request){
  const origin=request.headers.get("Origin");
  if(origin){try{if(new URL(origin).origin!==new URL(request.url).origin)return false}catch{return false}}
  const sec=request.headers.get("Sec-Fetch-Site");
  return !sec||sec==="same-origin"||sec==="none";
}
export async function ensureAnalytics(db){
  await db.prepare("CREATE TABLE IF NOT EXISTS site_analytics_daily (day TEXT NOT NULL,page_path TEXT NOT NULL,city TEXT NOT NULL,event TEXT NOT NULL,n INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(day,page_path,city,event))").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS site_analytics_by_day ON site_analytics_daily(day,event,city)").run();
}
export async function countEvent(db,event,path){
  if(!EVENTS.has(event)||!cleanPath(path))return false;
  const day=new Date().toISOString().slice(0,10),city=pathCity(path);
  try{
    await db.prepare("INSERT INTO site_analytics_daily(day,page_path,city,event,n) VALUES(?,?,?,?,1) ON CONFLICT(day,page_path,city,event) DO UPDATE SET n=n+1").bind(day,path,city,event).run();
  }catch(error){
    if(!/no such table/i.test(String(error)))throw error;
    await ensureAnalytics(db);
    await db.prepare("INSERT INTO site_analytics_daily(day,page_path,city,event,n) VALUES(?,?,?,?,1) ON CONFLICT(day,page_path,city,event) DO UPDATE SET n=n+1").bind(day,path,city,event).run();
  }
  return true;
}

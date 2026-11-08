// SlashPromo public Q&A: only approved, non-sensitive content is public.
export const CITIES = ["sukkur","khairpur","shikarpur","ghotki","karachi","hyderabad"];
export const CATEGORIES = ["Health questions","OPD timings","Doctor contact","Doctors & hospitals","Appointments","Other"];
// Keep public threads attached to their actual pages. Old rows without page_path
// remain visible only on the city root where they were originally submitted.
export function questionPage(city,path){
  if(!CITIES.includes(city))return null;
  // Legacy city-level questions remain attached only to the city root.
  if(path===undefined||path===null||path==="")return "/"+city+"/";
  if(typeof path!=="string"||path.length>180||!/^\/(?:[a-z0-9-]+\/){1,6}$/.test(path))return null;
  if(path==="/"+city+"/")return path;
  // A scoped question must belong to the city it claims. This stops users
  // posting Karachi questions into Sukkur and blocks arbitrary URL paths.
  if(path.startsWith("/"+city+"/"))return /^\/[a-z0-9-]+\/(?:[a-z0-9-]+\/){1,5}$/.test(path)?path:null;
  if(/^\/(?:doctors|hospitals|clinics|laboratories)\/[a-z0-9-]+\/(?:[a-z0-9-]+\/){1,4}$/.test(path)){
    return path.split("/")[2]===city?path:null;
  }
  return null;
}
export function reply(value,status=200){
  return new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
}
export function enabled(env){
  return Boolean(env.QA_DB && env.QA_ADMIN_KEY && env.QA_TURNSTILE_SITE_KEY && env.QA_TURNSTILE_SECRET);
}
export async function ensureDb(env){
  if(!env.QA_DB) return false;
  await env.QA_DB.batch([
    env.QA_DB.prepare(`CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      city TEXT NOT NULL,
      category TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
      created_at TEXT NOT NULL,
      answered_at TEXT,
      ip_hash TEXT NOT NULL
    )`),
    env.QA_DB.prepare("CREATE INDEX IF NOT EXISTS idx_qa_public ON questions(city,status,answered_at)"),
    env.QA_DB.prepare("CREATE INDEX IF NOT EXISTS idx_qa_limit ON questions(ip_hash,created_at)")
  ]);
  // Existing D1 databases predate the private visitor fields.
  // ALTER TABLE is intentionally additive so previously approved answers survive.
  const columns=await env.QA_DB.prepare("PRAGMA table_info(questions)").all();
  const existing=new Set((columns.results||[]).map(col=>col.name));
  for(const name of ["visitor_name","visitor_city","visitor_whatsapp","visitor_suggestion","draft_answer","updated_at"]){
    if(!existing.has(name)){
      try{await env.QA_DB.prepare("ALTER TABLE questions ADD COLUMN "+name+" TEXT").run();}
      catch(error){
        // Another Pages request may have completed the same migration.
        if(!/duplicate column name/i.test(String(error)))throw error;
      }
    }
  }
  if(!existing.has("contact_consent")){
    try{await env.QA_DB.prepare("ALTER TABLE questions ADD COLUMN contact_consent INTEGER NOT NULL DEFAULT 0").run();}
    catch(error){if(!/duplicate column name/i.test(String(error)))throw error;}
  }
  // Opt-in is explicit and defaults to false for every earlier submission,
  // since those visitors were told their names would stay private.
  if(!existing.has("public_name_consent")){
    try{await env.QA_DB.prepare("ALTER TABLE questions ADD COLUMN public_name_consent INTEGER NOT NULL DEFAULT 0").run();}
    catch(error){if(!/duplicate column name/i.test(String(error)))throw error;}
  }
  // Page-level Sukkur Q&A: a nullable scope preserves old city-root questions.
  if(!existing.has("page_path")){
    try{await env.QA_DB.prepare("ALTER TABLE questions ADD COLUMN page_path TEXT").run();}
    catch(error){if(!/duplicate column name/i.test(String(error)))throw error;}
  }
  await env.QA_DB.prepare("CREATE INDEX IF NOT EXISTS idx_qa_page ON questions(city,page_path,status,answered_at)").run();
  return true;
}
export function sameOrigin(request){
  const origin=request.headers.get("Origin");
  if(!origin) return true;
  try { return new URL(origin).origin === new URL(request.url).origin; }
  catch { return false; }
}
export function hasPrivateInfo(text){
  return /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text)
    || /(?:\+?92|0)\s*3\d{2}[\s.-]*\d{3}[\s.-]*\d{4}/.test(text)
    || /(?:cnic|patient id|medical record number|national id)\s*[:#-]?\s*\d/i.test(text);
}
export function constantTimeEqual(a,b){
  if(!a||!b||a.length!==b.length) return false;
  let v=0; for(let i=0;i<a.length;i++)v|=a.charCodeAt(i)^b.charCodeAt(i);
  return v===0;
}
export async function ipDigest(request,secret){
  const ip=request.headers.get("CF-Connecting-IP")||"unknown";
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const result=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(ip));
  return [...new Uint8Array(result)].map(v=>v.toString(16).padStart(2,"0")).join("");
}

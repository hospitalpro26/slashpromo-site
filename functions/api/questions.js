import {CITIES,CATEGORIES,reply,enabled,ensureDb,sameOrigin,hasPrivateInfo,ipDigest} from "../_lib/qa.js";

export async function onRequestGet({request,env}){
  const city=new URL(request.url).searchParams.get("city")||"";
  if(!CITIES.includes(city)) return reply({error:"Choose a supported city."},400);
  const available=enabled(env);
  if(!env.QA_DB) return reply({questions:[],enabled:false,siteKey:null});
  try{
    await ensureDb(env);
    const result=await env.QA_DB.prepare(
      "SELECT id,category,question,answer,answered_at FROM questions WHERE city=? AND status='approved' AND length(trim(COALESCE(answer,'')))>0 ORDER BY answered_at DESC LIMIT 30"
    ).bind(city).all();
    return reply({questions:result.results||[],enabled:available,siteKey:available?env.QA_TURNSTILE_SITE_KEY:null});
  }catch(_){
    return reply({questions:[],enabled:false,siteKey:null,error:"The Q&A service is temporarily unavailable."},503);
  }
}

export async function onRequestPost({request,env}){
  if(!sameOrigin(request)) return reply({error:"Invalid request origin."},403);
  if(!enabled(env)) return reply({error:"Question submissions are not enabled yet."},503);
  if(!(request.headers.get("Content-Type")||"").includes("application/json")) return reply({error:"Send JSON."},415);
  if(Number(request.headers.get("Content-Length")||0)>5000) return reply({error:"Request too large."},413);
  let data;
  try{const raw=await request.text();if(raw.length>5000)return reply({error:"Request too large."},413);data=JSON.parse(raw);}
  catch{return reply({error:"Invalid question."},400);}
  if(data.website) return reply({ok:true,pending:true});
  const city=String(data.city||"").toLowerCase().trim();
  const category=String(data.category||"").trim();
  const question=String(data.question||"").trim().replace(/\s+/g," ");
  // Personal details are stored separately and never included in public API responses.
  const visitorName=String(data.visitorName||"").trim().replace(/\s+/g," ");
  const visitorCity=String(data.visitorCity||"").trim().replace(/\s+/g," ");
  const visitorWhatsApp=String(data.visitorWhatsApp||"").trim();
  const visitorSuggestion=String(data.visitorSuggestion||"").trim();
  const contactConsent=data.contactConsent===true;
  const phoneDigits=visitorWhatsApp.replace(/\D/g,"");
  if(visitorName.length<2||visitorName.length>100||visitorCity.length<2||visitorCity.length>80)
    return reply({error:"Please provide your name and city."},400);
  if(visitorWhatsApp && (!/^\+?[\d ()-]{10,24}$/.test(visitorWhatsApp)||phoneDigits.length<10||phoneDigits.length>15))
    return reply({error:"Enter a valid WhatsApp number, or leave it empty."},400);
  if(visitorWhatsApp&&!contactConsent)
    return reply({error:"Please consent to WhatsApp contact, or leave the number empty."},400);
  if(visitorSuggestion.length>1200)
    return reply({error:"Please shorten your suggestion to 1200 characters."},400);
  if(!CITIES.includes(city)||!CATEGORIES.includes(category)||question.length<12||question.length>700)
    return reply({error:"Choose a category and enter a question between 12 and 700 characters."},400);
  if(hasPrivateInfo(question)) return reply({error:"Please remove personal phone numbers, email addresses, and identifying medical information."},400);
  const token=String(data.turnstileToken||"");
  if(!token||token.length>3000) return reply({error:"Please complete the security check."},400);
  let verification;
  try{
    const body=new URLSearchParams({secret:env.QA_TURNSTILE_SECRET,response:token});
    const ip=request.headers.get("CF-Connecting-IP");
    if(ip)body.set("remoteip",ip);
    const res=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{
      method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body
    });
    verification=await res.json();
  }catch{return reply({error:"Security verification is unavailable. Please try again."},503);}
  if(!verification?.success) return reply({error:"Security check failed. Please try again."},403);
  try{
    await ensureDb(env);
    const digest=await ipDigest(request,env.QA_ADMIN_KEY);
    const since=new Date(Date.now()-86400000).toISOString();
    const count=await env.QA_DB.prepare("SELECT count(*) AS n FROM questions WHERE ip_hash=? AND created_at>=?").bind(digest,since).first();
    if((count?.n||0)>=4)return reply({error:"Daily question limit reached. Please try again tomorrow."},429);
    await env.QA_DB.prepare(
      "INSERT INTO questions(id,city,category,question,status,created_at,ip_hash,visitor_name,visitor_city,visitor_whatsapp,visitor_suggestion,contact_consent) VALUES(?,?,?,?,'pending',?,?,?,?,?,?,?)"
    ).bind(crypto.randomUUID(),city,category,question,new Date().toISOString(),digest,
      visitorName,visitorCity,visitorWhatsApp||null,visitorSuggestion||null,visitorWhatsApp&&contactConsent?1:0).run();
    return reply({ok:true,pending:true,message:"Your question has been received for review. Only approved questions are published."},201);
  }catch{return reply({error:"We couldn't save your question. Please try again later."},503);}
}

import {respond,configured,ensureEnquiryDb,cleanupEnquiries,cleanPath,pathCity,sameOrigin,hasPrivateInfo,ipDigest,validPhone,verifyTurnstile} from "../_lib/enquiries.js";

export function onRequestGet({env}){
  return respond({enabled:configured(env),siteKey:configured(env)?env.QA_TURNSTILE_SITE_KEY:null,
    message:configured(env)?"Private enquiries can be saved with consent. WhatsApp messages are not confirmed by this service.":"Enquiry storage is not configured."});
}
export async function onRequestPost({request,env}){
  if(!sameOrigin(request))return respond({error:"Invalid request origin."},403);
  if(!configured(env))return respond({error:"Enquiry storage is temporarily unavailable."},503);
  if(!(request.headers.get("Content-Type")||"").toLowerCase().includes("application/json"))return respond({error:"JSON required."},415);
  if(Number(request.headers.get("Content-Length")||0)>5500)return respond({error:"Request too large."},413);
  let data;try{const raw=await request.text();if(raw.length>5500)return respond({error:"Request too large."},413);data=JSON.parse(raw)}
  catch{return respond({error:"Invalid enquiry."},400)}
  // Never record a visitor unless they expressly consented to saving the entry.
  if(data?.consent!==true)return respond({error:"Please agree before saving this enquiry."},400);
  const name=String(data.name||"").trim().replace(/\s+/g," ");
  const area=String(data.area||"").trim().replace(/\s+/g," ");
  const phone=String(data.phone||"").trim();
  const question=String(data.query||"").trim();
  const path=cleanPath(data.sourcePath);
  const title=String(data.sourceTitle||"").trim().replace(/\s+/g," ").slice(0,130);
  if(!path||!title||name.length<2||name.length>100||area.length<2||area.length>120||question.length<5||question.length>700||!validPhone(phone))
    return respond({error:"Check your name, city or area, optional phone, question and source page."},400);
  if(hasPrivateInfo(question))return respond({error:"Remove phone numbers, emails, patient identifiers and private medical records from the question."},400);
  let verified=false;
  try{verified=await verifyTurnstile(env,String(data.turnstileToken||""),request)}
  catch{return respond({error:"Security verification could not be completed."},503)}
  if(!verified)return respond({error:"Please complete the security verification."},403);
  try{
    await ensureEnquiryDb(env);
    await cleanupEnquiries(env);
    const day=new Date().toISOString().slice(0,10);
    const digest=await ipDigest(request,env.QA_ADMIN_KEY);
    const recent=await env.QA_DB.prepare("SELECT n FROM enquiry_rate WHERE day=? AND ip_hash=?").bind(day,digest).first();
    if(Number(recent?.n||0)>=5)return respond({error:"Daily enquiry limit reached. Please try tomorrow."},429);
    const now=new Date().toISOString(),id=crypto.randomUUID();
    await env.QA_DB.prepare("INSERT INTO enquiries(id,visitor_name,visitor_area,visitor_phone,enquiry_text,source_path,source_title,source_city,consent_at,created_at,updated_at,status,whatsapp_sent_confirmed) VALUES(?,?,?,?,?,?,?,?,?,?,?,'new',0)")
      .bind(id,name,area,phone||null,question,path,title,pathCity(path),now,now,now).run();
    await env.QA_DB.prepare("INSERT INTO enquiry_rate(day,ip_hash,n) VALUES(?,?,1) ON CONFLICT(day,ip_hash) DO UPDATE SET n=n+1").bind(day,digest).run();
    return respond({ok:true,saved:true,reference:id.slice(0,8).toUpperCase(),status:"new",
      message:"Your enquiry was saved privately. Opening WhatsApp does not confirm that a message was sent."},201);
  }catch{return respond({error:"Enquiry could not be saved. Please try again later."},503)}
}

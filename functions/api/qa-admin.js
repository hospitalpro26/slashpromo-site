import {reply,ensureDb,constantTimeEqual} from "../_lib/qa.js";
function authorized(request,env){
  return Boolean(env.QA_ADMIN_KEY && constantTimeEqual(request.headers.get("X-QA-Admin-Key")||"",env.QA_ADMIN_KEY));
}
export async function onRequestGet({request,env}){
  if(!authorized(request,env))return reply({error:"Unauthorized."},401);
  if(!env.QA_DB)return reply({error:"Configure QA_DB in Cloudflare first."},503);
  try{
    await ensureDb(env);
    const status=new URL(request.url).searchParams.get("status")==="approved"?"approved":"pending";
    const rows=await env.QA_DB.prepare("SELECT id,city,COALESCE(NULLIF(page_path,''),'/' || city || '/') AS page_path,category,question,answer,status,created_at,visitor_name,visitor_city,visitor_whatsapp,visitor_suggestion,contact_consent,public_name_consent FROM questions WHERE status=? ORDER BY created_at DESC LIMIT 100").bind(status).all();
    return reply({questions:rows.results||[]});
  }catch{return reply({error:"Could not load the moderation queue."},503);}
}
export async function onRequestPost({request,env}){
  if(!authorized(request,env))return reply({error:"Unauthorized."},401);
  if(!env.QA_DB)return reply({error:"Configure QA_DB in Cloudflare first."},503);
  if(!(request.headers.get("Content-Type")||"").includes("application/json"))return reply({error:"JSON required."},415);
  if(Number(request.headers.get("Content-Length")||0)>5000)return reply({error:"Too large."},413);
  let data;
  try{const raw=await request.text();if(raw.length>5000)return reply({error:"Too large."},413);data=JSON.parse(raw);}
  catch{return reply({error:"Invalid JSON."},400);}
  const id=String(data.id||"");
  const status=String(data.status||"");
  const answer=String(data.answer||"").trim();
  if(!/^[a-f0-9-]{36}$/i.test(id)||!["approved","rejected"].includes(status)||answer.length>2000)
    return reply({error:"Invalid moderation action."},400);
  if(status==="approved"&&answer.length<12)return reply({error:"Provide a verified answer before publishing."},400);
  try{
    await ensureDb(env);
    const result=await env.QA_DB.prepare("UPDATE questions SET status=?,answer=?,answered_at=? WHERE id=?")
      .bind(status,status==="approved"?answer:null,status==="approved"?new Date().toISOString():null,id).run();
    if(!result.meta?.changes)return reply({error:"Question not found."},404);
    return reply({ok:true});
  }catch{return reply({error:"Could not update the question."},503);}
}

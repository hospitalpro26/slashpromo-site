import {CITIES,reply,ensureDb,constantTimeEqual} from "../_lib/qa.js";
function authorized(request,env){
  return Boolean(env.QA_ADMIN_KEY && constantTimeEqual(request.headers.get("X-QA-Admin-Key")||"",env.QA_ADMIN_KEY));
}
export async function onRequestGet({request,env}){
  if(!authorized(request,env))return reply({error:"Unauthorized."},401);
  if(!env.QA_DB)return reply({error:"Configure QA_DB in Cloudflare first."},503);
  try{
    await ensureDb(env);
    const params=new URL(request.url).searchParams;
    const status=["pending","approved","rejected"].includes(params.get("status"))
      ?params.get("status"):"pending";
    const city=params.get("city")||"";
    if(city&&!CITIES.includes(city))return reply({error:"Unsupported city filter."},400);
    const before=params.get("before")||"";
    if(before&&!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(before))
      return reply({error:"Invalid pagination cursor."},400);
    let sql="SELECT id,city,COALESCE(NULLIF(page_path,''),'/' || city || '/') AS page_path,category,question,answer,status,created_at,visitor_name,visitor_city,visitor_whatsapp,visitor_suggestion,contact_consent,public_name_consent FROM questions WHERE status=?";
    const binds=[status];
    if(city){sql+=" AND city=?";binds.push(city);}
    if(before){sql+=" AND created_at<?";binds.push(before);}
    sql+=" ORDER BY created_at DESC LIMIT 101";
    const rows=await env.QA_DB.prepare(sql).bind(...binds).all();
    const found=rows.results||[];
    const visible=found.slice(0,100);
    return reply({questions:visible,hasMore:found.length>100,nextBefore:found.length>100?visible[visible.length-1].created_at:null});
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

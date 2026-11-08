import {requireOptionalAccess} from "../_lib/optional-access.js";
import {CITIES,reply,ensureDb,constantTimeEqual} from "../_lib/qa.js";
function authorized(request,env){
  return Boolean(env.QA_ADMIN_KEY && constantTimeEqual(request.headers.get("X-QA-Admin-Key")||"",env.QA_ADMIN_KEY));
}
export async function onRequestGet(ctx){
  const {request,env}=ctx;
  if(!authorized(request,env))return reply({error:"Unauthorized."},401);
  const accessDenied=await requireOptionalAccess(ctx); if(accessDenied)return accessDenied;
  if(!env.QA_DB)return reply({error:"QA_DB is missing. Connect the production Cloudflare D1 binding."},503);
  try{
    await ensureDb(env);
    const params=new URL(request.url).searchParams;
    const status=["all","pending","approved","rejected"].includes(params.get("status"))
      ?params.get("status"):"all";
    const city=params.get("city")||"";
    if(city&&!CITIES.includes(city))return reply({error:"Unsupported city filter."},400);
    const countSql="SELECT status,COUNT(*) AS total FROM questions"+(city?" WHERE city=?":"")+" GROUP BY status";
    const counts=await env.QA_DB.prepare(countSql).bind(...(city?[city]:[])).all();
    const summary={total:0,pending:0,approved:0,rejected:0};
    for(const record of counts.results||[]){
      const n=Number(record.total)||0;
      if(Object.hasOwn(summary,record.status)){summary[record.status]=n;summary.total+=n;}
    }
    if(params.get("summary")==="1")return reply({summary,city:city||"all"});
    const before=params.get("before")||"";
    if(before&&!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(before))
      return reply({error:"Invalid pagination cursor."},400);
    let sql="SELECT id,city,COALESCE(NULLIF(page_path,''),'/' || city || '/') AS page_path,category,question,answer,draft_answer,status,created_at,answered_at,updated_at,visitor_name,visitor_city,visitor_whatsapp,visitor_suggestion,contact_consent,public_name_consent FROM questions WHERE 1=1";
    const binds=[];
    if(status!=="all"){sql+=" AND status=?";binds.push(status);}
    if(city){sql+=" AND city=?";binds.push(city);}
    if(before){sql+=" AND created_at<?";binds.push(before);}
    sql+=" ORDER BY created_at DESC,id DESC LIMIT 101";
    const rows=await env.QA_DB.prepare(sql).bind(...binds).all();
    const found=rows.results||[];
    const visible=found.slice(0,100);
    return reply({questions:visible,summary,hasMore:found.length>100,nextBefore:found.length>100?visible[visible.length-1].created_at:null});
  }catch{
    return reply({error:"Could not load saved questions. Check the production QA_DB binding."},503);
  }
}

export async function onRequestPost(ctx){
  const {request,env}=ctx;
  if(!authorized(request,env))return reply({error:"Unauthorized."},401);
  const accessDenied=await requireOptionalAccess(ctx); if(accessDenied)return accessDenied;
  if(!env.QA_DB)return reply({error:"QA_DB is missing. Connect the production Cloudflare D1 binding."},503);
  if(!(request.headers.get("Content-Type")||"").includes("application/json"))return reply({error:"JSON required."},415);
  if(Number(request.headers.get("Content-Length")||0)>5000)return reply({error:"Too large."},413);
  let data;
  try{const raw=await request.text();if(raw.length>5000)return reply({error:"Too large."},413);data=JSON.parse(raw);}
  catch{return reply({error:"Invalid JSON."},400);}
  const id=String(data.id||"");
  const status=String(data.status||"");
  const answer=String(data.answer||"").trim();
  if(!/^[a-f0-9-]{36}$/i.test(id)||!["approved","rejected","draft"].includes(status)||answer.length>2000)
    return reply({error:"Invalid moderation action."},400);
  if(status==="approved"&&answer.length<12)return reply({error:"Provide a verified public answer before publishing."},400);
  const now=new Date().toISOString();
  try{
    await ensureDb(env);
    let result;
    if(status==="draft"){
      result=await env.QA_DB.prepare("UPDATE questions SET draft_answer=?,updated_at=? WHERE id=?").bind(answer||null,now,id).run();
    }else if(status==="approved"){
      result=await env.QA_DB.prepare("UPDATE questions SET status='approved',answer=?,draft_answer=NULL,answered_at=?,updated_at=? WHERE id=?").bind(answer,now,now,id).run();
    }else{
      // Retain previously saved answer and draft when rejected, for audit/history.
      // Rejected entries are not served by the public Q&A endpoint.
      result=await env.QA_DB.prepare("UPDATE questions SET status='rejected',updated_at=? WHERE id=?").bind(now,id).run();
    }
    if(!result.meta?.changes)return reply({error:"Question not found."},404);
    return reply({ok:true,saved:true,status,updatedAt:now});
  }catch{return reply({error:"Could not save the question. Verify D1 is available."},503);}
}

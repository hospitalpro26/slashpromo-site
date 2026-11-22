import {ensureAdminArchiveDb,changeAdminArchive} from "../_lib/admin-archive.js";
import {requireOptionalAccess} from "../_lib/optional-access.js";
import {CITIES,reply,ensureDb,constantTimeEqual,sameOrigin} from "../_lib/qa.js";
function authorized(request,env){
  return Boolean(env.QA_ADMIN_KEY && constantTimeEqual(request.headers.get("X-QA-Admin-Key")||"",env.QA_ADMIN_KEY));
}
export async function onRequestGet(ctx){
  const {request,env}=ctx;
  if(!authorized(request,env))return reply({error:"Unauthorized."},401);
  const accessDenied=await requireOptionalAccess(ctx); if(accessDenied)return accessDenied;
  if(!env.QA_DB)return reply({error:"QA_DB is missing. Connect the production Cloudflare D1 binding."},503);
  try{
    await ensureDb(env);await ensureAdminArchiveDb(env);
    const params=new URL(request.url).searchParams;
    const status=["all","pending","approved","rejected"].includes(params.get("status"))
      ?params.get("status"):"all";
    const city=params.get("city")||"";
    const archived=params.get("archived")==="1";
    const archiveClause=" "+(archived?"EXISTS":"NOT EXISTS")+" (SELECT 1 FROM admin_archived_records ar WHERE ar.kind='question' AND ar.record_id=questions.id)";
    if(city&&!CITIES.includes(city))return reply({error:"Unsupported city filter."},400);
    const countSql="SELECT status,COUNT(*) AS total FROM questions WHERE"+archiveClause+(city?" AND city=?":"")+" GROUP BY status";
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
    let sql="SELECT id,city,COALESCE(NULLIF(page_path,''),'/' || city || '/') AS page_path,category,question,answer,draft_answer,status,created_at,answered_at,updated_at,visitor_name,visitor_city,visitor_whatsapp,visitor_suggestion,contact_consent,public_name_consent FROM questions WHERE"+archiveClause;
    const binds=[];
    if(status!=="all"){sql+=" AND status=?";binds.push(status);}
    if(city){sql+=" AND city=?";binds.push(city);}
    if(before){sql+=" AND created_at<?";binds.push(before);}
    sql+=" ORDER BY created_at DESC,id DESC LIMIT 101";
    const rows=await env.QA_DB.prepare(sql).bind(...binds).all();
    const found=rows.results||[];
    const visible=found.slice(0,100);
    return reply({questions:visible,summary,archived,hasMore:found.length>100,nextBefore:found.length>100?visible[visible.length-1].created_at:null});
  }catch{
    return reply({error:"Could not load saved questions. Check the production QA_DB binding."},503);
  }
}

export async function onRequestPost(ctx){
  const {request,env}=ctx;
  if(!authorized(request,env))return reply({error:"Unauthorized."},401);
  const accessDenied=await requireOptionalAccess(ctx); if(accessDenied)return accessDenied;
  if(!env.QA_DB)return reply({error:"QA_DB is missing. Connect the production Cloudflare D1 binding."},503);
  if(!sameOrigin(request))return reply({error:"Invalid request origin."},403);
  if(!(request.headers.get("Content-Type")||"").includes("application/json"))return reply({error:"JSON required."},415);
  if(Number(request.headers.get("Content-Length")||0)>5000)return reply({error:"Too large."},413);
  let data;
  try{const raw=await request.text();if(raw.length>5000)return reply({error:"Too large."},413);data=JSON.parse(raw);}
  catch{return reply({error:"Invalid JSON."},400);}
  const id=String(data.id||"");
  if(data.action==="archive"||data.action==="restore"){
    if(!/^[a-f0-9-]{36}$/i.test(id))return reply({error:"Invalid question ID."},400);
    try{
      await ensureDb(env);await ensureAdminArchiveDb(env);
      const existing=await env.QA_DB.prepare("SELECT status FROM questions WHERE id=?").bind(id).first();
      if(!existing)return reply({error:"Question not found."},404);
      if(data.action==="archive"&&existing.status==="approved")
        return reply({error:"Unpublish this question by rejecting it before archiving."},409);
      await changeAdminArchive(env,"question",id,data.action==="archive");
      return reply({ok:true,archived:data.action==="archive"});
    }catch{return reply({error:"Could not update question archive."},503);}
  }
  if(data.action==="delete_permanently"){
    if(!/^[a-f0-9-]{36}$/i.test(id)||data.confirm!=="DELETE")return reply({error:"Explicit DELETE confirmation required."},400);
    try{
      await ensureDb(env);await ensureAdminArchiveDb(env);
      const archived=await env.QA_DB.prepare("SELECT record_id FROM admin_archived_records WHERE kind='question' AND record_id=?").bind(id).first();
      if(!archived)return reply({error:"Archive the question before permanent deletion."},409);
      const existing=await env.QA_DB.prepare("SELECT status FROM questions WHERE id=?").bind(id).first();
      if(!existing)return reply({error:"Question not found."},404);
      if(existing.status==="approved")return reply({error:"Reject the published question before permanently deleting it."},409);
      await env.QA_DB.batch([
        env.QA_DB.prepare("DELETE FROM questions WHERE id=?").bind(id),
        env.QA_DB.prepare("DELETE FROM admin_archived_records WHERE kind='question' AND record_id=?").bind(id)
      ]);
      return reply({ok:true,deleted:true});
    }catch{return reply({error:"Could not permanently delete the question."},503);}
  }
  const status=String(data.status||"");
  const answer=String(data.answer||"").trim();
  if(!/^[a-f0-9-]{36}$/i.test(id)||!["approved","rejected","draft"].includes(status)||answer.length>2000)
    return reply({error:"Invalid moderation action."},400);
  
  const now=new Date().toISOString();
  try{
    await ensureDb(env);
    const record=await env.QA_DB.prepare("SELECT page_path,question,visitor_whatsapp FROM questions WHERE id=?").bind(id).first();
    if(!record)return reply({error:"Question not found."},404);
    if(status==="approved"&&record.page_path!=="/"&&answer.length<12)return reply({error:"Provide a verified public answer before publishing."},400);
    // Do not publish a submitted question if private identifiers were missed at intake.
    // Visitor WhatsApp is private even if the visitor opted into contact.
    if(status==="approved"){
      const submitted=String(record.question||"");
      if(/(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|(?:\+?92|0)\s*3\d{2}[\s.-]*\d{3}[\s.-]*\d{4}|(?:cnic|patient id|medical record number|national id)\s*[:#-]?\s*\d)/i.test(submitted))
        return reply({error:"This question appears to include private contact or identifying information. Do not publish; keep it in review or reject it."},400);
      const phone=String(record.visitor_whatsapp||"").replace(/\D/g,"");
      const publicAnswerDigits=answer.replace(/\D/g,"");
      if(phone.length>=10&&publicAnswerDigits.includes(phone.slice(-10)))
        return reply({error:"The public answer cannot include the visitor's private WhatsApp number."},400);
      if(/(?:cnic|patient id|medical record number|national id)\s*[:#-]?\s*\d/i.test(answer))
        return reply({error:"Remove patient or national identifiers from the public answer."},400);
    }
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

import {ensureAdminArchiveDb,changeAdminArchive} from "../_lib/admin-archive.js";
import {requireOptionalAccess} from "../_lib/optional-access.js";
import {respond,ensureEnquiryDb,cleanupEnquiries,STATUSES,constantTimeEqual,sameOrigin} from "../_lib/enquiries.js";
function authorized(request,env){
  return Boolean(env.QA_ADMIN_KEY && constantTimeEqual(request.headers.get("X-QA-Admin-Key")||"",env.QA_ADMIN_KEY));
}
export async function onRequestGet(ctx){
  const {request,env}=ctx;
  if(!authorized(request,env))return respond({error:"Unauthorized."},401);
  const accessDenied=await requireOptionalAccess(ctx); if(accessDenied)return accessDenied;
  if(!env.QA_DB)return respond({error:"Production QA_DB is not connected."},503);
  const params=new URL(request.url).searchParams;
  const status=params.get("status")||"all",city=params.get("city")||"";
  const archived=params.get("archived")==="1";
  if(status!=="all"&&!STATUSES.includes(status))return respond({error:"Invalid status."},400);
  if(!/^(?:|[a-z-]{2,30})$/.test(city))return respond({error:"Invalid city."},400);
  const offset=Number(params.get("offset")||0);
  if(!Number.isInteger(offset)||offset<0||offset>5000)return respond({error:"Invalid offset."},400);
  try{
    await ensureEnquiryDb(env);await ensureAdminArchiveDb(env);await cleanupEnquiries(env);
    let query=" FROM enquiries WHERE "+(archived?"EXISTS":"NOT EXISTS")+" (SELECT 1 FROM admin_archived_records ar WHERE ar.kind=\'enquiry\' AND ar.record_id=enquiries.id)",bind=[];
    if(status!=="all"){query+=" AND status=?";bind.push(status)}
    if(city){query+=" AND source_city=?";bind.push(city)}
    const [totals,count,entries]=await env.QA_DB.batch([
      env.QA_DB.prepare("SELECT status,COUNT(*) AS total FROM enquiries WHERE "+(archived?"EXISTS":"NOT EXISTS")+" (SELECT 1 FROM admin_archived_records ar WHERE ar.kind=\'enquiry\' AND ar.record_id=enquiries.id) GROUP BY status"),
      env.QA_DB.prepare("SELECT COUNT(*) AS n"+query).bind(...bind),
      env.QA_DB.prepare("SELECT id,visitor_name,visitor_area,visitor_phone,enquiry_text,source_path,source_title,source_city,status,admin_note,consent_at,created_at,updated_at,closed_at,whatsapp_sent_confirmed"+query+" ORDER BY created_at DESC,id DESC LIMIT 51 OFFSET ?").bind(...bind,offset)
    ]);
    const summary={total:0,new:0,contacted:0,resolved:0,closed:0};
    for(const row of totals.results||[]){if(Object.hasOwn(summary,row.status)){const n=Number(row.total)||0;summary[row.status]=n;summary.total+=n}}
    const rows=entries.results||[];
    return respond({enquiries:rows.slice(0,50),summary,filteredTotal:Number(count.results?.[0]?.n||0),
      hasMore:rows.length>50,nextOffset:rows.length>50?offset+50:null,
      archived,note:"A saved enquiry is not proof that a WhatsApp message was sent; whatsapp_sent_confirmed remains false unless independently verified."});
  }catch{return respond({error:"Could not load enquiries from the database."},503)}
}
export async function onRequestPost(ctx){
  const {request,env}=ctx;
  if(!authorized(request,env))return respond({error:"Unauthorized."},401);
  const accessDenied=await requireOptionalAccess(ctx); if(accessDenied)return accessDenied;
  if(!sameOrigin(request))return respond({error:"Invalid request origin."},403);
  if(!env.QA_DB)return respond({error:"Production QA_DB is not connected."},503);
  if(!(request.headers.get("Content-Type")||"").includes("application/json"))return respond({error:"JSON required."},415);
  if(Number(request.headers.get("Content-Length")||0)>2500)return respond({error:"Too large."},413);
  let data;try{const raw=await request.text();if(raw.length>2500)return respond({error:"Too large."},413);data=JSON.parse(raw)}
  catch{return respond({error:"Invalid JSON."},400)}
  const id=String(data.id||""),status=String(data.status||""),note=String(data.note||"").trim();
  if(data.action==="archive"||data.action==="restore"){
    if(!/^[a-f0-9-]{36}$/i.test(id))return respond({error:"Invalid enquiry ID."},400);
    try{
      await ensureEnquiryDb(env);await ensureAdminArchiveDb(env);
      const existing=await env.QA_DB.prepare("SELECT id FROM enquiries WHERE id=?").bind(id).first();
      if(!existing)return respond({error:"Enquiry not found."},404);
      await changeAdminArchive(env,"enquiry",id,data.action==="archive");
      return respond({ok:true,archived:data.action==="archive"});
    }catch{return respond({error:"Could not update archive status."},503);}
  }
  if(data.action==="delete_permanently"){
    if(!/^[a-f0-9-]{36}$/i.test(id)||data.confirm!=="DELETE")return respond({error:"Explicit DELETE confirmation required."},400);
    try{
      await ensureEnquiryDb(env);await ensureAdminArchiveDb(env);
      const archived=await env.QA_DB.prepare("SELECT record_id FROM admin_archived_records WHERE kind='enquiry' AND record_id=?").bind(id).first();
      if(!archived)return respond({error:"Archive the enquiry before permanent deletion."},409);
      const existing=await env.QA_DB.prepare("SELECT id FROM enquiries WHERE id=?").bind(id).first();
      if(!existing)return respond({error:"Enquiry not found."},404);
      await env.QA_DB.batch([
        env.QA_DB.prepare("DELETE FROM enquiry_replies WHERE enquiry_id=?").bind(id),
        env.QA_DB.prepare("DELETE FROM enquiries WHERE id=?").bind(id),
        env.QA_DB.prepare("DELETE FROM admin_archived_records WHERE kind='enquiry' AND record_id=?").bind(id)
      ]);
      return respond({ok:true,deleted:true});
    }catch{return respond({error:"Could not permanently delete the enquiry."},503);}
  }
  if(!/^[a-f0-9-]{36}$/i.test(id)||!STATUSES.includes(status)||note.length>1000)
    return respond({error:"Invalid enquiry status or notes."},400);
  try{
    await ensureEnquiryDb(env);await ensureAdminArchiveDb(env);
    const now=new Date().toISOString();
    const result=await env.QA_DB.prepare("UPDATE enquiries SET status=?,admin_note=?,updated_at=?,closed_at=CASE WHEN ?='closed' THEN COALESCE(closed_at,?) ELSE NULL END WHERE id=?")
      .bind(status,note||null,now,status,now,id).run();
    if(!result.meta?.changes)return respond({error:"Enquiry not found."},404);
    return respond({ok:true,saved:true,status,updatedAt:now});
  }catch{return respond({error:"Could not update the enquiry."},503)}
}

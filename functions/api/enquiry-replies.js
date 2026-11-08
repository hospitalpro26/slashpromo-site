import {requireOptionalAccess} from "../_lib/optional-access.js";
/* Private WhatsApp replies. Never expose this route without QA_ADMIN_KEY. */
import {respond,ensureEnquiryDb,cleanupEnquiries,constantTimeEqual,sameOrigin,whatsappDigits} from "../_lib/enquiries.js";

const uuid=/^[a-f0-9-]{36}$/i;
function whatsappLink(enquiry,enquiryId,text){
  const digits=whatsappDigits(enquiry.visitor_phone);
  if(!digits)return null;
  const message=[
    "Hello "+enquiry.visitor_name+",",
    "Thank you for contacting the SlashPromo team.",
    "Regarding enquiry #"+enquiryId.slice(0,8).toUpperCase()+":",
    "",
    text,
    "",
    "SlashPromo.com | Health Care, Connected."
  ].join("\n");
  return "https://wa.me/"+digits+"?text="+encodeURIComponent(message);
}
function authorized(request,env){
  return Boolean(env.QA_ADMIN_KEY&&constantTimeEqual(request.headers.get("X-QA-Admin-Key")||"",env.QA_ADMIN_KEY));
}
export async function onRequestGet(ctx){
  const {request,env}=ctx;
  if(!authorized(request,env))return respond({error:"Unauthorized."},401);
  const accessDenied=await requireOptionalAccess(ctx); if(accessDenied)return accessDenied;
  if(!env.QA_DB)return respond({error:"Production QA_DB is not connected."},503);
  const enquiryId=new URL(request.url).searchParams.get("enquiryId")||"";
  if(!uuid.test(enquiryId))return respond({error:"Invalid enquiry reference."},400);
  try{
    await ensureEnquiryDb(env);
    await cleanupEnquiries(env);
    const enquiry=await env.QA_DB.prepare("SELECT id,visitor_name,visitor_phone,status FROM enquiries WHERE id=?").bind(enquiryId).first();
    if(!enquiry)return respond({error:"Enquiry not found."},404);
    const rows=await env.QA_DB.prepare("SELECT id,enquiry_id,reply_text,status,created_at,updated_at,sent_confirmed_at FROM enquiry_replies WHERE enquiry_id=? ORDER BY created_at DESC,id DESC LIMIT 100").bind(enquiryId).all();
    return respond({replies:(rows.results||[]).map(row=>({...row,whatsappUrl:row.status==='prepared'?whatsappLink(enquiry,enquiryId,row.reply_text):null})),canReplyByWhatsApp:Boolean(whatsappDigits(enquiry.visitor_phone)),
      note:"Prepared replies are not sent. Sent confirmation is a manual staff record, not a WhatsApp delivery receipt."});
  }catch{return respond({error:"Could not load private reply history."},503)}
}
export async function onRequestPost(ctx){
  const {request,env}=ctx;
  if(!authorized(request,env))return respond({error:"Unauthorized."},401);
  const accessDenied=await requireOptionalAccess(ctx); if(accessDenied)return accessDenied;
  if(!sameOrigin(request))return respond({error:"Invalid request origin."},403);
  if(!env.QA_DB)return respond({error:"Production QA_DB is not connected."},503);
  if(!(request.headers.get("Content-Type")||"").toLowerCase().includes("application/json"))return respond({error:"JSON required."},415);
  if(Number(request.headers.get("Content-Length")||0)>3500)return respond({error:"Too large."},413);
  let body;
  try{const raw=await request.text();if(raw.length>3500)return respond({error:"Too large."},413);body=JSON.parse(raw)}
  catch{return respond({error:"Invalid JSON."},400)}
  const action=String(body?.action||"");
  const enquiryId=String(body?.enquiryId||"");
  if(!uuid.test(enquiryId)||!["save_draft","prepare","confirm_sent"].includes(action))return respond({error:"Invalid reply action."},400);
  const now=new Date().toISOString();
  try{
    await ensureEnquiryDb(env);
    const enquiry=await env.QA_DB.prepare("SELECT id,visitor_name,visitor_phone,status FROM enquiries WHERE id=?").bind(enquiryId).first();
    if(!enquiry)return respond({error:"Enquiry not found."},404);
    if(action==="confirm_sent"){
      const replyId=String(body?.replyId||"");
      if(!uuid.test(replyId))return respond({error:"Choose a saved prepared reply."},400);
      const matching=await env.QA_DB.prepare("SELECT id FROM enquiry_replies WHERE id=? AND enquiry_id=? AND status='prepared'").bind(replyId,enquiryId).first();
      if(!matching)return respond({error:"Reply was not found or has already been marked as sent."},409);
      const updates=await env.QA_DB.batch([
        env.QA_DB.prepare("UPDATE enquiry_replies SET status='sent_confirmed',updated_at=?,sent_confirmed_at=? WHERE id=? AND enquiry_id=? AND status='prepared'").bind(now,now,replyId,enquiryId),
        env.QA_DB.prepare("UPDATE enquiries SET status=CASE WHEN status='new' THEN 'contacted' ELSE status END,updated_at=? WHERE id=?").bind(now,enquiryId)
      ]);
      if(!updates[0]?.meta?.changes)return respond({error:"Reply has already been updated. Refresh history."},409);
      return respond({ok:true,saved:true,replyId,status:"sent_confirmed",enquiryStatus:enquiry.status==="new"?"contacted":enquiry.status,
        note:"Marked sent by a staff member. WhatsApp delivery remains unverified."});
    }
    if(enquiry.status==="closed")return respond({error:"Reopen this enquiry before drafting another reply."},409);
    const text=String(body?.text||"").trim().replace(/\r\n/g,"\n");
    if(text.length<2||text.length>1200)return respond({error:"Enter a reply of 2–1200 characters."},400);
    const digits=whatsappDigits(enquiry.visitor_phone);
    if(action==="prepare"&&!digits)return respond({error:"Visitor did not provide a usable WhatsApp number. You can still save a private draft."},409);
    const replyId=crypto.randomUUID(),status=action==="save_draft"?"draft":"prepared";
    await env.QA_DB.prepare("INSERT INTO enquiry_replies(id,enquiry_id,reply_text,status,created_at,updated_at) VALUES(?,?,?,?,?,?)")
      .bind(replyId,enquiryId,text,status,now,now).run();
    const whatsappUrl=action==="prepare"?whatsappLink(enquiry,enquiryId,text):null;
    return respond({ok:true,saved:true,reply:{id:replyId,enquiry_id:enquiryId,reply_text:text,status,created_at:now,updated_at:now,sent_confirmed_at:null},
      whatsappUrl,note:action==="prepare"?"Reply prepared only. Click Open WhatsApp, send the message there, then manually mark sent.":"Private draft saved. It has not been sent."},201);
  }catch{return respond({error:"Could not save this private reply."},503)}
}

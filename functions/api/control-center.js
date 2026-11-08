/* Private consolidated operational overview: no personal enquiry fields exposed here.
   All data comes from existing D1 tables and is accessible only with QA_ADMIN_KEY. */
import {respond,constantTimeEqual,ensureEnquiryDb,cleanupEnquiries} from "../_lib/enquiries.js";
import {ensureDb} from "../_lib/qa.js";
import {ensureAnalytics} from "../_lib/analytics.js";

export async function onRequestGet({request,env}){
  if(!env.QA_ADMIN_KEY||!constantTimeEqual(request.headers.get("X-QA-Admin-Key")||"",env.QA_ADMIN_KEY))
    return respond({error:"Unauthorized."},401);
  if(!env.QA_DB)return respond({error:"Connect the existing production QA_DB database."},503);
  const url=new URL(request.url);
  if(url.searchParams.size>0)return respond({error:"This report does not accept parameters."},400);
  const now=new Date(),overdueAt=new Date(now.getTime()-24*60*60*1000).toISOString();
  const sevenDays=new Date(now.getTime()-6*86400000).toISOString().slice(0,10);
  try{
    await ensureDb(env);
    await ensureEnquiryDb(env);
    await ensureAnalytics(env.QA_DB);
    await cleanupEnquiries(env);
    const db=env.QA_DB;
    const requests=[
      db.prepare("SELECT status,COUNT(*) AS n, SUM(CASE WHEN status='pending' AND created_at<? THEN 1 ELSE 0 END) AS overdue FROM questions GROUP BY status").bind(overdueAt),
      db.prepare("SELECT status,COUNT(*) AS n,SUM(CASE WHEN status='new' AND created_at<? THEN 1 ELSE 0 END) AS overdue FROM enquiries GROUP BY status").bind(overdueAt),
      db.prepare("SELECT event,SUM(n) AS n FROM site_analytics_daily WHERE day>=? GROUP BY event").bind(sevenDays),
      db.prepare("SELECT city,SUM(n) AS views FROM site_analytics_daily WHERE day>=? AND event='page_view' GROUP BY city ORDER BY views DESC LIMIT 8").bind(sevenDays),
      db.prepare("SELECT id,city,category,COALESCE(NULLIF(page_path,''),'/'||city||'/') AS page_path,created_at FROM questions WHERE status='pending' ORDER BY created_at ASC,id ASC LIMIT 12"),
      db.prepare("SELECT id,source_city,source_path,source_title,created_at,status,CASE WHEN visitor_phone IS NOT NULL AND trim(visitor_phone)!='' THEN 1 ELSE 0 END AS has_phone FROM enquiries WHERE status IN ('new','contacted') ORDER BY CASE WHEN status='new' THEN 0 ELSE 1 END,created_at ASC,id ASC LIMIT 12"),
      db.prepare("SELECT status,COUNT(*) AS n FROM enquiry_replies GROUP BY status")
    ];
    const [qCounts,eCounts,traffic,cities,questions,enquiries,replies]=await db.batch(requests);
    const q={total:0,pending:0,approved:0,rejected:0,overdue:0};
    const e={total:0,new:0,contacted:0,resolved:0,closed:0,overdue:0};
    const trafficTotals={page_view:0,slashcure_click:0,whatsapp_open:0,whatsapp_continue:0,qa_submitted:0};
    const replyTotals={draft:0,prepared:0,sent_confirmed:0};
    for(const row of qCounts.results||[]){
      const n=Number(row.n)||0;if(Object.hasOwn(q,row.status)){q[row.status]=n;q.total+=n}
      if(row.status==="pending")q.overdue=Number(row.overdue)||0;
    }
    for(const row of eCounts.results||[]){
      const n=Number(row.n)||0;if(Object.hasOwn(e,row.status)){e[row.status]=n;e.total+=n}
      if(row.status==="new")e.overdue=Number(row.overdue)||0;
    }
    for(const row of traffic.results||[])if(Object.hasOwn(trafficTotals,row.event))trafficTotals[row.event]=Number(row.n)||0;
    for(const row of replies.results||[])if(Object.hasOwn(replyTotals,row.status))replyTotals[row.status]=Number(row.n)||0;
    return respond({
      generatedAt:now.toISOString(),overdueHours:24,trafficWindowDays:7,
      summary:{questions:q,enquiries:e,traffic:trafficTotals,replies:replyTotals},
      cities:(cities.results||[]).map(row=>({city:row.city,views:Number(row.views)||0})),
      tasks:{
        pendingQuestions:questions.results||[],
        openEnquiries:enquiries.results||[]
      },
      notice:"In-dashboard notifications reflect database queues only. Replies prepared for WhatsApp are NOT confirmed sent; staff sent confirmation is not a delivery or read receipt."
    });
  }catch{return respond({error:"The private Control Center could not read its connected D1 data."},503)}
}
export function onRequestPost(){return respond({error:"Method not allowed."},405)}

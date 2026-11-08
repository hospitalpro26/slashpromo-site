import {constantTimeEqual} from "../_lib/qa.js";
import {json,ensureAnalytics,CITY_NAMES} from "../_lib/analytics.js";
/* The same private QA_ADMIN_KEY protects analytics. Never expose private Q&A fields. */
export async function onRequestGet({request,env}){
  const provided=request.headers.get("X-QA-Admin-Key")||"";
  if(!env.QA_ADMIN_KEY||!constantTimeEqual(provided,env.QA_ADMIN_KEY))return json({error:"Unauthorized."},401);
  if(!env.QA_DB)return json({error:"Configure the existing QA_DB Cloudflare binding first."},503);
  const params=new URL(request.url).searchParams;
  const days=Number(params.get("days")||7);
  if(![7,30,90].includes(days))return json({error:"Choose 7, 30 or 90 days."},400);
  const city=(params.get("city")||"").trim().toLowerCase();
  if(city&&city!=="other"&&!CITY_NAMES.has(city))return json({error:"Invalid city filter."},400);
  const d=new Date();d.setUTCDate(d.getUTCDate()-days+1);
  const since=d.toISOString().slice(0,10);
  const where="WHERE day>=?"+(city?" AND city=?":"");
  const binds=city?[since,city]:[since];
  try{
    await ensureAnalytics(env.QA_DB);
    const statements=[
      env.QA_DB.prepare("SELECT event,SUM(n) AS total FROM site_analytics_daily "+where+" GROUP BY event").bind(...binds),
      env.QA_DB.prepare("SELECT day,event,SUM(n) AS total FROM site_analytics_daily "+where+" GROUP BY day,event ORDER BY day ASC").bind(...binds),
      env.QA_DB.prepare("SELECT page_path,city,SUM(CASE WHEN event='page_view' THEN n ELSE 0 END) AS views,SUM(CASE WHEN event='slashcure_click' THEN n ELSE 0 END) AS referrals,SUM(CASE WHEN event='whatsapp_open' THEN n ELSE 0 END) AS whatsapp_opens,SUM(CASE WHEN event='whatsapp_continue' THEN n ELSE 0 END) AS whatsapp_continues,SUM(CASE WHEN event='qa_submitted' THEN n ELSE 0 END) AS questions FROM site_analytics_daily "+where+" GROUP BY page_path,city ORDER BY views DESC,referrals DESC LIMIT 50").bind(...binds),
      env.QA_DB.prepare("SELECT city,SUM(CASE WHEN event='page_view' THEN n ELSE 0 END) AS views,SUM(CASE WHEN event='slashcure_click' THEN n ELSE 0 END) AS referrals,SUM(CASE WHEN event='whatsapp_continue' THEN n ELSE 0 END) AS whatsapp_continues FROM site_analytics_daily "+where+" GROUP BY city ORDER BY views DESC LIMIT 30").bind(...binds)
    ];
    const [totals,daily,pages,cities]=await env.QA_DB.batch(statements);
    return json({since,days,city:city||"all",generatedAt:new Date().toISOString(),totals:totals.results||[],daily:daily.results||[],pages:pages.results||[],cities:cities.results||[],note:"Aggregate events, not unique people. WhatsApp continues do not confirm that a message was sent."});
  }catch{return json({error:"Could not load analytics. Confirm QA_DB is connected."},503)}
}

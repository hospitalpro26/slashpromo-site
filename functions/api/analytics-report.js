import {requireOptionalAccess} from "../_lib/optional-access.js";
import {constantTimeEqual} from "../_lib/qa.js";
import {json,ensureAnalytics,CITY_NAMES} from "../_lib/analytics.js";
import {ensureDb} from "../_lib/qa.js";
/* The same private QA_ADMIN_KEY protects analytics. Never expose private Q&A fields. */
export async function onRequestGet(ctx){
  const {request,env}=ctx;
  const provided=request.headers.get("X-QA-Admin-Key")||"";
  if(!env.QA_ADMIN_KEY||!constantTimeEqual(provided,env.QA_ADMIN_KEY))return json({error:"Unauthorized."},401);
  if(!env.QA_DB)return json({error:"Configure the existing QA_DB Cloudflare binding first."},503);
  const accessDenied=await requireOptionalAccess(ctx); if(accessDenied)return accessDenied;
  const params=new URL(request.url).searchParams;
  const days=Number(params.get("days")||7);
  if(![7,30,90].includes(days))return json({error:"Choose 7, 30 or 90 days."},400);
  const city=(params.get("city")||"").trim().toLowerCase();
  if(city&&city!=="other"&&!CITY_NAMES.has(city))return json({error:"Invalid city filter."},400);
  const d=new Date();d.setUTCDate(d.getUTCDate()-days+1);
  const since=d.toISOString().slice(0,10);
  const where="WHERE day>=?"+(city?" AND city=?":"");
  const binds=city?[since,city]:[since];
  const whereGeo="WHERE day>=?"+(city?" AND page_city=?":"");
  try{
    await ensureAnalytics(env.QA_DB);
    /* Content cities describe what visitors opened, never where visitors live.
       Homepage and national directory hubs must not inflate the "Other" row. */
    const pageGroup="CASE WHEN page_path='/' THEN 'homepage' WHEN page_path IN ('/doctors/','/hospitals/','/clinics/','/laboratories/','/cities/') THEN 'directories' ELSE city END";
    const statements=[
      env.QA_DB.prepare("SELECT event,SUM(n) AS total FROM site_analytics_daily "+where+" GROUP BY event").bind(...binds),
      env.QA_DB.prepare("SELECT day,event,SUM(n) AS total FROM site_analytics_daily "+where+" GROUP BY day,event ORDER BY day ASC").bind(...binds),
      env.QA_DB.prepare("SELECT page_path,city,SUM(CASE WHEN event='page_view' THEN n ELSE 0 END) AS views,SUM(CASE WHEN event='slashcure_click' THEN n ELSE 0 END) AS referrals,SUM(CASE WHEN event='whatsapp_open' THEN n ELSE 0 END) AS whatsapp_opens,SUM(CASE WHEN event='whatsapp_continue' THEN n ELSE 0 END) AS whatsapp_continues,SUM(CASE WHEN event='qa_submitted' THEN n ELSE 0 END) AS questions FROM site_analytics_daily "+where+" GROUP BY page_path,city ORDER BY views DESC,referrals DESC LIMIT 50").bind(...binds),
      env.QA_DB.prepare("SELECT "+pageGroup+" AS city,SUM(CASE WHEN event='page_view' THEN n ELSE 0 END) AS views,SUM(CASE WHEN event='slashcure_click' THEN n ELSE 0 END) AS referrals,SUM(CASE WHEN event='whatsapp_continue' THEN n ELSE 0 END) AS whatsapp_continues FROM site_analytics_daily "+where+" GROUP BY 1 ORDER BY views DESC LIMIT 30").bind(...binds),
      env.QA_DB.prepare("SELECT country,SUM(n) AS views FROM site_visitor_geo_daily "+whereGeo+" GROUP BY country ORDER BY views DESC,country ASC LIMIT 20").bind(...binds),
      env.QA_DB.prepare("SELECT country,visitor_city,SUM(n) AS views FROM site_visitor_geo_daily "+whereGeo+" GROUP BY country,visitor_city ORDER BY views DESC,visitor_city ASC LIMIT 30").bind(...binds),
      env.QA_DB.prepare("SELECT COALESCE(SUM(n),0) AS recorded,COALESCE(SUM(CASE WHEN country='ZZ' THEN n ELSE 0 END),0) AS unknown_country FROM site_visitor_geo_daily "+whereGeo).bind(...binds)
    ];
    /* Rank actual provider profiles separately from directory and specialty pages. */
    const profileColumns="page_path,city,SUM(CASE WHEN event='page_view' THEN n ELSE 0 END) AS views,SUM(CASE WHEN event='slashcure_click' THEN n ELSE 0 END) AS referrals,SUM(CASE WHEN event='whatsapp_continue' THEN n ELSE 0 END) AS whatsapp_continues";
    const doctorProfiles=env.QA_DB.prepare("SELECT "+profileColumns+" FROM site_analytics_daily "+where+" AND page_path GLOB '/doctors/*/dr-*' GROUP BY page_path,city ORDER BY views DESC,referrals DESC LIMIT 25").bind(...binds);
    const hospitalProfiles=env.QA_DB.prepare("SELECT "+profileColumns+" FROM site_analytics_daily "+where+" AND page_path GLOB '/hospitals/*/*/' GROUP BY page_path,city ORDER BY views DESC,referrals DESC LIMIT 25").bind(...binds);
    const [totals,daily,pages,cities,geoCountries,geoCities,geoTotals,topDoctors,topHospitals]=await env.QA_DB.batch([...statements,doctorProfiles,hospitalProfiles]);
    await ensureDb(env);
    const qaCity=city&&city!=="other"?city:"";
    const qaArgs=qaCity?[qaCity]:[];
    const qaFilter=qaCity?" WHERE city=?":"";
    const qCounts=await env.QA_DB.prepare("SELECT status,COUNT(*) AS total FROM questions"+qaFilter+" GROUP BY status").bind(...qaArgs).all();
    const qaSummary={total:0,pending:0,approved:0,rejected:0};
    for(const record of qCounts.results||[]){
      const n=Number(record.total)||0;
      if(Object.hasOwn(qaSummary,record.status)){qaSummary[record.status]=n;qaSummary.total+=n;}
    }
    const qaRecent=await env.QA_DB.prepare("SELECT id,city,COALESCE(NULLIF(page_path,''),'/'||city||'/') AS page_path,category,question,answer,status,created_at,answered_at FROM questions"+qaFilter+" ORDER BY created_at DESC LIMIT 20").bind(...qaArgs).all();
    return json({since,days,city:city||"all",generatedAt:new Date().toISOString(),totals:totals.results||[],daily:daily.results||[],pages:pages.results||[],cities:cities.results||[],
      topDoctors:topDoctors.results||[],topHospitals:topHospitals.results||[],
      visitorGeography:{
        source:"Cloudflare approximate IP geolocation; page views only, not unique people",
        days,
        recordedPageViews:Number(geoTotals.results?.[0]?.recorded)||0,
        unknownCountryPageViews:Number(geoTotals.results?.[0]?.unknown_country)||0,
        countries:(geoCountries.results||[]).map(row=>({country:row.country,views:Number(row.views)||0})),
        cities:(geoCities.results||[]).map(row=>({country:row.country,city:row.visitor_city,views:Number(row.views)||0}))
      },qaSummary,qaRecent:qaRecent.results||[],note:"Aggregate events, not unique people. WhatsApp continues do not confirm that a message was sent. Saved Q&A records are not limited to the analytics date filter."});
  }catch{return json({error:"Could not load analytics. Confirm QA_DB is connected."},503)}
}

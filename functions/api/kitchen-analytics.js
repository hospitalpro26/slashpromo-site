import {json,ensureAnalytics} from "../_lib/analytics.js";
import {constantTimeEqual} from "../_lib/qa.js";
import {requireOptionalAccess} from "../_lib/optional-access.js";
const KITCHENS=[
  ["/sukkur/local-food/","Home Kitchens Directory"],
  ["/sukkur/local-food/sukkur-township/","Sukkur Township"],
  ["/sukkur/local-food/sadias-kitchen/","Sadia's Kitchen"],
  ["/sukkur/local-food/js-kitchen/","JS Kitchen"],
  ["/sukkur/local-food/a2z-home-baker/","A2Z Home Baker"],
  ["/sukkur/local-food/sukkur-homemade-food/","Sukkur Homemade Food"]
];
export async function onRequestGet(ctx){
 const {request,env}=ctx;
 const provided=request.headers.get("X-QA-Admin-Key")||"";
 if(!env.QA_ADMIN_KEY||!constantTimeEqual(provided,env.QA_ADMIN_KEY))return json({error:"Unauthorized"},401);
 if(!env.QA_DB)return json({error:"Analytics database not configured"},503);
 const denied=await requireOptionalAccess(ctx);if(denied)return denied;
 const days=Number(new URL(request.url).searchParams.get("days")||30);
 if(![1,7,30,90].includes(days))return json({error:"Invalid date range"},400);
 const selectedDay=new URL(request.url).searchParams.get("day");
 const today=new Date().toISOString().slice(0,10);
 if(selectedDay&&(days!==1||!/^\d{4}-\d{2}-\d{2}$/.test(selectedDay)||Number.isNaN(Date.parse(selectedDay+"T00:00:00Z"))||new Date(selectedDay+"T00:00:00Z").toISOString().slice(0,10)!==selectedDay||selectedDay>today))return json({error:"Invalid day"},400);
 const from=new Date();from.setUTCDate(from.getUTCDate()-days+1);
 const since=selectedDay||from.toISOString().slice(0,10);
 try{
  await ensureAnalytics(env.QA_DB);
  const paths=KITCHENS.map(x=>x[0]), placeholders=paths.map(()=>"?").join(",");
  const sql="SELECT page_path,event,SUM(n) AS total FROM site_analytics_daily WHERE day>=? AND day<=? AND page_path IN ("+placeholders+") AND event IN ('page_view','kitchen_whatsapp_click') GROUP BY page_path,event";
  const result=await env.QA_DB.prepare(sql).bind(since,selectedDay||today,...paths).all();
  const map=new Map(KITCHENS.map(([path,name])=>[path,{path,name,views:0,whatsappClicks:0}]));
  for(const row of result.results||[]){const item=map.get(row.page_path);if(!item)continue;if(row.event==="page_view")item.views=Number(row.total)||0;else if(row.event==="kitchen_whatsapp_click")item.whatsappClicks=Number(row.total)||0;}
  const rows=[...map.values()];
  return json({days,since,rows,totalViews:rows.reduce((sum,r)=>sum+r.views,0),totalWhatsappClicks:rows.reduce((sum,r)=>sum+r.whatsappClicks,0),note:"Page views count loads; WhatsApp clicks count outbound click attempts, not sent messages or completed orders. Do Not Track and Global Privacy Control are respected."});
 }catch{return json({error:"Unable to load kitchen analytics"},503)}
}

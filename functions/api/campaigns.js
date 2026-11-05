import {respond} from "../_lib/auth.js";
export async function onRequestGet(ctx){
 if(!ctx.env?.DB)return respond({campaigns:[]});
 const params=new URL(ctx.request.url).searchParams;
 const placement=params.get("placement")||"homepage",city=params.get("city")||"all",category=params.get("category")||"";
 if(!["homepage","city","category"].includes(placement)||!["all","sukkur","khairpur","shikarpur","ghotki","karachi"].includes(city)||category&&!["doctors","hospitals","laboratories","clinics"].includes(category))return respond({error:"Invalid filter"},400);
 const now=new Date().toISOString();
 try{
 const sql="SELECT id,title,provider_name,description,category,city,cta_label,image_url FROM campaigns WHERE status='live' AND (start_at IS NULL OR start_at<=?) AND (end_at IS NULL OR end_at>?) AND (placement='all' OR placement=?) AND (? != 'city' OR city='all' OR city=?) AND (? != 'category' OR category=?) ORDER BY updated_at DESC LIMIT 24";
 const r=await ctx.env.DB.prepare(sql).bind(now,now,placement,placement,city,placement,category).all();
 return new Response(JSON.stringify({campaigns:r.results||[]}),{headers:{"Content-Type":"application/json","Cache-Control":"public,max-age=60","X-Content-Type-Options":"nosniff"}});
 }catch(_){return respond({campaigns:[]})}
}
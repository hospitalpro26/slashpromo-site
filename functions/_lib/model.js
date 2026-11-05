import {respond} from "./auth.js";
const cities=["all","sukkur","khairpur","shikarpur","ghotki","karachi"],cats=["doctors","hospitals","laboratories","clinics"],placements=["all","homepage","city","category"],statuses=["draft","pending","approved","live","paused","archived"];
const string=(s,n)=>typeof s==="string"?s.trim().slice(0,n):"";
const date=s=>{if(!s)return null;const t=Date.parse(s);return Number.isFinite(t)?new Date(t).toISOString():false;};
const https=s=>{try{const u=new URL(s);return u.protocol==="https:"&&!u.username&&!u.password&&u.hostname.includes(".")?u.toString():false}catch(_){return false}};
export const fields="id,title,provider_name,description,category,city,placement,status,cta_label,target_url,image_url,start_at,end_at,clicks,created_at,updated_at";
export function validate(body,previous){
 const d={title:string(body.title,140),provider_name:string(body.provider_name,140),description:string(body.description,1000),category:string(body.category,30),city:string(body.city,30),placement:string(body.placement||"all",30),status:string(body.status||"draft",30),cta_label:string(body.cta_label||"View profile",40),target_url:https(body.target_url),image_url:body.image_url?https(body.image_url):null,start_at:date(body.start_at),end_at:date(body.end_at)};
 let errors=[];
 if(d.title.length<3||d.provider_name.length<2||d.description.length<15)errors.push("Fill in title, provider and description.");
 if(!cats.includes(d.category)||!cities.includes(d.city)||!placements.includes(d.placement)||!statuses.includes(d.status))errors.push("Invalid category, city, placement or status.");
 if(!d.target_url||d.image_url===false)errors.push("Provide valid HTTPS links.");
 if(d.start_at===false||d.end_at===false||(d.start_at&&d.end_at&&d.start_at>=d.end_at))errors.push("Invalid date range.");
 if(d.status==="live"&&previous?.status!=="live"&&d.end_at&&d.end_at<=new Date().toISOString())errors.push("Cannot publish an expired campaign.");
 return {data:d,errors};
}
export function fail(e){return respond({error:String(e?.message||"").includes("no such table")?"Run schema.sql in D1 before using campaigns.":"The campaign database operation failed."},500)}

import {respond,dbMissing} from "../../_lib/auth.js";
import {validate,fields,fail} from "../../_lib/model.js";
export async function onRequestGet(ctx){
 const missing=dbMissing(ctx);if(missing)return missing;
 try{const r=await ctx.env.DB.prepare("SELECT "+fields+" FROM campaigns ORDER BY updated_at DESC LIMIT 300").all();return respond({campaigns:r.results||[],admin:ctx.data.adminEmail});}catch(e){return fail(e)}
}
export async function onRequestPost(ctx){
 const missing=dbMissing(ctx);if(missing)return missing;
 let body;try{body=await ctx.request.json()}catch(_){return respond({error:"Expected JSON body."},400)}
 const {errors,data:d}=validate(body);if(errors.length)return respond({error:errors.join(" ")},400);
 const id=crypto.randomUUID(),now=new Date().toISOString();
 try{
 await ctx.env.DB.prepare("INSERT INTO campaigns(id,title,provider_name,description,category,city,placement,status,cta_label,target_url,image_url,start_at,end_at,clicks,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?)")
 .bind(id,d.title,d.provider_name,d.description,d.category,d.city,d.placement,d.status,d.cta_label,d.target_url,d.image_url,d.start_at,d.end_at,now,now).run();
 await ctx.env.DB.prepare("INSERT INTO campaign_audit(id,campaign_id,actor_email,action,created_at) VALUES(?,?,?,?,?)").bind(crypto.randomUUID(),id,ctx.data.adminEmail,"created:"+d.status,now).run();
 return respond({id,status:d.status,message:"Campaign created"},201);
 }catch(e){return fail(e)}
}
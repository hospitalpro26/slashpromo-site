import {respond,dbMissing} from "../../../_lib/auth.js";
import {validate,fields,fail} from "../../../_lib/model.js";
export async function onRequestGet(ctx){
 const missing=dbMissing(ctx);if(missing)return missing;
 try{const c=await ctx.env.DB.prepare("SELECT "+fields+" FROM campaigns WHERE id=?").bind(ctx.params.id).first();return c?respond({campaign:c}):respond({error:"Not found"},404)}catch(e){return fail(e)}
}
export async function onRequestPut(ctx){
 const missing=dbMissing(ctx);if(missing)return missing;
 let body;try{body=await ctx.request.json()}catch(_){return respond({error:"Expected JSON body"},400)}
 try{
 const prior=await ctx.env.DB.prepare("SELECT "+fields+" FROM campaigns WHERE id=?").bind(ctx.params.id).first();
 if(!prior)return respond({error:"Campaign not found"},404);
 const {errors,data:d}=validate(body,prior);if(errors.length)return respond({error:errors.join(" ")},400);
 const now=new Date().toISOString();
 await ctx.env.DB.prepare("UPDATE campaigns SET title=?,provider_name=?,description=?,category=?,city=?,placement=?,status=?,cta_label=?,target_url=?,image_url=?,start_at=?,end_at=?,updated_at=? WHERE id=?")
 .bind(d.title,d.provider_name,d.description,d.category,d.city,d.placement,d.status,d.cta_label,d.target_url,d.image_url,d.start_at,d.end_at,now,ctx.params.id).run();
 await ctx.env.DB.prepare("INSERT INTO campaign_audit(id,campaign_id,actor_email,action,created_at) VALUES(?,?,?,?,?)").bind(crypto.randomUUID(),ctx.params.id,ctx.data.adminEmail,prior.status+" -> "+d.status,now).run();
 return respond({id:ctx.params.id,status:d.status,message:"Campaign updated"});
 }catch(e){return fail(e)}
}
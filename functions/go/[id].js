export async function onRequestGet(ctx){
 const db=ctx.env?.DB;if(!db)return new Response("Campaign database unavailable",{status:503});
 const now=new Date().toISOString();
 try{
 const c=await db.prepare("SELECT target_url FROM campaigns WHERE id=? AND status='live' AND (start_at IS NULL OR start_at<=?) AND (end_at IS NULL OR end_at>?)").bind(ctx.params.id,now,now).first();
 if(!c)return new Response("Campaign is not available",{status:404});
 const url=new URL(c.target_url);if(url.protocol!=="https:"||url.username||url.password)return new Response("Invalid destination",{status:400});
 await db.prepare("UPDATE campaigns SET clicks=clicks+1 WHERE id=?").bind(ctx.params.id).run();
 return new Response(null,{status:302,headers:{"Location":url.toString(),"Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});
 }catch(_){return new Response("Campaign unavailable",{status:503})}
}
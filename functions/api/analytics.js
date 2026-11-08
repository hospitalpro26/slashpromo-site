import {EVENTS,cleanPath,json,sameOrigin,countEvent} from "../_lib/analytics.js";
export async function onRequestPost({request,env}){
  if(!sameOrigin(request))return json({error:"Cross-origin events are not accepted."},403);
  if(!env.QA_DB)return json({error:"Analytics database not configured."},503);
  const type=request.headers.get("Content-Type")||"";
  if(!/^text\/plain\b|^application\/json\b/i.test(type))return json({error:"Unsupported content type."},415);
  if(Number(request.headers.get("Content-Length")||0)>512)return json({error:"Too large."},413);
  let body;
  try{const raw=await request.text();if(raw.length>512)return json({error:"Too large."},413);body=JSON.parse(raw)}
  catch{return json({error:"Invalid event."},400)}
  if(!body||typeof body!=="object"||!EVENTS.has(body.event)||!cleanPath(body.path))return json({error:"Invalid analytics event."},400);
  try{
    await countEvent(env.QA_DB,body.event,body.path);
    return new Response(null,{status:204,headers:{"Cache-Control":"no-store","X-Robots-Tag":"noindex"}});
  }catch{return json({error:"Analytics temporarily unavailable."},503)}
}
export function onRequestGet(){return json({error:"Method not allowed."},405)}

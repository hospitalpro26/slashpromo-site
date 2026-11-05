import {authenticate} from "../_lib/auth.js";
export async function onRequest(context){
 const a=await authenticate(context);if(a.response)return a.response;
 context.data.adminEmail=a.email;
 const r=await context.next();const h=new Headers(r.headers);
 h.set("Cache-Control","no-store, private");h.set("X-Frame-Options","DENY");h.set("X-Content-Type-Options","nosniff");
 return new Response(r.body,{status:r.status,statusText:r.statusText,headers:h});
}
/* Fail closed: private backup page requires a verified Cloudflare Access identity. */
import {authenticate} from "../_lib/auth.js";
export async function onRequest(ctx){
 const a=await authenticate(ctx);
 if(a.response)return a.response;
 const response=await ctx.next();
 const headers=new Headers(response.headers);
 headers.set("Cache-Control","no-store, private, max-age=0");
 headers.set("Pragma","no-cache");
 headers.set("X-Robots-Tag","noindex,nofollow,noarchive");
 headers.set("Referrer-Policy","no-referrer");
 headers.set("X-Content-Type-Options","nosniff");
 headers.set("X-Frame-Options","DENY");
 headers.set("Content-Security-Policy","default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'");
 return new Response(response.body,{status:response.status,headers});
}

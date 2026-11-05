/* Served only after functions/admin/_middleware.js verifies Cloudflare Access JWT. */
export async function onRequest(ctx){
 const u=new URL(ctx.request.url);
 u.pathname="/admin/index.html";
 const req=new Request(u.toString(),{method:"GET"});
 const r=await ctx.env.ASSETS.fetch(req);
 const headers=new Headers(r.headers);
 headers.set("Cache-Control","no-store, private");headers.set("X-Robots-Tag","noindex, nofollow");headers.set("X-Frame-Options","DENY");
 return new Response(r.body,{status:r.status,statusText:r.statusText,headers});
}
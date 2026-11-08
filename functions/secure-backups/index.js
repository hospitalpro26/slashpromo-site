/* Static admin interface is only served following the secure-backups middleware. */
export async function onRequest(ctx){
 const u=new URL(ctx.request.url);u.pathname="/secure-backups/index.html";
 const r=await ctx.env.ASSETS.fetch(new Request(u.toString(),{method:"GET"}));
 const headers=new Headers(r.headers);
 headers.set("Cache-Control","no-store, private");
 headers.set("X-Robots-Tag","noindex,nofollow");
 return new Response(r.body,{status:r.status,statusText:r.statusText,headers});
}

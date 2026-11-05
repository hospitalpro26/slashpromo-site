/* Protect direct /admin/index.html requests as well as /admin/. */
export async function onRequest(ctx){
 const remainder=ctx.params.path;
 const value=Array.isArray(remainder)?remainder.join("/"):String(remainder||"");
 if(value&&value!=="index.html")return new Response("Not found",{status:404,headers:{"Cache-Control":"no-store"}});
 const url=new URL(ctx.request.url);url.pathname="/admin/index.html";
 const response=await ctx.env.ASSETS.fetch(new Request(url.toString(),{method:"GET"}));
 const headers=new Headers(response.headers);
 headers.set("Cache-Control","no-store,private");headers.set("X-Robots-Tag","noindex,nofollow");headers.set("X-Frame-Options","DENY");
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
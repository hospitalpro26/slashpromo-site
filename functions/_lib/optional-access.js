/* Optional verified-identity gate for the existing private admin APIs.
   Switch on only after Cloudflare Access covers their UI and API routes.
   Backup export endpoints always require Access, independently of this switch. */
import {authenticate} from "./auth.js";
export async function requireOptionalAccess(ctx){
  if(ctx.env?.ADMIN_ACCESS_REQUIRED!=="true")return null;
  const a=await authenticate(ctx);
  if(!a.response)return null;
  return new Response(JSON.stringify({error:a.response.status===503?
    "Cloudflare Access configuration required for private administration.":
    "A valid Cloudflare Access administrator login is required."}),{
    status:a.response.status,headers:{
      "Content-Type":"application/json; charset=utf-8",
      "Cache-Control":"no-store, private",
      "X-Content-Type-Options":"nosniff",
      "X-Robots-Tag":"noindex,nofollow",
      "Referrer-Policy":"no-referrer"
    }
  });
}

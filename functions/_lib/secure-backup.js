/* SlashPromo secure-backup allowlist. Dataset names/columns are fixed at build time.
 * No search strings, SQL identifiers, tokens or secrets are supplied by the visitor.
 * This is a *logical* archive, not a D1 Time Travel bookmark or full SQL snapshot. */
export const DATASETS=Object.freeze({
  questions:Object.freeze(["id","city","category","question","answer","status","created_at","answered_at","ip_hash","visitor_name","visitor_city","visitor_whatsapp","visitor_suggestion","contact_consent","public_name_consent","page_path","draft_answer","updated_at"]),
  enquiries:Object.freeze(["id","visitor_name","visitor_area","visitor_phone","enquiry_text","source_path","source_title","source_city","consent_at","created_at","updated_at","status","admin_note","closed_at","whatsapp_sent_confirmed"]),
  enquiry_replies:Object.freeze(["id","enquiry_id","reply_text","status","created_at","updated_at","sent_confirmed_at"]),
  site_analytics_daily:Object.freeze(["day","page_path","city","event","n"])
});
export const DATASET_NAMES=Object.freeze(Object.keys(DATASETS));
export const ARCHIVE_SCHEMA="slashpromo-d1-logical-v1";
export function backupResponse(data,status=200){
 return new Response(JSON.stringify(data),{status,headers:{
  "Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store, private, max-age=0",
  "Pragma":"no-cache","X-Content-Type-Options":"nosniff","X-Robots-Tag":"noindex,nofollow",
  "Referrer-Policy":"no-referrer","Content-Security-Policy":"default-src 'none'; frame-ancestors 'none'",
  "Vary":"Cookie, X-QA-Admin-Key"
 }});
}

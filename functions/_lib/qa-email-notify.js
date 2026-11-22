// Private, optional notification for NEW questions only.
// Never include patient-submitted text, visitor identities or WhatsApp numbers in email.
// Turn on only after RESEND_API_KEY, QA_NOTIFY_TO and QA_NOTIFY_FROM are set
// as Cloudflare Pages production secrets and the sender domain is verified.
const emailPattern=/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
function address(value){
  const x=String(value||"").trim();
  return x.length<=254&&emailPattern.test(x)?x:null;
}
export function notificationEnabled(env){
  return Boolean(env?.RESEND_API_KEY&&address(env.QA_NOTIFY_TO)&&address(env.QA_NOTIFY_FROM));
}
export async function notifyNewQuestion(env,record){
  if(!notificationEnabled(env))return {configured:false,attempted:false};
  const city=String(record.city||"").slice(0,40).replace(/[\r\n]/g," ");
  const category=String(record.category||"").slice(0,80).replace(/[\r\n]/g," ");
  const ref=String(record.id||"").slice(0,8).toUpperCase();
  const page=String(record.pagePath||"").slice(0,180);
  const body=[
    "A new SlashPromo question has been saved for private review.",
    "",
    "Reference: "+ref,
    "City: "+city,
    "Category: "+category,
    "Source page: "+page,
    "Status: Pending administrator approval",
    "",
    "Review privately: https://slashpromo.com/qa-admin/",
    "",
    "Visitor contact information and the question text are deliberately excluded from email. Sign in to the private moderation dashboard to inspect and respond.",
    "This is an administrative notification, not an automatic public reply."
  ].join("\n");
  try{
    const res=await fetch("https://api.resend.com/emails",{
      method:"POST",
      headers:{
        "Authorization":"Bearer "+env.RESEND_API_KEY,
        "Content-Type":"application/json",
        "Idempotency-Key":"slashpromo-qa-"+String(record.id||"").slice(0,36)
      },
      body:JSON.stringify({
        from:"SlashPromo Q&A <"+address(env.QA_NOTIFY_FROM)+">",
        to:[address(env.QA_NOTIFY_TO)],
        subject:"SlashPromo Q&A: New question awaiting review ("+city+")",
        text:body
      }),
      signal:AbortSignal.timeout(10000)
    });
    // Intentionally do not log upstream response: it could contain account information.
    return {configured:true,attempted:true,accepted:res.ok};
  }catch{
    return {configured:true,attempted:true,accepted:false};
  }
}

(()=>{
'use strict';
const form=document.querySelector('#feedback-form');if(!form)return;
const status=document.querySelector('#feedback-status'),button=document.querySelector('#feedback-submit'),list=document.querySelector('#feedback-list');
let token='',widget;
function node(tag,text){const e=document.createElement(tag);e.textContent=text;return e;}
async function json(response){const data=await response.json();if(!response.ok)throw Error(data.error||'Feedback is temporarily unavailable. Please try again later.');return data;}
fetch('/api/questions?city=homepage&pagePath=%2F',{cache:'no-store'}).then(json).then(data=>{
 list.replaceChildren();
 for(const comment of data.questions||[]){
  const card=document.createElement('article');card.className='feedback-comment';
  card.append(node('strong',comment.author_name||'Community member'));
  const body=node('p',comment.question);body.dir='auto';card.append(body);
  if(comment.answer){const reply=node('p','Slashpromo team: '+comment.answer);reply.dir='auto';card.append(reply);}
  list.append(card);
 }
 if(!list.children.length)list.append(node('p','No comments have been published yet. Your feedback can help shape Slashpromo.'));
 if(!data.enabled||!data.siteKey){status.textContent='Comment submissions are temporarily unavailable. Please try again later.';return;}
 status.textContent='Comments appear only after approval.';
 const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;
 script.onload=()=>{try{widget=window.turnstile.render('#feedback-security',{sitekey:data.siteKey,callback:value=>{token=value;button.disabled=false;},'expired-callback':()=>{token='';button.disabled=true;},'error-callback':()=>{token='';button.disabled=true;status.textContent='Security check failed. Please refresh and try again.';}});}catch{status.textContent='Could not load the security check. Please refresh and try again.';}};
 script.onerror=()=>{status.textContent='Could not load the security check. Please refresh and try again.';};document.head.append(script);
}).catch(error=>{status.textContent=error.message;list.replaceChildren(node('p','Comments could not load. Please try again later.'));});
form.addEventListener('submit',async event=>{
 event.preventDefault();if(!form.reportValidity()||!token)return;
 const values=new FormData(form);button.disabled=true;status.textContent='Submitting your comment…';
 try{
  const data=await fetch('/api/questions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({city:'homepage',pagePath:'/',category:'Community feedback',visitorName:values.get('visitorName'),visitorCity:values.get('visitorCity'),question:values.get('question'),publicNameConsent:values.get('consent')==='on',website:values.get('website'),turnstileToken:token})}).then(json);
  if(!data.saved)throw Error('Your comment was not saved. Please refresh and try again.');
  form.reset();status.textContent='Thank you. Your comment is awaiting review and is not public yet. Reference: '+data.reference;
 }catch(error){status.textContent=error.message;}
 finally{token='';button.disabled=true;if(window.turnstile&&widget!==undefined)window.turnstile.reset(widget);}
});
})();

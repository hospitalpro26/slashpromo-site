/* Public city Q&A. Questions remain private until reviewed by SlashPromo. */
(() => {
  "use strict";
  const cityMap={sukkur:"Sukkur",khairpur:"Khairpur",shikarpur:"Shikarpur",ghotki:"Ghotki",karachi:"Karachi",lahore:"Lahore",hyderabad:"Hyderabad","pano-aqil":"Pano Aqil"};
  // City landing pages retain their city-wide discussion. Provider, specialty
  // and health-topic pages use a separate question thread for their own URL.
  const pagePath=location.pathname.toLowerCase().replace(/\/+$/,"")+"/";
  const parts=pagePath.split("/").filter(Boolean);
  const rootCity=parts.length===1&&cityMap[parts[0]]?parts[0]:null;
  const localSubpage=parts.length>1&&Object.hasOwn(cityMap,parts[0])?parts[0]:null;
  const providerSubpage=parts.length>2
    &&["doctors","hospitals","clinics","laboratories"].includes(parts[0])
    &&Object.hasOwn(cityMap,parts[1])?parts[1]:null;
  const city=rootCity||localSubpage||providerSubpage;
  if(!city)return;
  const label=cityMap[city],isCityRoot=Boolean(rootCity);
  const h1=(document.querySelector("main h1")?.textContent||"").trim().replace(/\s+/g," ");
  const topic=isCityRoot?"healthcare in "+label:(h1.replace(/^Find\s+(?:the\s+)?best\s+/i,"").replace(/^Find\s+/i,"").trim()||"healthcare in "+label);
  const htmlSafe=text=>String(text).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const questionHint=pagePath.includes("dr-bashir-ahmed-khoso")||pagePath.includes("rheumatologist")
    ?"For example: Where can I check Dr. Bashir Ahmed Khoso's current OPD timings in Sukkur?"
    :"For example: What are the published OPD timings or clinic contact details for a doctor on this page?";
  const main=document.querySelector("main");
  if(!main||document.querySelector("#community-questions"))return;
  const stylesheet=document.createElement("link");
  stylesheet.rel="stylesheet";stylesheet.href="/assets/city-questions.css?v=20261108-nationwide-qa7";document.head.appendChild(stylesheet);
  const section=document.createElement("section");
  section.id="community-questions";section.className="sp-qa-section";
  section.setAttribute("aria-labelledby","sp-qa-title");
  section.innerHTML=`
    <div class="wrap sp-qa-shell">
      <div class="sp-qa-heading">
        <span class="sp-qa-eyebrow">Community health questions · ${label}</span>
        <h2 id="sp-qa-title">Questions &amp; Answers about ${htmlSafe(topic)}</h2>
        <p>Ask about the specialists, doctors, clinic contact numbers, published OPD timings and healthcare information on this page. Our team reviews each question before a public answer appears.</p>
      </div>
      <div class="sp-qa-grid">
        <div class="sp-qa-card">
          <h3>Ask a question</h3>
          <form class="sp-qa-form" id="sp-qa-form">
            <label>What is your question about?
              <select name="category" required>
                <option value="Health questions">General health question</option>
                <option value="OPD timings">Doctor OPD timings</option>
                <option value="Doctor contact">Public doctor/clinic contact number</option>
                <option value="Doctors &amp; hospitals">Doctors and hospitals</option>
                <option value="Appointments">Appointments and bookings</option>
                <option value="Other">Other healthcare query</option>
              </select>
            </label>
            <label>Your question
              <textarea name="question" required minlength="12" maxlength="700" rows="4" placeholder="${htmlSafe(questionHint)}"></textarea>
            </label>
            <fieldset class="sp-qa-personal">
              <legend>Your details <span>(name shown publicly after approval; other details private)</span></legend>
              <div class="sp-qa-personal-grid">
                <label>Your name <span class="sp-qa-required">Required · public when approved</span>
                  <input name="visitorName" type="text" autocomplete="name" required minlength="2" maxlength="100" placeholder="Enter your name">
                </label>
                <label>Your city <span class="sp-qa-required">Required</span>
                  <input name="visitorCity" type="text" autocomplete="address-level2" required minlength="2" maxlength="80" placeholder="Your city">
                </label>
              </div>
              <label class="sp-qa-check"><input type="checkbox" name="publicNameConsent" required><span><strong>I understand and agree that my name will appear publicly with my question if it is approved.</strong></span></label>
              <label>WhatsApp number <span class="sp-qa-optional">Optional · private</span>
                <input name="visitorWhatsApp" type="tel" autocomplete="tel" inputmode="tel" maxlength="24" placeholder="e.g. +92 300 1234567">
              </label>
              <p class="sp-qa-note">Your WhatsApp number is never shown on the public website. Our team may contact you about your question only if you provide a number and agree below.</p>
              <label class="sp-qa-check"><input type="checkbox" name="contactConsent"><span>I agree that the SlashPromo team may contact me on WhatsApp about this question.</span></label>
              <label>How can we improve? <span class="sp-qa-optional">Optional · private</span>
                <textarea name="visitorSuggestion" rows="3" maxlength="1200" placeholder="Share a suggestion, a solution you'd like, or an improvement you want to see on SlashPromo."></textarea>
              </label>
              <p class="sp-qa-note">Your name will be shown beside your approved question. Your city, WhatsApp number and improvement suggestions remain private and visible only to the SlashPromo team.</p>
            </fieldset>
            <label class="sp-qa-honeypot" aria-hidden="true">Leave this field blank<input name="website" tabindex="-1" autocomplete="off"></label>
            <div class="sp-qa-security" id="sp-qa-security" aria-label="Spam-prevention check"></div>
            <div class="sp-qa-actions"><button type="submit" id="sp-qa-submit" disabled>Submit for review</button></div>
            <p id="sp-qa-feedback" class="sp-qa-feedback" role="status" aria-live="polite" hidden></p>
            <p class="sp-qa-note">Your name appears publicly only with an approved question. Do not include phone numbers, email addresses, patient details or medical reports in the question itself.</p>
          </form>
        </div>
        <div class="sp-qa-card">
          <h3>Approved answers about ${htmlSafe(topic)}</h3>
          <div id="sp-qa-questions" class="sp-qa-questions" aria-live="polite"><p class="sp-qa-note">Loading approved questions…</p></div>
          <div class="sp-qa-privacy"><strong>For information, not diagnosis.</strong> General health answers cannot replace examination by a qualified clinician. For emergencies, seek urgent medical care. OPD schedules and contact numbers must be confirmed with the provider before travel.</div>
        </div>
      </div>
    </div>`;
  const fallback=document.getElementById("sp-qa-fallback");
  if(fallback) fallback.replaceWith(section);
  else main.appendChild(section);
  const form=section.querySelector("#sp-qa-form");
  form.elements.visitorCity.value=label;
  const feedback=section.querySelector("#sp-qa-feedback");
  const button=section.querySelector("#sp-qa-submit");
  const results=section.querySelector("#sp-qa-questions");
  const security=section.querySelector("#sp-qa-security");
  let turnstileId=null,turnstileToken="",isReady=false;
  function notice(message,kind="info"){feedback.hidden=false;feedback.dataset.kind=kind;feedback.textContent=message;}
  function renderQuestions(items){
    results.replaceChildren();
    if(!items.length){
      const p=document.createElement("p");p.className="sp-qa-note";
      p.textContent="No approved questions here yet. Useful questions and verified answers will appear after review.";
      results.append(p);return;
    }
    for(const item of items){
      const article=document.createElement("article");article.className="sp-qa-item";
      const category=document.createElement("span");category.className="sp-qa-item-category";category.textContent=item.category||"Healthcare";
      const question=document.createElement("h4");question.textContent=item.question;
      const label=document.createElement("span");label.className="sp-qa-answer-label";label.textContent="SlashPromo team response";
      const answer=document.createElement("p");answer.textContent=item.answer||"";
      article.append(category,question);
      if(typeof item.author_name==="string"&&item.author_name.trim()){
        const byline=document.createElement("p");
        byline.className="sp-qa-byline";
        byline.textContent="Asked by "+item.author_name;
        article.append(byline);
      }
      article.append(label,answer);results.append(article);
    }
  }
  function enableSecurity(siteKey){
    const script=document.createElement("script");
    script.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async=true;
    script.onload=()=>{
      try {
        turnstileId=window.turnstile.render(security,{
          sitekey:siteKey,
          callback:(token)=>{turnstileToken=token;button.disabled=false;},
          "expired-callback":()=>{turnstileToken="";button.disabled=true;},
          "error-callback":()=>{turnstileToken="";button.disabled=true;notice("The security check could not load. Please refresh and try again.","error");}
        });
      }catch{notice("Security verification is unavailable. Please try again later.","error");}
    };
    script.onerror=()=>notice("Could not load the security check. Please try again later.","error");
    document.head.appendChild(script);
  }
  async function load(){
    try{
      const response=await fetch("/api/questions?city="+encodeURIComponent(city)+"&pagePath="+encodeURIComponent(pagePath),{headers:{"Accept":"application/json"}});
      if(!response.ok)throw Error("Service unavailable");
      const data=await response.json();
      renderQuestions(Array.isArray(data.questions)?data.questions:[]);
      if(data.enabled&&data.siteKey){isReady=true;enableSecurity(data.siteKey);}
      else notice("Question submissions are being set up. For now, please use the published doctor and hospital contact details on this page.");
    }catch{
      renderQuestions([]);
      notice("Questions are temporarily unavailable. Please check again later.","error");
    }
  }
  form.addEventListener("submit",async(event)=>{
    event.preventDefault();
    if(!isReady||!turnstileToken)return;
    button.disabled=true;
    const payload={
      city,
      pagePath,
      category:form.elements.category.value,
      question:form.elements.question.value,
      visitorName:form.elements.visitorName.value,
      visitorCity:form.elements.visitorCity.value,
      visitorWhatsApp:form.elements.visitorWhatsApp.value,
      visitorSuggestion:form.elements.visitorSuggestion.value,
      contactConsent:form.elements.contactConsent.checked,
      publicNameConsent:form.elements.publicNameConsent.checked,
      website:form.elements.website.value,
      turnstileToken
    };
    try{
      const response=await fetch("/api/questions",{
        method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(payload)
      });
      const data=await response.json();
      if(!response.ok)throw Error(data.error||"Please try again later.");
      window.slashpromoTrack?.("qa_submitted");
      form.reset();
      form.elements.visitorCity.value=label;
      notice("Your question has been saved in the moderation dashboard (Reference: "+(data.reference||"received")+"). It is awaiting review. Only approved questions and consented names appear publicly; your contact details stay private.","success");
    }catch(error){notice(error.message||"Could not submit your question.","error");}
    finally{
      turnstileToken="";
      if(window.turnstile&&turnstileId!==null)window.turnstile.reset(turnstileId);
    }
  });
  load();
})();

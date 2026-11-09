import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=file=>readFileSync(file,"utf8");
const script=read("assets/site.js");
const section=script.slice(script.indexOf("/* WhatsApp-first contact"),script.indexOf("/* SlashPromo privacy-conscious site analytics:"));
assert(section.length>2000,"WhatsApp contact module missing");
assert(section.includes('action="https://wa.me/') && section.includes('method="get" target="_blank"'),"Direct WhatsApp form missing");
assert(section.includes('name="text"'),"WhatsApp message prefill field missing");
assert(!section.includes('id="sp-wa-email"') && !section.includes('id="sp-wa-phone"'),"Do not ask visitors for email or WhatsApp contact number");
assert(!section.includes('+92 335 2648572'),"WhatsApp number must not be printed in the floating button");
assert(section.includes('"My message:"') && section.includes("question,") && section.includes('"Link: "+pageUrl'),"Typed query or source URL is not included");
assert(section.includes('window.slashpromoTrack?.("whatsapp_continue")'),"WhatsApp handoff analytics missing");
assert(!section.includes('fetch("/api/enquiries"') && !section.includes("turnstile"),"WhatsApp should not require private save or CAPTCHA");
for(const id of ["sp-wa-name","sp-wa-address","sp-wa-question"]){
  assert(section.includes('id="'+id+'"'),"Missing input: "+id);
}
const contact=read("contact/index.html");
const privacy=read("privacy/index.html");
assert(contact.includes("Other contact options — private email"),"Private email alternative missing");
assert(!contact.includes("+92 335 2648572"),"Do not display WhatsApp contact number on Contact page");
assert(privacy.includes("You must press Send within WhatsApp"),"Missing privacy message about delivery");
const base="https://slashpromo.com";
const locs=[...read("sitemap.xml").matchAll(/<loc>(https:\/\/slashpromo\.com\/[^<]+)<\/loc>/g)].map(m=>m[1]);
for(const url of locs){
  const rel=url.slice(base.length);
  const file=rel==="/"?"index.html":rel.slice(1)+"index.html";
  const html=read(file);
  assert(html.includes("/assets/site.js"),"Canonical page missing shared WhatsApp script: "+file);
}
console.log("PASS: WhatsApp-first simplified message form, no visible number, privacy, contact settings, all "+locs.length+" canonical pages");

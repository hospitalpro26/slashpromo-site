(() => {
"use strict";
const $=id=>document.getElementById(id),form=$("campaign-form"),list=$("campaigns-list"),notice=$("notice");
let campaigns=[],editing=null;
const show=(msg,error=false)=>{notice.hidden=false;notice.classList.toggle("error",error);notice.textContent=msg;};
const hide=()=>{notice.hidden=true;};
const localDate=s=>{if(!s)return "";const d=new Date(s);if(!Number.isFinite(d.getTime()))return "";const z=n=>String(n).padStart(2,"0");return d.getFullYear()+"-"+z(d.getMonth()+1)+"-"+z(d.getDate())+"T"+z(d.getHours())+":"+z(d.getMinutes());};
const outbound=(raw)=>raw?new Date(raw).toISOString():null;
const state=v=>v==="live"?"live":v==="pending"?"pending":v==="paused"?"paused":"";
const reset=()=>{editing=null;form.reset();$("editor-title").textContent="New healthcare campaign";$("editor-mode").textContent="New";hide();window.scrollTo({top:0,behavior:"smooth"});};
const read=()=>{
 const data=Object.fromEntries(new FormData(form).entries());
 data.start_at=outbound(data.start_at);data.end_at=outbound(data.end_at);
 return data;
};
const request=async(url,opts={})=>{const response=await fetch(url,{credentials:"same-origin",cache:"no-store",headers:{"Accept":"application/json",...(opts.body?{"Content-Type":"application/json"}:{})},...opts});let body={};try{body=await response.json()}catch(_){body={error:"Invalid server response."}}if(!response.ok)throw Error(body.error||"Request failed");return body};
const cell=(tag,value)=>{const el=document.createElement(tag);el.textContent=String(value??"");return el;};
const render=()=>{
 const q=$("campaign-search").value.trim().toLowerCase(),filtered=campaigns.filter(c=>(c.title+" "+c.provider_name+" "+c.city+" "+c.status+" "+c.category).toLowerCase().includes(q));
 list.replaceChildren();
 if(!filtered.length){const tr=document.createElement("tr"),td=cell("td","No campaigns match this search.");td.colSpan=4;tr.append(td);list.append(tr);}
 for(const c of filtered){
  const tr=document.createElement("tr"),td=document.createElement("td"),strong=cell("strong",c.title),small=cell("small",c.provider_name+" · "+c.city+" · "+c.category);td.append(strong,small);tr.append(td);
  const status=document.createElement("td"),pill=cell("span",c.status);pill.className="status "+state(c.status);status.append(pill);tr.append(status);
  tr.append(cell("td",Number(c.clicks||0).toLocaleString()));
  const action=document.createElement("td"),edit=cell("button","Edit");edit.type="button";edit.addEventListener("click",()=>editCampaign(c.id));action.append(edit);tr.append(action);list.append(tr);
 }
 $("total-count").textContent=String(campaigns.length);
 $("live-count").textContent=String(campaigns.filter(c=>c.status==="live").length);
 $("pending-count").textContent=String(campaigns.filter(c=>c.status==="pending").length);
 $("click-count").textContent=campaigns.reduce((sum,c)=>sum+Number(c.clicks||0),0).toLocaleString();
};
function editCampaign(id){
 const c=campaigns.find(x=>x.id===id);if(!c)return;
 editing=id;form.reset();
 for(const name of ["title","provider_name","description","category","city","placement","status","target_url","image_url","cta_label"]){if(form.elements[name])form.elements[name].value=c[name]||"";}
 form.elements.start_at.value=localDate(c.start_at);form.elements.end_at.value=localDate(c.end_at);
 $("editor-title").textContent="Edit campaign";$("editor-mode").textContent="Editing";hide();$("editor-title").scrollIntoView({behavior:"smooth",block:"start"});
}
const load=async()=>{try{const data=await request("/admin/api/campaigns");campaigns=data.campaigns||[];$("admin-email").textContent=data.admin||"Authenticated administrator";render();hide();}catch(e){show(e.message,true);list.replaceChildren();const tr=document.createElement("tr"),td=cell("td","Administrator API is not ready. See the error above.");td.colSpan=4;tr.append(td);list.append(tr)}};
form.addEventListener("submit",async e=>{
 e.preventDefault();hide();const submit=$("save");submit.disabled=true;submit.textContent="Saving…";
 try{const data=read();if(data.status==="live"&&!window.confirm("Publish this campaign publicly as Sponsored? Confirm all claims and image permissions are approved.")){return}
 const method=editing?"PUT":"POST",url=editing?"/admin/api/campaigns/"+encodeURIComponent(editing):"/admin/api/campaigns";
 const result=await request(url,{method,body:JSON.stringify(data)});await load();show(result.message||"Campaign saved.");if(!editing)reset();
 }catch(e){show(e.message,true)}finally{submit.disabled=false;submit.textContent="Save campaign"}
});
$("new-campaign").addEventListener("click",reset);
$("reset").addEventListener("click",reset);
$("refresh").addEventListener("click",load);
$("campaign-search").addEventListener("input",render);
load();
})();
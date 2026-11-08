/* Admin-only browser-side encrypted logical export. No localStorage/cookies/third-party JS. */
"use strict";
(()=>{
const $=id=>document.getElementById(id);
const tables=["questions","enquiries","enquiry_replies","site_analytics_daily"];
const encoder=new TextEncoder();
let healthOk=false,busy=false;
const note=(id,msg)=>{$(id).textContent=msg};
function number(value){return Number(value).toLocaleString("en-PK")}
async function api(params){
  const key=$("admin-key").value.trim();
  if(!key)throw Error("Enter your administrator key.");
  const r=await fetch("/api/secure-backup?"+new URLSearchParams(params).toString(),{
    method:"GET",cache:"no-store",credentials:"same-origin",
    headers:{"X-QA-Admin-Key":key,"Accept":"application/json"}
  });
  let data;try{data=await r.json()}catch{throw Error("Non-JSON response; check your Cloudflare Access login and try again.")}
  if(!r.ok)throw Error(data.error||"Secure backup request was denied.");
  return data;
}
async function check(event){
  if(event)event.preventDefault();
  if(busy)return;busy=true;$("check").disabled=true;
  $("export").disabled=true;healthOk=false;
  note("status","Checking the live D1 database without changing its contents...");
  try{
    const data=await api({mode:"verify"});
    $("health").hidden=false;
    $("integrity").textContent=data.integrityCheck||"Unknown";
    $("orphans").textContent=data.orphanedReplies==null?"Not checked":number(data.orphanedReplies);
    for(const table of tables)$("count-"+table).textContent=data.tables?.[table]===null?"Missing":number(data.tables?.[table]||0);
    healthOk=data.ready===true;
    note("health-note",data.scope+" "+data.caution);
    note("status",healthOk?"Live D1 integrity and table checks passed. This does not verify a Time Travel snapshot.":"Live D1 verification did not pass. Check the table counts and database integrity before exporting.");
    $("export").disabled=!healthOk;
  }catch(error){
    note("status",error.message||"Cannot verify D1.");
    $("health").hidden=true;
  }finally{busy=false;$("check").disabled=false}
}
function hex(buf){return [...new Uint8Array(buf)].map(v=>v.toString(16).padStart(2,"0")).join("")}
async function shaRows(rows){return hex(await crypto.subtle.digest("SHA-256",encoder.encode(JSON.stringify(rows))))}
function base64(bytes){
  let binary="";const view=new Uint8Array(bytes);
  for(let i=0;i<view.length;i+=8192)binary+=String.fromCharCode(...view.subarray(i,i+8192));
  return btoa(binary);
}
function saveLocalFile(content,file){
 const blob=new Blob([content],{type:"application/octet-stream"});
 const url=URL.createObjectURL(blob);
 const a=document.createElement("a");
 a.href=url;a.download=file;a.style.display="none";document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),30000);
}
async function makeBackup(){
 if(busy||!healthOk)return;
 const pass=$("passphrase").value,again=$("passphrase-confirm").value;
 if(pass.length<16){note("export-status","Use an archive passphrase of at least 16 characters.");return}
 if(pass!==again){note("export-status","Archive passphrases do not match.");return}
 if(pass===$("admin-key").value){note("export-status","Use a separate passphrase, not your admin key.");return}
 busy=true;$("export").disabled=true;$("check").disabled=true;
 let logical=null,serialized=null;
 try{
   const results={},hashes={},counts={};
   for(const table of tables){
     let offset=0,expected=null,rows=[];
     while(true){
       note("export-status","Fetching "+table+" privately: "+number(offset)+" rows...");
       const page=await api({mode:"export",table,offset:String(offset),limit:"150"});
       if(page.table!==table||!Array.isArray(page.rows)||page.schema!=="slashpromo-d1-logical-v1")throw Error("Unexpected backup response for "+table);
       if(expected===null){
         expected=page.total;
         if(!Number.isSafeInteger(expected)||expected>25000||expected<0)
           throw Error("Dataset "+table+" is too large for the browser archive. Use Wrangler's full SQL export.");
       }
       if(page.total!==expected)throw Error("The "+table+" row count changed during export. Retry when writes are quiet.");
       if(page.rows.length===0&&offset<expected)throw Error("Incomplete export for "+table);
       rows.push(...page.rows);offset=rows.length;
       if(offset>=expected)break;
       if(rows.length>25000)throw Error("Dataset exceeded 25,000 rows.");
     }
     counts[table]=rows.length;
     hashes[table]=await shaRows(rows);
     results[table]=rows;
   }
   logical={
     schema:"slashpromo-d1-logical-v1",
     createdAt:new Date().toISOString(),
     notice:"Contains private, consented visitor information. Store encrypted offline; do not publish or upload.",
     scope:"Four QA_DB application tables. No separate ad DB, Cloudflare D1 Time Travel bookmark, enquiry_rate table or SQLite schema included.",
     counts,sha256:hashes,tables:results
   };
   serialized=JSON.stringify(logical);
   if(encoder.encode(serialized).byteLength>40*1024*1024)
     throw Error("Archive exceeds the 40 MB browser safety limit. Use Wrangler's SQL export instead.");
   note("export-status","Encrypting backup locally in this browser...");
   const salt=crypto.getRandomValues(new Uint8Array(16));
   const iv=crypto.getRandomValues(new Uint8Array(12));
   const material=await crypto.subtle.importKey("raw",encoder.encode(pass),"PBKDF2",false,["deriveKey"]);
   const derived=await crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:310000,hash:"SHA-256"},material,{name:"AES-GCM",length:256},false,["encrypt"]);
   const encrypted=await crypto.subtle.encrypt({name:"AES-GCM",iv,additionalData:encoder.encode("slashpromo-d1-logical-v1")},derived,encoder.encode(serialized));
   const envelope={
     format:"slashpromo-encrypted-v1",
     cipher:"AES-256-GCM",
     kdf:"PBKDF2-SHA256",
     iterations:310000,
     salt:base64(salt),
     iv:base64(iv),
     ciphertext:base64(encrypted)
   };
   const file="slashpromo-private-"+new Date().toISOString().replace(/[:.]/g,"-")+".spbk";
   saveLocalFile(JSON.stringify(envelope),file);
   $("passphrase").value="";$("passphrase-confirm").value="";
   note("export-status","Encrypted archive prepared for download ("+Object.entries(counts).map(([k,v])=>k+": "+number(v)).join(", ")+"). Save the passphrase separately and verify the file with the offline CLI before relying on it.");
 }catch(error){note("export-status","Backup not completed: "+(error.message||"Unknown error"))}
 finally{
   logical=null;serialized=null;busy=false;$("check").disabled=false;$("export").disabled=!healthOk;
 }
}
$("verify-form").addEventListener("submit",check);
$("export").addEventListener("click",makeBackup);
})();
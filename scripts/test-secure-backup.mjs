#!/usr/bin/env node
/* Synthetic-only secure backup round-trip test. No production records or keys. */
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createHash,pbkdf2Sync,createCipheriv,randomBytes} from "node:crypto";
import {spawnSync} from "node:child_process";
const expectedColumns={
 questions:["id","city","category","question","answer","status","created_at","answered_at","ip_hash","visitor_name","visitor_city","visitor_whatsapp","visitor_suggestion","contact_consent","public_name_consent","page_path","draft_answer","updated_at"],
 enquiries:["id","visitor_name","visitor_area","visitor_phone","enquiry_text","source_path","source_title","source_city","consent_at","created_at","updated_at","status","admin_note","closed_at","whatsapp_sent_confirmed"],
 enquiry_replies:["id","enquiry_id","reply_text","status","created_at","updated_at","sent_confirmed_at"],
 site_analytics_daily:["day","page_path","city","event","n"]
};
const now="2026-11-08T00:00:00.000Z";
const data={
 questions:[{id:"test-q",city:"sukkur",category:"Appointments",question:"Is the schedule listed online?",answer:"Please confirm with the clinic.",status:"approved",created_at:now,answered_at:now,ip_hash:"fake-only",visitor_name:"Sample User",visitor_city:"Sukkur",visitor_whatsapp:null,visitor_suggestion:null,contact_consent:0,public_name_consent:1,page_path:"/sukkur/",draft_answer:null,updated_at:now}],
 enquiries:[{id:"test-e",visitor_name:"Synthetic Visitor",visitor_area:"Sukkur",visitor_phone:null,enquiry_text:"How can I find clinic information?",source_path:"/sukkur/",source_title:"Sukkur Directory",source_city:"sukkur",consent_at:now,created_at:now,updated_at:now,status:"new",admin_note:null,closed_at:null,whatsapp_sent_confirmed:0}],
 enquiry_replies:[{id:"test-r",enquiry_id:"test-e",reply_text:"See verified clinic details.",status:"draft",created_at:now,updated_at:now,sent_confirmed_at:null}],
 site_analytics_daily:[{day:"2026-11-08",page_path:"/sukkur/",city:"sukkur",event:"page_view",n:2}]
};
for(const [name,rows] of Object.entries(data)){
 for(const row of rows)if(JSON.stringify(Object.keys(row))!==JSON.stringify(expectedColumns[name]))
   throw Error("Fixture columns do not match the expected "+name+" export schema");
}
const counts=Object.fromEntries(Object.entries(data).map(([k,v])=>[k,v.length]));
const sha256=Object.fromEntries(Object.entries(data).map(([k,v])=>[k,createHash("sha256").update(JSON.stringify(v)).digest("hex")]));
const payload={schema:"slashpromo-d1-logical-v1",createdAt:now,counts,sha256,tables:data};
const password="synthetic-archive-passphrase-EXAMPLE-only";
const salt=randomBytes(16),iv=randomBytes(12),key=pbkdf2Sync(password,salt,310000,32,"sha256");
const cipher=createCipheriv("aes-256-gcm",key,iv);cipher.setAAD(Buffer.from("slashpromo-d1-logical-v1"));
const encrypted=Buffer.concat([cipher.update(JSON.stringify(payload),"utf8"),cipher.final(),cipher.getAuthTag()]);
const envelope={format:"slashpromo-encrypted-v1",cipher:"AES-256-GCM",kdf:"PBKDF2-SHA256",iterations:310000,salt:salt.toString("base64"),iv:iv.toString("base64"),ciphertext:encrypted.toString("base64")};
const temp=mkdtempSync(join(tmpdir(),"slashpromo-synth-backup-"));
try{
 const backup=join(temp,"fixture.spbk"),sql=join(temp,"recovery.private.sql");
 writeFileSync(backup,JSON.stringify(envelope));
 if(readFileSync(backup,"utf8").includes("Synthetic Visitor"))throw Error("Plaintext leaked to encrypted file");
 const env={...process.env,SLASHPROMO_BACKUP_PASSPHRASE:password};
 const check=spawnSync(process.execPath,["scripts/verify-slashpromo-archive.mjs",backup,"--emit-sql",sql],{encoding:"utf8",env});
 if(check.status!==0)throw Error("Valid synthetic archive failed: "+check.stderr);
 if(!check.stdout.includes("VERIFIED:"))throw Error("Verifier did not complete");
 const bad=spawnSync(process.execPath,["scripts/verify-slashpromo-archive.mjs",backup],{encoding:"utf8",env:{...process.env,SLASHPROMO_BACKUP_PASSPHRASE:"incorrect-password-0000000000000"}});
 if(bad.status===0)throw Error("Wrong archive passphrase was accepted");
 const pycode=[
  "import sqlite3,sys",
  "db=sqlite3.connect(':memory:')",
  "with open(sys.argv[1], encoding='utf8') as f: db.executescript(f.read())",
  "for t in ['questions','enquiries','enquiry_replies','site_analytics_daily']:",
  "    assert db.execute('SELECT COUNT(*) FROM '+t).fetchone()[0]==1",
  "assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'",
  "assert db.execute('PRAGMA foreign_key_check').fetchall()==[]",
  "print('Synthetic SQL restored and integrity verified.')"
 ].join("\n");
 const py=spawnSync("python3",["-c",pycode,sql],{encoding:"utf8"});
 if(py.status!==0)throw Error("Synthetic SQL staging import failed: "+py.stderr);
 process.stdout.write("PASS: encrypted archive verification, wrong-passphrase rejection and synthetic staging SQL restore.\n");
}catch(error){process.stderr.write(String(error)+"\n");process.exitCode=1}
finally{rmSync(temp,{recursive:true,force:true})}

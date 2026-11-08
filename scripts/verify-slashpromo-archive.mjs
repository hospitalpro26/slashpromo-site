#!/usr/bin/env node
/* Verify locally encrypted SlashPromo logical archives without network access.
 * DO NOT put decrypted SQL/JSON in GitHub, web storage, or support tickets.
 *
 * SLASHPROMO_BACKUP_PASSPHRASE must be supplied privately via the environment.
 * Example (bash): read -rsp "Archive passphrase: " SLASHPROMO_BACKUP_PASSPHRASE; echo
 *                 export SLASHPROMO_BACKUP_PASSPHRASE
 *                 node scripts/verify-slashpromo-archive.mjs /private/backup.spbk
 *                 unset SLASHPROMO_BACKUP_PASSPHRASE
 */
import {readFileSync,writeFileSync} from "node:fs";
import {createHash,pbkdf2Sync,createDecipheriv} from "node:crypto";

const COLUMNS=Object.freeze({
 questions:["id","city","category","question","answer","status","created_at","answered_at","ip_hash","visitor_name","visitor_city","visitor_whatsapp","visitor_suggestion","contact_consent","public_name_consent","page_path","draft_answer","updated_at"],
 enquiries:["id","visitor_name","visitor_area","visitor_phone","enquiry_text","source_path","source_title","source_city","consent_at","created_at","updated_at","status","admin_note","closed_at","whatsapp_sent_confirmed"],
 enquiry_replies:["id","enquiry_id","reply_text","status","created_at","updated_at","sent_confirmed_at"],
 site_analytics_daily:["day","page_path","city","event","n"]
});
const NAMES=Object.keys(COLUMNS);
const CREATE=Object.freeze([
 "CREATE TABLE IF NOT EXISTS questions (id TEXT PRIMARY KEY,city TEXT NOT NULL,category TEXT NOT NULL,question TEXT NOT NULL,answer TEXT,status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),created_at TEXT NOT NULL,answered_at TEXT,ip_hash TEXT NOT NULL,visitor_name TEXT,visitor_city TEXT,visitor_whatsapp TEXT,visitor_suggestion TEXT,contact_consent INTEGER NOT NULL DEFAULT 0,public_name_consent INTEGER NOT NULL DEFAULT 0,page_path TEXT,draft_answer TEXT,updated_at TEXT);",
 "CREATE TABLE IF NOT EXISTS enquiries (id TEXT PRIMARY KEY,visitor_name TEXT NOT NULL,visitor_area TEXT NOT NULL,visitor_phone TEXT,enquiry_text TEXT NOT NULL,source_path TEXT NOT NULL,source_title TEXT NOT NULL,source_city TEXT NOT NULL,consent_at TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','contacted','resolved','closed')),admin_note TEXT,closed_at TEXT,whatsapp_sent_confirmed INTEGER NOT NULL DEFAULT 0);",
 "CREATE TABLE IF NOT EXISTS enquiry_replies (id TEXT PRIMARY KEY,enquiry_id TEXT NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,reply_text TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('draft','prepared','sent_confirmed')),created_at TEXT NOT NULL,updated_at TEXT NOT NULL,sent_confirmed_at TEXT);",
 "CREATE TABLE IF NOT EXISTS site_analytics_daily (day TEXT NOT NULL,page_path TEXT NOT NULL,city TEXT NOT NULL,event TEXT NOT NULL,n INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(day,page_path,city,event));",
 "CREATE TABLE IF NOT EXISTS enquiry_rate (day TEXT NOT NULL,ip_hash TEXT NOT NULL,n INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(day,ip_hash));",
 "CREATE INDEX IF NOT EXISTS idx_qa_public ON questions(city,status,answered_at);",
 "CREATE INDEX IF NOT EXISTS idx_qa_limit ON questions(ip_hash,created_at);",
 "CREATE INDEX IF NOT EXISTS idx_qa_page ON questions(city,page_path,status,answered_at);",
 "CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status,created_at);",
 "CREATE INDEX IF NOT EXISTS idx_enquiries_city ON enquiries(source_city,created_at);",
 "CREATE INDEX IF NOT EXISTS idx_enquiry_replies_enquiry ON enquiry_replies(enquiry_id,created_at);",
 "CREATE INDEX IF NOT EXISTS site_analytics_by_day ON site_analytics_daily(day,event,city);"
]);
function fail(message){process.stderr.write("Backup verification FAILED: "+message+"\n");process.exit(1)}
const args=process.argv.slice(2);
if(!args[0]||args[0]==="-h"||args[0]==="--help"){
 process.stdout.write("Usage: node scripts/verify-slashpromo-archive.mjs <backup.spbk> [--emit-sql /safe/private/restore.private.sql]\nSet SLASHPROMO_BACKUP_PASSPHRASE privately before running. No network requests.\n");
 process.exit(args[0]?0:2);
}
if(args.length!==1&&!(args.length===3&&args[1]==="--emit-sql"&&args[2].endsWith(".private.sql")))fail("Invalid arguments. SQL outputs must end with .private.sql.");
const pass=process.env.SLASHPROMO_BACKUP_PASSPHRASE;
if(!pass||pass.length<16)fail("Missing archive passphrase (SLASHPROMO_BACKUP_PASSPHRASE).");
let bytes,env;
try{
 bytes=readFileSync(args[0]);
 if(bytes.byteLength>60*1024*1024)throw Error("Archive is over 60 MB.");
 env=JSON.parse(bytes.toString("utf8"));
}catch(error){fail("Could not parse encrypted archive: "+error.message)}
if(env.format!=="slashpromo-encrypted-v1"||env.cipher!=="AES-256-GCM"||env.kdf!=="PBKDF2-SHA256"||env.iterations!==310000)
 fail("Unsupported or altered archive header.");
function decode(value,expectedLength){
 if(typeof value!=="string"||!value||!/^[A-Za-z0-9+/]+={0,2}$/.test(value))throw Error("Invalid base64 field.");
 const result=Buffer.from(value,"base64");
 if(expectedLength!==null&&result.length!==expectedLength)throw Error("Bad encrypted archive field length.");
 return result;
}
let payload;
try{
 const salt=decode(env.salt,16),iv=decode(env.iv,12),cipher=decode(env.ciphertext,null);
 if(cipher.length<16)throw Error("Missing authentication tag.");
 const key=pbkdf2Sync(pass,salt,310000,32,"sha256");
 const decrypt=createDecipheriv("aes-256-gcm",key,iv);
 decrypt.setAAD(Buffer.from("slashpromo-d1-logical-v1"));
 decrypt.setAuthTag(cipher.subarray(-16));
 const plaintext=Buffer.concat([decrypt.update(cipher.subarray(0,-16)),decrypt.final()]);
 payload=JSON.parse(plaintext.toString("utf8"));
}catch{fail("Wrong passphrase, damaged archive, or failed AES-GCM authentication.")}
if(payload?.schema!=="slashpromo-d1-logical-v1"||!payload.tables||!payload.counts||!payload.sha256)
 fail("Missing required logical archive manifest.");
const counts={};
for(const name of NAMES){
 const rows=payload.tables[name];
 if(!Array.isArray(rows)||!Number.isSafeInteger(payload.counts[name])||payload.counts[name]!==rows.length)
   fail("Missing rows or inconsistent row count for "+name);
 const digest=createHash("sha256").update(JSON.stringify(rows)).digest("hex");
 if(digest!==payload.sha256[name])fail("Row SHA-256 does not match for "+name);
 for(const row of rows){
   if(!row||typeof row!=="object"||Array.isArray(row)||COLUMNS[name].some(c=>!Object.hasOwn(row,c))||Object.keys(row).some(c=>!COLUMNS[name].includes(c)))
     fail("Unexpected export columns in "+name);
 }
 counts[name]=rows.length;
}
const parents=new Set(payload.tables.enquiries.map(x=>x.id));
if(payload.tables.enquiry_replies.some(x=>!parents.has(x.enquiry_id)))fail("Orphaned enquiry reply in archive.");
process.stdout.write("VERIFIED: AES-GCM authentication, record counts, SHA-256 manifests and enquiry-reply references.\n");
for(const [table,count] of Object.entries(counts))process.stdout.write(table+": "+count+" record(s)\n");
process.stdout.write("Created: "+payload.createdAt+"\n");
process.stdout.write("Scope: Four logical QA_DB tables; excludes transient rate counters, separate ads DB and D1 Time Travel.\n");
function sqlVal(value){
 if(value===null||value===undefined)return "NULL";
 if(typeof value==="boolean")return value?"1":"0";
 if(typeof value==="number"){if(!Number.isFinite(value))throw Error("Non-finite number.");return String(value)}
 if(typeof value==="string"){
   if(value.includes("\0"))throw Error("NUL-containing text cannot be emitted as SQL.");
   return "'"+value.replaceAll("'","''")+"'";
 }
 throw Error("Unsupported SQL cell type.");
}
if(args.length===3){
 const lines=[
  "-- SlashPromo logical QA_DB archive for a NEW, EMPTY staging D1 database only.",
  "-- Private data: never commit, email or upload this file. Verify row counts after import.",
  "-- Does not include the separate ad DB or temporary enquiry_rate contents.",
  ...CREATE
 ];
 try{
   for(const table of NAMES){
     const names=COLUMNS[table].map(c=>'"'+c+'"').join(",");
     for(const row of payload.tables[table]){
       const vals=COLUMNS[table].map(c=>sqlVal(row[c])).join(",");
       const statement="INSERT INTO "+table+" ("+names+") VALUES ("+vals+");";
       if(Buffer.byteLength(statement,"utf8")>=95000)throw Error("A SQL statement exceeds the D1 import safety threshold.");
       lines.push(statement);
     }
   }
   // Do NOT emit BEGIN/COMMIT; Wrangler D1 import manages its own transactions.
   writeFileSync(args[2],lines.join("\n")+"\n",{encoding:"utf8",mode:0o600,flag:"wx"});
   process.stdout.write("STAGING SQL CREATED: "+args[2]+"\n");
   process.stdout.write("Import into a new empty test D1 database only, then validate counts. Do not import directly into production.\n");
 }catch(error){fail("Could not create staging SQL: "+error.message)}
}

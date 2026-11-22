import assert from "node:assert/strict";
import {onRequestGet} from "../functions/api/questions.js";
import {questionPage} from "../functions/_lib/qa.js";

const rows=[
  {id:"one",city:"sukkur",page_path:null,status:"approved",answer:"Previously approved legacy answer",question:"Legacy approved question",category:"OPD timings",answered_at:"2026-11-07",public_name_consent:0,visitor_name:"Private visitor"},
  {id:"two",city:"sukkur",page_path:"/sukkur",status:"approved",answer:"Approved older root answer",question:"Root without trailing slash",category:"OPD timings",answered_at:"2026-11-08",public_name_consent:1,visitor_name:"Public visitor"},
  {id:"three",city:"sukkur",page_path:"",status:"approved",answer:"Approved empty-path answer",question:"Root with empty path",category:"Other",answered_at:"2026-11-09",public_name_consent:0,visitor_name:"Private visitor"},
  {id:"four",city:"sukkur",page_path:"/sukkur/",status:"approved",answer:"Approved current root answer",question:"Current root",category:"Other",answered_at:"2026-11-10",public_name_consent:0,visitor_name:"Private visitor"},
  {id:"five",city:"sukkur",page_path:"/doctors/sukkur/dr-example/",status:"approved",answer:"Doctor-specific answer",question:"Provider page only",category:"Other",answered_at:"2026-11-11",public_name_consent:0,visitor_name:"Private visitor"},
  {id:"six",city:"sukkur",page_path:null,status:"pending",answer:"Should never be public",question:"Unapproved",category:"Other",answered_at:"2026-11-12",public_name_consent:0,visitor_name:"Private visitor"},
  {id:"seven",city:"sukkur",page_path:null,status:"rejected",answer:"Rejected",question:"Rejected",category:"Other",answered_at:"2026-11-13",public_name_consent:0,visitor_name:"Private visitor"},
  {id:"eight",city:"sukkur",page_path:null,status:"approved",answer:"",question:"No public answer",category:"Other",answered_at:"2026-11-14",public_name_consent:0,visitor_name:"Private visitor"},
  {id:"nine",city:"khairpur",page_path:null,status:"approved",answer:"Different city",question:"Different city",category:"Other",answered_at:"2026-11-15",public_name_consent:0,visitor_name:"Private visitor"}
];
const columns=["visitor_name","visitor_city","visitor_whatsapp","visitor_suggestion","draft_answer","updated_at","contact_consent","public_name_consent","page_path"];
let executedSql="",usedBinds=[];
const db={
  batch:async()=>[],
  prepare(sql){
    return {
      bind(...values){usedBinds=values;return this;},
      async all(){
        if(sql.startsWith("PRAGMA"))return {results:columns.map(name=>({name}))};
        if(!sql.startsWith("SELECT id,category,question"))return {results:[]};
        executedSql=sql;
        const [city,path]=usedBinds;
        const isCityRoot=path==="/"+city+"/";
        const found=rows.filter(row=>row.city===city&&row.status==="approved"&&
          (row.page_path===path||(isCityRoot&&(row.page_path===null||row.page_path===""||row.page_path==="/"+city)))&&
          (row.page_path==="/"||row.answer.trim().length>0)
        );
        return {results:found.map(row=>({
          id:row.id,category:row.category,question:row.question,answer:row.answer,answered_at:row.answered_at,
          author_name:row.public_name_consent===1?row.visitor_name:null
        }))};
      },
      async run(){return {meta:{changes:0}};}
    };
  }
};
const env={QA_DB:db,QA_ADMIN_KEY:"test-key",QA_TURNSTILE_SITE_KEY:"test-site",QA_TURNSTILE_SECRET:"test-secret"};
assert.equal(questionPage("sukkur","/sukkur/"),"/sukkur/");
assert.equal(questionPage("sukkur","/doctors/sukkur/dr-example/"),"/doctors/sukkur/dr-example/");
async function get(city,path){
  const request=new Request("https://slashpromo.com/api/questions?city="+encodeURIComponent(city)+"&pagePath="+encodeURIComponent(path));
  const response=await onRequestGet({request,env});
  assert.equal(response.status,200);
  return response.json();
}
let data=await get("sukkur","/sukkur/");
assert.deepEqual(data.questions.map(q=>q.id),["one","two","three","four"]);
assert.equal(data.questions.find(q=>q.id==="one").author_name,null);
assert.equal(data.questions.find(q=>q.id==="two").author_name,"Public visitor");
assert(!JSON.stringify(data).includes("Private visitor"));
assert(executedSql.includes("status='approved'"));
assert(executedSql.includes("page_path=''"));
assert(executedSql.includes("page_path='/' || city"));
data=await get("sukkur","/doctors/sukkur/dr-example/");
assert.deepEqual(data.questions.map(q=>q.id),["five"]);
data=await get("khairpur","/khairpur/");
assert.deepEqual(data.questions.map(q=>q.id),["nine"]);
console.log("PASS: legacy city-root visibility, provider scoping, approved-only visibility, privacy, and no cross-city leakage");

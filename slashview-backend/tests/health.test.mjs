import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const googleSource=await readFile(new URL("../google-identity.js",import.meta.url),"utf8");
const googleUrl="data:text/javascript;base64,"+Buffer.from(googleSource).toString("base64");
const source=(await readFile(new URL("../worker.js",import.meta.url),"utf8")).replace("./google-identity.js",googleUrl);
const {default:worker}=await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
const request=(path,method="GET")=>new Request("https://example.test"+path,{method});
const DB={prepare(sql){assert.equal(sql,"SELECT 1");return {first:async()=>({1:1})}}};
test("health succeeds with bound database",async()=>{const r=await worker.fetch(request("/health"),{DB});assert.equal(r.status,200);assert.equal((await r.json()).database,"connected")});
test("health fails closed without database",async()=>{assert.equal((await worker.fetch(request("/"),{})).status,503)});
test("authentication disabled by default",async()=>{assert.equal((await worker.fetch(request("/v1/register","POST"),{DB})).status,503)});
test("review administration disabled separately",async()=>{assert.equal((await worker.fetch(request("/v1/admin/accounts"),{DB,AUTH_ENABLED:"true"})).status,503)});

test("Google sign-in disabled without configuration",async()=>{assert.equal((await worker.fetch(request("/v1/google/nonce","POST"),{DB,AUTH_ENABLED:"true"})).status,503)});

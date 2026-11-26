import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const googleSource=await readFile(new URL("../google-identity.js",import.meta.url),"utf8");
const googleUrl="data:text/javascript;base64,"+Buffer.from(googleSource).toString("base64");
const accessSource=await readFile(new URL("../access-owner.js",import.meta.url),"utf8");
const accessUrl="data:text/javascript;base64,"+Buffer.from(accessSource).toString("base64");
const source=(await readFile(new URL("../worker.js",import.meta.url),"utf8")).replace("./google-identity.js",googleUrl).replace("./access-owner.js",accessUrl);
const {default:worker}=await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
const request=(path,method="GET")=>new Request("https://example.test"+path,{method});
const DB={prepare(sql){assert.equal(sql,"SELECT 1");return {first:async()=>({1:1})}}};
test("health succeeds with bound database",async()=>{const r=await worker.fetch(request("/health"),{DB});assert.equal(r.status,200);assert.equal((await r.json()).database,"connected")});
test("health fails closed without database",async()=>{assert.equal((await worker.fetch(request("/"),{})).status,503)});
test("authentication disabled by default",async()=>{assert.equal((await worker.fetch(request("/v1/register","POST"),{DB})).status,503)});
test("review administration disabled separately",async()=>{assert.equal((await worker.fetch(request("/v1/admin/accounts"),{DB,AUTH_ENABLED:"true"})).status,503)});

test("Google sign-in disabled without configuration",async()=>{assert.equal((await worker.fetch(request("/v1/google/nonce","POST"),{DB,AUTH_ENABLED:"true"})).status,503)});

test("admin rejects requests without verified owner identity",async()=>{assert.equal((await worker.fetch(request("/v1/admin/accounts"),{DB,AUTH_ENABLED:"true",REVIEW_ADMIN_ENABLED:"true"})).status,401)});

test("Access backup verifies real RSA signatures and fails closed",async()=>{
 const {accessOwner}=await import(accessUrl);
 const {webcrypto}=await import("node:crypto");
 const key=await webcrypto.subtle.generateKey({name:"RSASSA-PKCS1-v1_5",modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:"SHA-256"},true,["sign","verify"]);
 const jwk={...await webcrypto.subtle.exportKey("jwk",key.publicKey),kid:"test-key"};
 const now=Math.floor(Date.now()/1000),team="https://test.cloudflareaccess.com";
 const env={ACCESS_TEAM_DOMAIN:team,ACCESS_AUD:"test-aud",ACCESS_OWNER_EMAIL:"owner@example.test",ACCESS_JWKS_BACKUP:JSON.stringify({issuer:team,expires:now+600,keys:[jwk]})};
 const encode=x=>Buffer.from(JSON.stringify(x)).toString("base64url");
 const make=async(overrides={})=>{
 const payload=encode({iss:team,aud:["test-aud"],email:"owner@example.test",iat:now-7200,exp:now+600,...overrides});
 const input=encode({alg:"RS256",kid:"test-key"})+"."+payload;
 const sig=Buffer.from(await webcrypto.subtle.sign("RSASSA-PKCS1-v1_5",key.privateKey,new TextEncoder().encode(input))).toString("base64url");
 return input+"."+sig;
 };
 const req=token=>new Request("https://example.test/v1/admin/accounts",{headers:{"Cf-Access-Jwt-Assertion":token}});
 const original=globalThis.fetch;
 try{
 globalThis.fetch=async()=>{throw new Error("simulated outage")};
 const token=await make();
 assert.equal(await accessOwner(req(token),env),true);
 assert.equal(await accessOwner(req(token),{...env,ACCESS_JWKS_BACKUP:""}),false);
 assert.equal(await accessOwner(req(token),{...env,ACCESS_JWKS_BACKUP:JSON.stringify({issuer:team,expires:now-1,keys:[jwk]})}),false);
 assert.equal(await accessOwner(req(await make({email:"other@example.test"})),env),false);
 assert.equal(await accessOwner(req(await make({aud:["wrong"]})),env),false);
 assert.equal(await accessOwner(req(await make({exp:now-1})),env),false);
 assert.equal(await accessOwner(req(token.slice(0,token.lastIndexOf(".")+1)+"AAAA"),env),false);
 globalThis.fetch=async()=>Response.json({keys:[jwk]});
 assert.equal(await accessOwner(req(token),{...env,ACCESS_JWKS_BACKUP:""}),true);
 }finally{globalThis.fetch=original}
});

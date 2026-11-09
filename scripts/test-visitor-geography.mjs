import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const lib=readFileSync(new URL("../functions/_lib/analytics.js",import.meta.url),"utf8");
const {geoFromCf,pathCity,cleanPath,countVisitorGeo}=await import("data:text/javascript,"+encodeURIComponent(lib));
assert.deepEqual(geoFromCf({country:"pk",city:"Sukkur"}),{country:"PK",city:"Sukkur"});
assert.deepEqual(geoFromCf({country:"US",city:"New York"}),{country:"US",city:"New York"});
assert.deepEqual(geoFromCf({country:"PK",city:"  Karachi  "}),{country:"PK",city:"Karachi"});
assert.deepEqual(geoFromCf(undefined),{country:"ZZ",city:"Unknown"});
assert.deepEqual(geoFromCf({country:"XX",city:"Sukkur"}),{country:"ZZ",city:"Unknown"});
assert.deepEqual(geoFromCf({country:"PK",city:"<script>alert(1)</script>"}),{country:"PK",city:"Unknown"});
assert.deepEqual(geoFromCf({country:"PK",city:"A".repeat(200)}),{country:"PK",city:"Unknown"});
assert.equal(pathCity("/doctors/sukkur/dr-test/"),"sukkur");
assert.equal(pathCity("/"),"other");
assert.equal(cleanPath("/doctors/sukkur/dr-test/"),"/doctors/sukkur/dr-test/");
console.log("PASS: visitor geography normalisation, missing location, invalid data and page-city classification.");

const statements=[];
let pendingMissingTable=true;
const mockDb={
  prepare(sql){
    const call={sql,args:[]};statements.push(call);
    return {
      bind(...args){call.args=args;return this},
      async run(){
        if(sql.startsWith("INSERT INTO site_visitor_geo_daily")&&pendingMissingTable){
          pendingMissingTable=false;
          throw new Error("D1_ERROR: no such table: site_visitor_geo_daily");
        }
        return {success:true};
      }
    };
  }
};
await countVisitorGeo(mockDb,"/doctors/sukkur/dr-test/",{country:"PK",city:"Sukkur"});
assert.equal(statements.filter(s=>s.sql.startsWith("INSERT")).length,2,"Should retry initial insert after safe table creation");
assert(statements.some(s=>s.sql.startsWith("CREATE TABLE IF NOT EXISTS site_visitor_geo_daily")),"Should create missing geo table");
assert(statements.some(s=>s.sql.startsWith("CREATE INDEX IF NOT EXISTS site_visitor_geo_by_day")),"Should create geo index");
assert.deepEqual(statements.filter(s=>s.sql.startsWith("INSERT")).at(-1).args.slice(1),["sukkur","PK","Sukkur"]);
assert(statements.every(s=>!/(?:visitor_ip|phone_number|latitude|longitude|gps)/i.test(s.sql)),"Must not store raw IP, phone or GPS details");
console.log("PASS: geo aggregation creates missing table, retries safely and stores no identifying fields.");

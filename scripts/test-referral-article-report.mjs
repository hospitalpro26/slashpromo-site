import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {pathCity,CITY_NAMES} from "../functions/_lib/analytics.js";

const backend=readFileSync(new URL("../functions/api/analytics-report.js",import.meta.url),"utf8");
const dashboard=readFileSync(new URL("../analytics/index.html",import.meta.url),"utf8");
assert(CITY_NAMES.has("ratodero"),"Ratodero must be a recognized analytics city");
assert.equal(pathCity("/ratodero/health-topics/hepatitis-b-c/"),"ratodero");
assert.equal(pathCity("/doctors/ratodero/dr-nadia-khan-arbani/"),"ratodero");
assert(backend.includes("topArticles:topArticles.results||[]"),"Article results must be returned");
assert(backend.includes("AND page_path LIKE '%/health-topics/%'"),"Article query must include condition guides");
assert(backend.includes("AND page_path NOT LIKE '%/health-topics/'"),"Article query must exclude the category index");
assert(backend.includes("ORDER BY referrals DESC,views DESC"),"Rank articles by outbound clicks");
assert(dashboard.includes('id="top-articles"'),"Dashboard must display the article referral table");
assert(dashboard.includes('renderProfiles("#top-articles",data.topArticles)'),"Dashboard must render article results");
assert(dashboard.includes('["Health article",r.page_path'),"CSV export must include article metrics");
assert(!/document\.cookie|localStorage/.test(backend),"Report must not track visitors");
console.log("PASS: Ratodero city attribution, article referral rankings, dashboard, CSV and privacy.");

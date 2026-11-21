/* Safe, deterministic completion of SEO/GEO markup on published SlashPromo pages.
   Only pages listed in sitemap.xml are eligible: dashboards, redirects and ad-only
   noindex pages are never touched. Existing valid tags and medical facts stay intact.
   --write: update local checkout files; default: dry-run. No publishing in this script. */
import {readFileSync,writeFileSync,existsSync} from "node:fs";
const BASE="https://slashpromo.com",write=process.argv.includes("--write");
const xml=readFileSync("sitemap.xml","utf8");
const urls=[...xml.matchAll(/<loc>(https:\/\/slashpromo\.com\/[^<]+)<\/loc>/g)].map(x=>x[1]);
const region={
  sukkur:["Sukkur","Sindh","PK-SD"],karachi:["Karachi","Sindh","PK-SD"],khairpur:["Khairpur","Sindh","PK-SD"],shikarpur:["Shikarpur","Sindh","PK-SD"],hyderabad:["Hyderabad","Sindh","PK-SD"],"pano-aqil":["Pano Aqil","Sindh","PK-SD"],ghotki:["Ghotki","Sindh","PK-SD"],ratodero:["Ratodero","Sindh","PK-SD"],larkana:["Larkana","Sindh","PK-SD"],ubauro:["Ubauro","Sindh","PK-SD"],"lakhi-ghulam-shah":["Lakhi Ghulam Shah","Sindh","PK-SD"],sobhodero:["Sobhodero","Sindh","PK-SD"],
  lahore:["Lahore","Punjab","PK-PB"],faisalabad:["Faisalabad","Punjab","PK-PB"],"fort-abbas":["Fort Abbas","Punjab","PK-PB"],"mian-channu":["Mian Channu","Punjab","PK-PB"],jhelum:["Jhelum","Punjab","PK-PB"],rawalpindi:["Rawalpindi","Punjab","PK-PB"],sheikhupura:["Sheikhupura","Punjab","PK-PB"],pakpattan:["Pakpattan","Punjab","PK-PB"],bahawalpur:["Bahawalpur","Punjab","PK-PB"],gojra:["Gojra","Punjab","PK-PB"],
  islamabad:["Islamabad","Islamabad Capital Territory","PK-IS"],quetta:["Quetta","Balochistan","PK-BA"],peshawar:["Peshawar","Khyber Pakhtunkhwa","PK-KP"],"dir-upper":["Upper Dir","Khyber Pakhtunkhwa","PK-KP"],wari:["Wari","Khyber Pakhtunkhwa","PK-KP"]
};
const entityRoots=new Set(["doctors","hospitals","clinics","laboratories"]);
const strip=s=>String(s||"").replace(/<[^>]*>/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&nbsp;/g," ").replace(/\s+/g," ").trim();
const enc=s=>String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const label=s=>s.split("-").map(t=>t.charAt(0).toUpperCase()+t.slice(1)).join(" ");
const stats={scanned:0,modified:0,geo:0,og:0,robots:0,twitter:0,schema:0,breadcrumb:0,skipped:0};
const changed=[];
for(const url of urls){
 const path=url.slice(BASE.length);
 const file=path==="/"?"index.html":path.slice(1)+"index.html";
 if(!existsSync(file))throw Error("Missing sitemap HTML file: "+file);
 let html=readFileSync(file,"utf8");
 if(/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html))
   throw Error("Refusing to modify a noindex page listed in sitemap: "+file);
 if(!html.includes("</head>"))throw Error("Missing closing head tag: "+file);
 const original=html,parts=path.split("/").filter(Boolean);
 const city=entityRoots.has(parts[0])?parts[1]:parts[0];
 const geo=region[city];
 let title=strip(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||"");
 let description=strip(html.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1]||"");
 const currentCanonical=html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1];
 if(currentCanonical&&currentCanonical!==url)throw Error("Canonical mismatch requiring review: "+file+" => "+currentCanonical);
 const add=[];const has=re=>re.test(html);
 const isUrdu=/<html\b[^>]*lang=["']ur(?:-PK)?["']/i.test(html);
 if(!title){
   title=strip(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||"")||"Healthcare information";
   title=title.slice(0,54)+" | SlashPromo";
   add.push("<title>"+enc(title)+"</title>");
 }
 if(!description){
   description="Explore "+title.replace(/\s*\|\s*SlashPromo.*/i,"")+" on SlashPromo, with published healthcare information and source links where available. Confirm provider details directly.";
   description=description.slice(0,175);
   add.push('<meta name="description" content="'+enc(description)+'">');
 }
 if(!currentCanonical)add.push('<link rel="canonical" href="'+enc(url)+'">');
 if(!has(/<meta\b[^>]*name=["']robots["']/i)){
   add.push('<meta name="robots" content="index,follow,max-image-preview:large">');stats.robots++;
 }
 if(!has(/<meta\b[^>]*property=["']og:locale["']/i))add.push('<meta property="og:locale" content="'+(isUrdu?"ur_PK":"en_PK")+'">');
 if(!has(/<meta\b[^>]*property=["']og:type["']/i))add.push('<meta property="og:type" content="'+(path.startsWith("/health-news/")&&path!=="/health-news/"?"article":"website")+'">');
 if(!has(/<meta\b[^>]*property=["']og:title["']/i)){add.push('<meta property="og:title" content="'+enc(title)+'">');stats.og++;}
 if(!has(/<meta\b[^>]*property=["']og:description["']/i)){add.push('<meta property="og:description" content="'+enc(description)+'">');stats.og++;}
 if(!has(/<meta\b[^>]*property=["']og:url["']/i))add.push('<meta property="og:url" content="'+enc(url)+'">');
 if(!has(/<meta\b[^>]*name=["']twitter:card["']/i)){add.push('<meta name="twitter:card" content="summary">');stats.twitter++;}
 if(geo){
   const place=geo[0]+", "+geo[1]+", Pakistan";
   if(!has(/<meta\b[^>]*name=["']geo\.region["']/i)){add.push('<meta name="geo.region" content="'+geo[2]+'">');stats.geo++;}
   if(!has(/<meta\b[^>]*name=["']geo\.placename["']/i)){add.push('<meta name="geo.placename" content="'+enc(place)+'">');stats.geo++;}
 }
 const hasSchema=has(/<script\b[^>]*type=["']application\/ld\+json["']/i);
 if(!hasSchema){
   const schema={"@context":"https://schema.org","@type":"WebPage","@id":url+"#webpage","url":url,"name":title,"description":description,"inLanguage":isUrdu?"ur-PK":"en-PK","isPartOf":{"@type":"WebSite","name":"SlashPromo","url":BASE+"/"}};
   if(geo)schema.spatialCoverage={"@type":"Place","name":geo[0]+", "+geo[1]+", Pakistan"};
   add.push('<script type="application/ld+json">'+JSON.stringify(schema).replaceAll("<","\\u003c")+'</script>');stats.schema++;
 }
 // Add breadcrumbs only where no published breadcrumb schema exists.
 // Parent nodes must be real local pages in the checkout (no invented paths).
 if(parts.length>1&&!/"@type"\s*:\s*"BreadcrumbList"/.test(html)){
   const crumbs=[{"@type":"ListItem","position":1,"name":"Home","item":BASE+"/"}];
   let prefix="";
   for(let i=0;i<parts.length-1;i++){
     prefix+="/"+parts[i];
     if(existsSync(prefix.slice(1)+"/index.html")){
       crumbs.push({"@type":"ListItem","position":crumbs.length+1,"name":label(parts[i]),"item":BASE+prefix+"/"});
     }
   }
   crumbs.push({"@type":"ListItem","position":crumbs.length+1,"name":strip(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||title).slice(0,120),"item":url});
   const schema={"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":crumbs};
   add.push('<script type="application/ld+json">'+JSON.stringify(schema).replaceAll("<","\\u003c")+'</script>');
   stats.breadcrumb++;
 }
 if(add.length)html=html.replace("</head>",add.join("\n")+"\n</head>");
 if(html!==original){
   changed.push(file);stats.modified++;
   if(write)writeFileSync(file,html);
 }
 stats.scanned++;
}
console.log((write?"SEO/GEO WRITTEN":"SEO/GEO DRY RUN")+" "+JSON.stringify(stats));
for(const f of changed.slice(0,70))console.log("UPDATED: "+f);
if(write&&changed.length)console.log("Changed files: "+changed.length+". Content facts and existing tags preserved.");

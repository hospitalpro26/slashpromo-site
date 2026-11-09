import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";

const source=readFileSync(new URL("../assets/location-personalization.js",import.meta.url),"utf8");
const directory=readFileSync(new URL("../assets/native-directory.js",import.meta.url),"utf8");
const site=readFileSync(new URL("../assets/site.js",import.meta.url),"utf8");
const privacy=readFileSync(new URL("../privacy/index.html",import.meta.url),"utf8");
assert(!/fetch\s*\(|sendBeacon|XMLHttpRequest/.test(source),"Location logic must not transmit coordinates.");
assert(site.includes('location-personalization.js'),"Shared site script must load location prompt.");
assert(site.includes('location-personalization.css'),"Shared site script must load prompt stylesheet.");
assert(directory.includes("slashpromo:city-preference"),"Directory must respond to explicit preference.");
assert(directory.includes("Remove location preference"),"Visitors need a way to clear a preference.");
assert(privacy.includes("Optional nearby doctor suggestions"),"Privacy disclosure must mention geolocation.");

function storage(){
  const values=new Map();
  return {
    getItem:key=>values.has(key)?values.get(key):null,
    setItem:(key,value)=>values.set(key,String(value)),
    removeItem:key=>values.delete(key),
    clear:()=>values.clear(),
    dump:()=>Object.fromEntries(values)
  };
}
function node(){
  const parts=new Map();
  return {
    hidden:false,disabled:false,textContent:"",innerHTML:"",style:{},
    handlers:new Map(),setAttribute(){},append(){},replaceChildren(){},
    remove(){this.removed=true},
    addEventListener(name,callback){this.handlers.set(name,callback)},
    querySelector(name){if(!parts.has(name))parts.set(name,node());return parts.get(name)},
    click(){const listener=this.handlers.get("click");assert(listener,"Expected interactive button");listener()}
  };
}
function browser(options={}){
  const local=storage(),session=storage(),events=[],boxes=[];
  let gpsCalls=0;
  function visit(path){
    let shown=null;
    const document={
      readyState:"complete",visibilityState:"visible",
      querySelector:name=>name===".site-header"?{}:null,
      getElementById:()=>null,
      createElement:()=>node(),
      body:{append(box){shown=box;boxes.push(box)}},
      addEventListener(){}
    };
    const window={
      isSecureContext:options.insecure!==true,
      dispatchEvent:evt=>events.push(evt)
    };
    const navigator={
      webdriver:false,
      geolocation:{
        getCurrentPosition(success,error){
          gpsCalls++;
          if(options.denied)error({code:1});
          else success({coords:{latitude:27.71,longitude:68.86,accuracy:1000}});
        }
      }
    };
    function CustomEvent(type,config){this.type=type;this.detail=config.detail}
    runInNewContext(source,{
      window,document,navigator,location:{pathname:path},
      localStorage:local,sessionStorage:session,CustomEvent,
      setTimeout:callback=>callback(),Date,Math,Number,JSON,Set,RegExp,encodeURIComponent
    });
    return shown;
  }
  return {visit,local,session,events,boxes,getGpsCalls:()=>gpsCalls};
}

const accepted=browser();
assert.equal(accepted.visit("/"),null,"First page must not interrupt");
assert.equal(accepted.visit("/"),null,"Refresh of same page must not count");
assert.equal(accepted.visit("/doctors/"),null,"Second page must not interrupt");
const prompt=accepted.visit("/sukkur/");
assert(prompt,"Third visited public page should show invitation");
assert.equal(accepted.getGpsCalls(),0,"No automatic permission request is allowed");
prompt.querySelector(".sp-location-allow").click();
assert.equal(accepted.getGpsCalls(),1,"Browser geolocation must require explicit click");
const city=JSON.parse(accepted.local.getItem("slashpromo_preferred_city_v1"));
assert.equal(city.city,"Sukkur");
assert(city.expires>Date.now(),"City preference needs an expiry.");
assert.equal(accepted.events.length,1,"Directory should update immediately.");
assert.equal(accepted.events[0].detail.city,"Sukkur");
assert(!JSON.stringify(accepted.local.dump()).includes("27.71"));
assert(!JSON.stringify(accepted.local.dump()).includes("68.86"));
assert.equal(accepted.visit("/khairpur/"),null,"Accepted users should not be reprompted.");

/* Count across new browser tabs. */
const crossTab=browser();
assert.equal(crossTab.visit("/"),null);
crossTab.session.clear();
assert.equal(crossTab.visit("/doctors/"),null);
crossTab.session.clear();
assert(crossTab.visit("/sukkur/"),"Third public page in a new tab must show invitation.");
assert.equal(crossTab.getGpsCalls(),0,"GPS must not run automatically.");
const reminder=JSON.parse(crossTab.local.getItem("slashpromo_location_prompt_v2"));
assert(reminder.until>Date.now()&&reminder.until<=Date.now()+86400000,
  "Ignored invitation cooldown must be one day, not 30 days.");

const declined=browser();
declined.visit("/");declined.visit("/doctors/");
const declinePrompt=declined.visit("/karachi/");
declinePrompt.querySelector(".sp-location-later").click();
assert.equal(declined.getGpsCalls(),0);
assert.equal(declined.visit("/sukkur/"),null,"Dismissed consent should not be repeatedly prompted.");

const denied=browser({denied:true});
denied.visit("/");denied.visit("/doctors/");
const deniedPrompt=denied.visit("/karachi/");
deniedPrompt.querySelector(".sp-location-allow").click();
assert.equal(denied.getGpsCalls(),1);
assert.equal(denied.local.getItem("slashpromo_preferred_city_v1"),null,"Denied location should not save a preference.");

const privatePages=browser();
privatePages.visit("/");privatePages.visit("/doctors/");
assert.equal(privatePages.visit("/control-center/"),null,"Admin/private pages must never show the prompt.");
assert.equal(privatePages.visit("/privacy/"),null,"Privacy policy must not trigger prompt.");

console.log("PASS: opt-in after public page browsing, no automatic geolocation, consent, dismissal, denial, privacy, and location opt-out.");

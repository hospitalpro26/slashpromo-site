const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});
const norm=s=>String(s||"").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
const aliases={
  "child specialist":"paediatrician","pediatrician":"paediatrician","pediatrics":"paediatrician","paediatrics":"paediatrician",
  "physicians":"physician","consultant physicians":"consultant physician","general physicians":"general physician",
  "surgeons":"surgeon","general surgeons":"general surgeon","laparoscopic surgeons":"laparoscopic surgeon",
  "panoaqil":"pano aqil","pano aqil":"pano aqil",
  "lady doctor":"female physician","chest specialist":"pulmonologist","lung specialist":"pulmonologist",
  "bone doctor":"orthopaedic","orthopedic":"orthopaedic","joint specialist":"rheumatologist",
  "skin specialist":"dermatologist","heart specialist":"cardiologist","stomach specialist":"gastroenterologist",
  "women doctor":"female physician","gynaecologist":"gynecologist","gynae":"gynecologist",
  "میڈیکل اسپیشلسٹ":"consultant physician","ماہر امراض باطنی":"consultant physician",
  "فزیشن":"physician","جنرل فزیشن":"general physician","لیڈی ڈاکٹر":"female physician",
  "بچوں کا ڈاکٹر":"paediatrician","بچوں کے ڈاکٹر":"paediatrician","ماہر اطفال":"paediatrician",
  "دل کا ڈاکٹر":"cardiologist","ماہر امراض قلب":"cardiologist","سینے کا ڈاکٹر":"pulmonologist",
  "پھیپھڑوں کا ڈاکٹر":"pulmonologist","ہڈیوں کا ڈاکٹر":"orthopaedic","جوڑوں کا ڈاکٹر":"rheumatologist",
  "جلد کا ڈاکٹر":"dermatologist","ماہر امراض جلد":"dermatologist",
  "ماہر امراض نسواں":"gynecologist","گائناکالوجسٹ":"gynecologist",
  "فزیوتھراپسٹ":"physiotherapist","فزیوتھراپی":"physiotherapist",
  "سرجن":"surgeon","جنرل سرجن":"general surgeon",
  "شوگر کا ڈاکٹر":"consultant physician","بلڈ پریشر کا ڈاکٹر":"consultant physician",
  "سکھر":"sukkur","رتوڈیرو":"ratodero","لاڑکانہ":"larkana",
  "کراچی":"karachi","لاہور":"lahore","خیرپور":"khairpur",
  "شکارپور":"shikarpur","گھوٹکی":"ghotki","حیدرآباد":"hyderabad",
  "پنو عاقل":"pano aqil","پنوعاقل":"pano aqil"
};
function expand(text){
  let value=" "+norm(text)+" ";
  for(const [a,b] of Object.entries(aliases).sort((x,y)=>y[0].length-x[0].length)){
    const from=norm(a),to=norm(b);
    value=value.replaceAll(" "+from+" "," "+to+" ");
  }
  return value.trim();
}
const STOP=new Set(["i","am","need","looking","for","a","an","the","find","best","good","doctor","doctors","specialist","in","near","at","me","who","is","available","please","want","clinic","hospital","physician","consultant","male","female","lady","of","from","and","my","with","show","recommend","can","you","help","sukkur","karachi"]);
function score(record,query,city){const name=norm(record.name),specialty=expand(record.specialty||record.category),hospital=norm(record.hospital||record.description),where=norm([record.city,...(record.cities||[])].join(" "));let score=0;
  if(city&&where.includes(city))score+=12;
  if(query.includes(name)&&name.length>5)score+=28;
  for(const token of query.split(" ").filter(t=>t.length>2&&!STOP.has(t))){if(name.includes(token))score+=5;if(specialty.includes(token))score+=8;if(hospital.includes(token))score+=2;}
  return score;
}

/* A specialty is a hard constraint. Shared words like "general" must not
   make a general surgeon a match for a general physician. */
const SPECIALTY_RULES=[
  {terms:/\b(paediatric surgeon|pediatric surgeon|child surgeon)\b/,test:/\b(paediatric|pediatric|child)\b.*\bsurgeon\b/},
  {terms:/\b(general physician|family physician|family medicine|primary care)\b/,test:/\b(general physician|family physician|family medicine|general practitioner)\b/},
  {terms:/\b(consultant physician)\b/,test:/\b(consultant physician|internal medicine specialist)\b/},
  {terms:/\b(internal medicine|medicine specialist)\b/,test:/\b(consultant physician|internal medicine|medicine specialist)\b/},
  {terms:/\b(physician|medical doctor)\b/,test:/\b(consultant physician|general physician|family physician|internal medicine|general practitioner)\b/},
  {terms:/\b(paediatrician|pediatrician|child specialist)\b/,test:/\b(paediatrician|pediatrician|paediatric|pediatric)\b/},
  {terms:/\b(physiotherapist|physiotherapy|physical therapist)\b/,test:/\b(physiotherap|physical therap|rehabilitation)\b/},
  {terms:/\b(rheumatolog|joint specialist)\w*/,test:/\brheumatolog\w*/},
  {terms:/\b(pulmonolog|chest specialist|lung specialist)\w*/,test:/\b(pulmonolog|chest specialist)\w*/},
  {terms:/\b(cardiolog|heart specialist)\w*/,test:/\b(cardiolog|heart specialist)\w*/},
  {terms:/\b(gastroenterolog|stomach specialist)\w*/,test:/\bgastroenterolog\w*/},
  {terms:/\b(dermatolog|skin specialist)\w*/,test:/\bdermatolog\w*/},
  {terms:/\b(gynecolog|obstetrician|gynaecolog)\w*/,test:/\b(gynecolog|gynaecolog|obstetric)\w*/},
  {terms:/\b(urolog)\w*/,test:/\burolog\w*/},
  {terms:/\b(neurosurgeon)\b/,test:/\bneurosurgeon\b/},
  {terms:/\b(orthopaedic|orthopedic)\w*/,test:/\b(orthopaedic|orthopedic)\w*/},
  {terms:/\b(general surgeon|general surgery|laparoscopic surgeon)\b/,test:/\b(general|laparoscopic)\b.*\bsurgeon\b|\bgeneral surgery\b/},
  {terms:/\b(surgeon|surgery|laparoscopic)\b/,test:/\b(surgeon|surgery|laparoscopic)\b/},
  {terms:/\b(ent|otolaryngolog)\w*/,test:/\b(ent|otolaryngolog)\w*/},
  {terms:/\b(dentist|dental)\b/,test:/\b(dentist|dental|orthodont)\w*/}
];
function specialtyRule(question){const q=expand(question);return SPECIALTY_RULES.find(rule=>rule.terms.test(q))||null}
function specialtyMatches(record,rule){return !rule||record.kind==="doctor"&&rule.test.test(expand(record.specialty||""))}
function femaleRequested(question){return /\b(female|lady|woman|women)\b/.test(expand(question))}

function safeResult(r){return {name:r.name,city:r.city,specialty:r.specialty||r.category||"Healthcare facility",hospital:r.hospital||"",url:r.url,slashcureUrl:r.externalProfile||""}}
export async function onRequestPost(ctx){
  const req=ctx.request;
  if(req.headers.get("content-type")?.split(";")[0]!=="application/json")return json({error:"Send JSON."},415);
  const origin=req.headers.get("origin");
  if(origin&&origin!==new URL(req.url).origin)return json({error:"Invalid origin."},403);
  let input;try{input=await req.json()}catch{return json({error:"Invalid request."},400)}
  const question=String(input?.question||"").trim();
  if(question.length<5||question.length>240)return json({error:"Enter a search of 5–240 characters."},400);
  if(/\b(suicid|self.harm|overdos|chest pain|stroke|unconscious|bleeding heavily)\b/i.test(question))
    return json({urgent:true,message:"If this may be an emergency, seek immediate medical care or local emergency assistance. This directory cannot assess emergencies.",results:[]});
  let directory;
  try{const response=await ctx.env.ASSETS.fetch(new Request(new URL("/assets/directory.json",req.url)));if(!response.ok)throw Error();directory=await response.json()}
  catch{return json({error:"Directory is temporarily unavailable."},503)}
  const records=[...(directory.doctors||[]),...(directory.hospitals||[])].filter(r=>r&&r.name&&r.url&&String(r.url).startsWith("/"));
  let interpretation=expand(question),explanation="";
  const cities=[...new Set(records.flatMap(r=>[r.city,...(r.cities||[])].filter(Boolean)))];
  const mentionedCity=text=>{
    const normalized=" "+norm(text)+" ";
    return cities.find(c=>normalized.includes(" "+norm(c)+" "))||"";
  };
  let city=mentionedCity(expand(question));
  let aiUsed=false;
  if(ctx.env.AI&&ctx.env.AI_DISCOVERY_ENABLED==="true"){
    try{
      const response=await ctx.env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast",{messages:[
        {role:"system",content:"You classify healthcare provider directory searches, never diagnose. Respond with ONLY a JSON object with strings query and city. Rewrite the user input as concise English specialist or doctor search keywords, preserving doctor names. City must be one of the provided city names or empty. Do not invent providers or give medical advice. Cities: "+cities.join(", ")},
        {role:"user",content:question}
      ],max_tokens:140,temperature:0});
      const raw=String(response?.response||"").replace(/^```(?:json)?|\s*```$/g,"").trim();const parsed=JSON.parse(raw);
      if(typeof parsed.query==="string"&&parsed.query.length<150)interpretation=expand(parsed.query);
      if(typeof parsed.city==="string"&&cities.some(c=>norm(c)===norm(parsed.city)))city=norm(parsed.city);
      aiUsed=true;
    }catch{ /* Deterministic directory lookup remains available when inference fails. */ }
  }
  // Never allow an AI paraphrase to discard an explicit specialty or city.
  const rule=specialtyRule(question)||specialtyRule(interpretation);
  // Only explicitly reviewed gender fields can satisfy a gender-specific request.
  const needFemale=femaleRequested(question);
  const originalCity=mentionedCity(expand(question));
  if(originalCity)city=originalCity;
  const place=norm(city),query=norm(interpretation);
  const searchTerms=(" "+query+" ").replace(" "+place+" "," ").trim().split(" ").filter(t=>t.length>2&&!STOP.has(t));
  const cityOnly=Boolean(place)&&searchTerms.length===0;
  const ranked=records.map(r=>({r,points:score(r,query,place),cityMatch:!place||norm([r.city,...(r.cities||[])].join(" ")).includes(place)}))
    .filter(x=>(Boolean(rule)||cityOnly||x.points>(place?12:0))&&x.cityMatch&&specialtyMatches(x.r,rule)&&(!needFemale||x.r.gender==="female"))
    .sort((a,b)=>b.points-a.points||a.r.name.localeCompare(b.r.name)).slice(0,8);
  const results=ranked.map(x=>safeResult(x.r));
  explanation=results.length?("Found "+results.length+" matching listed provider"+(results.length===1?"":"s")+(place?" in "+city:"")+". Check the linked profile for the latest details."):(needFemale?"No female provider with reviewed gender information matches this specialty and city in the current directory. Try another city or check the full doctor directory.":"No matching directory listing was found for this specialty and city. Try a different city or specialty.");
  return json({message:explanation,results,aiUsed,note:"Directory discovery only. Not a diagnosis or professional recommendation. Clinic schedules and credentials should be checked with the provider. Results come only from Slashpromo's existing directory."});
}

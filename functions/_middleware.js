/* Automatic kitchen analytics injection, scoped by _routes.json.
   All other static pages bypass Pages Functions and retain free static delivery. */
const FOOD_PAGE=/^\/[a-z0-9-]+\/local-food\/(?:[a-z0-9-]+\/)*$/;
export async function onRequest({request,next}){
  if(request.method!=="GET"||!FOOD_PAGE.test(new URL(request.url).pathname))return next();
  const response=await next();
  if(response.status!==200||!/^text\/html\b/i.test(response.headers.get("content-type")||""))return response;
  return new HTMLRewriter().on("body",{
    element(element){element.append('<script defer src="/assets/kitchen-analytics.js"></script>',{html:true})}
  }).transform(response);
}

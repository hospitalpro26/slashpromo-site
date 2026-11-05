import {authenticate} from "../../_lib/auth.js";
export async function onRequest(context){
 const a=await authenticate(context);if(a.response)return a.response;
 context.data.adminEmail=a.email;return context.next();
}
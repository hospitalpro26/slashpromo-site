package com.slashpromo.app;
import android.app.Activity;
import android.os.Bundle;
import android.text.InputType;
import android.view.WindowManager;
import android.widget.*;
import org.json.JSONObject;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;

public class AccountPreviewActivity extends Activity {
 private LinearLayout body;
 private AccountClient client;
 private final ExecutorService worker=Executors.newSingleThreadExecutor();
 private int generation=0;
 private boolean foreground=false, googleWaiting=false, googleSubmitting=false;
 private String pendingGoogleResult;
 private final android.os.Handler mainHandler=new android.os.Handler(android.os.Looper.getMainLooper());
 private void googleResult(TextView status,String message){
  status.setText(message);pendingGoogleResult=message;showGoogleResult();
 }
 private void showGoogleResult(){
  if(!foreground||pendingGoogleResult==null||isFinishing()||isDestroyed())return;
  String message=pendingGoogleResult;pendingGoogleResult=null;
  new android.app.AlertDialog.Builder(this).setTitle("Google sign-in result").setMessage(message).setPositiveButton("OK",null).show();
 }
 @Override protected void onResume(){super.onResume();foreground=true;mainHandler.post(this::showGoogleResult);}
 @Override protected void onPause(){foreground=false;super.onPause();}
 @Override protected void onSaveInstanceState(Bundle out){out.putBoolean("google_interrupted",googleWaiting||googleSubmitting);super.onSaveInstanceState(out);}

 private static final String GOOGLE_CLIENT_ID="166627999058-jhqsuk4urhlalnlcrhh98djdoh0lui5l.apps.googleusercontent.com"; // public web OAuth client ID, provision before enabling
 private android.os.CancellationSignal googleCancel;
 private int dp(int n){return Math.round(n*getResources().getDisplayMetrics().density);}
 private void label(String s,int size){TextView t=new TextView(this);t.setText(s);t.setTextSize(size);body.addView(t);}
 private EditText field(String hint,int type){EditText e=new EditText(this);e.setHint(hint);e.setInputType(type);e.setSaveEnabled(false);e.setImportantForAutofill(android.view.View.IMPORTANT_FOR_AUTOFILL_NO);body.addView(e);return e;}
 private Button button(String s,Runnable r){Button b=new Button(this);b.setText(s);b.setAllCaps(false);b.setOnClickListener(v->r.run());body.addView(b);return b;}
 private JSONObject data(Object... pairs){JSONObject o=new JSONObject();try{for(int i=0;i<pairs.length;i+=2)o.put((String)pairs[i],pairs[i+1]);}catch(Exception e){throw new IllegalArgumentException(e);}return o;}
 private String value(EditText e){return e.getText().toString();}
 private void call(Button b,TextView status,String path,JSONObject payload,boolean authenticated){
  b.setEnabled(false);status.setText("Connecting…");int version=generation;if(path.equals("/v1/google/login"))googleSubmitting=true;
  worker.execute(()->{
   String message;
   try{
    String token=authenticated?client.session():"";
    AccountClient.Result r=client.request(path,payload,token);
    if(r.ok()&&(path.equals("/v1/login")||path.equals("/v1/google/login"))&&r.body.has("token")){client.saveSession(r.body.getString("token"));message="Signed in. Open Membership to check your status.";}
    else if(r.ok()&&path.equals("/v1/me")){JSONObject a=r.body.getJSONObject("account");message="Membership: "+r.body.optString("membership")+"\nTrial ends: "+a.optString("trial_until")+"\nPaid until: "+a.optString("paid_until");}
    else if(r.ok()&&path.equals("/v1/logout")){client.clearSession();message="Signed out.";}
    else{if(authenticated&&r.status==401)client.clearSession();message=r.body.optString(r.ok()?"message":"error",r.ok()?"Request completed":"Request failed");}
   }catch(Exception e){message="Account service unavailable. Your library is unchanged.";}
   final String result=message;runOnUiThread(()->{if(!isFinishing()&&!isDestroyed()&&generation==version){if(path.equals("/v1/google/login")){googleSubmitting=false;googleResult(status,result);}else status.setText(result);b.setEnabled(AccountClient.ENABLED);}});
  });
 }
 private void screen(String mode){
  generation++;googleWaiting=false;googleSubmitting=false;if(googleCancel!=null)googleCancel.cancel();pendingGoogleResult=null;ScrollView sc=new ScrollView(this);body=new LinearLayout(this);body.setOrientation(1);body.setPadding(dp(20),dp(24),dp(20),dp(24));sc.addView(body);setContentView(sc);sc.setOnApplyWindowInsetsListener((view,insets)->{view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});sc.requestApplyInsets();
  label("Slashview",32);label("Read. Learn. Explore.",16);label(mode,24);
  if(!AccountClient.ENABLED)label("Design preview only. Do not enter real credentials. Nothing is submitted.",16);
  label("Your books, notes and highlights remain on this device.",14);
  int emailType=InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS;
  int passType=InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD;
  TextView status=new TextView(this);status.setTextSize(16);status.setAccessibilityLiveRegion(android.view.View.ACCESSIBILITY_LIVE_REGION_POLITE);status.setPadding(0,dp(8),0,dp(8));body.addView(status);
  if(mode.equals("Membership")){
   Button check=button("Check membership",()->{});check.setOnClickListener(v->call(check,status,"/v1/me",null,true));check.setEnabled(AccountClient.ENABLED);
   Button logout=button("Sign out",()->{});logout.setOnClickListener(v->call(logout,status,"/v1/logout",data(),true));logout.setEnabled(AccountClient.ENABLED);
  }else if(mode.equals("Register")){
   EditText name=field("Full name",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PERSON_NAME),email=field("Email address",emailType),password=field("Password (12–128 characters)",passType),confirm=field("Confirm password",passType);
   EditText city=field("City *",InputType.TYPE_CLASS_TEXT),address=field("Address (optional)",InputType.TYPE_CLASS_TEXT),whatsapp=field("WhatsApp (optional)",InputType.TYPE_CLASS_PHONE);
   label("Profile details are submitted to Slashview for account administration. Address and WhatsApp are optional.",14);
   label("Email verification and administrator approval are required. Three calendar months free after approval, then USD $1 per month. No automatic payment.",16);
   CheckBox[] consent=new CheckBox[3];String[] labels={"I accept the Terms of Service","I acknowledge the Privacy Policy","I accept the trial and monthly renewal terms"};
   for(int i=0;i<3;i++){consent[i]=new CheckBox(this);consent[i].setText(labels[i]);consent[i].setSaveEnabled(false);body.addView(consent[i]);}
   Button b=button("Request registration",()->{});b.setEnabled(AccountClient.ENABLED);b.setOnClickListener(v->{String p=value(password);if(value(name).trim().isEmpty()||value(city).trim().isEmpty()){status.setText("Enter your full name and city.");return;}if(p.length()<12||p.length()>128||!p.equals(value(confirm))||!consent[0].isChecked()||!consent[1].isChecked()||!consent[2].isChecked()){status.setText("Confirm password and accept all required terms.");return;}call(b,status,"/v1/register",data("name",value(name),"email",value(email),"password",p,"city",value(city),"address",value(address),"whatsapp",value(whatsapp),"termsAccepted",true,"privacyAcknowledged",true,"pricingAccepted",true,"policyVersion","review-1"),false);password.setText("");confirm.setText("");});
  }else if(mode.equals("Verify email")||mode.equals("Reset password")){
   boolean reset=mode.equals("Reset password");String prefix=reset?"/v1/recovery":"/v1/verification";
   EditText email=field("Email address",emailType);Button send=button("Request email code",()->{});send.setEnabled(AccountClient.ENABLED);send.setOnClickListener(v->call(send,status,prefix+"/request",data("email",value(email)),false));
   EditText code=field("Code received by email",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS);EditText password=reset?field("New password",passType):null;
   Button confirm=button(reset?"Reset password":"Verify email",()->{});confirm.setEnabled(AccountClient.ENABLED);confirm.setOnClickListener(v->{call(confirm,status,prefix+"/confirm",reset?data("code",value(code).trim(),"password",value(password)):data("code",value(code).trim()),false);code.setText("");if(password!=null)password.setText("");});
  }else{
   EditText email=field("Email address",emailType),password=field("Password",passType);
   Button b=button("Sign in",()->{});b.setEnabled(AccountClient.ENABLED);b.setOnClickListener(v->{call(b,status,"/v1/login",data("email",value(email),"password",value(password),"deviceId",client.deviceId()),false);password.setText("");});
   Button google=button("Continue with Google",()->{});google.setEnabled(AccountClient.ENABLED&&!GOOGLE_CLIENT_ID.isEmpty());google.setOnClickListener(v->googleSignIn(google,status));
   label("Google sign-in testing is available. New online registrations and email verification are not yet open.",14);
  }
  button("Register",()->screen("Register"));button("Sign in",()->screen("Sign in"));button("Verify email",()->screen("Verify email"));button("Forgot password",()->screen("Reset password"));button("Membership",()->screen("Membership"));button("Help & Support",()->startActivity(new android.content.Intent(this,SupportActivity.class)));button("Return to library",this::finish);
 }
 private void googleSignIn(Button button,TextView status){
  if(!AccountClient.ENABLED||GOOGLE_CLIENT_ID.isEmpty())return;
  LinearLayout profile=new LinearLayout(this);profile.setOrientation(1);profile.setPadding(dp(20),0,dp(20),0);
  EditText city=new EditText(this),address=new EditText(this),whatsapp=new EditText(this);city.setHint("City (required for new accounts)");address.setHint("Address (optional)");whatsapp.setHint("WhatsApp (optional)");whatsapp.setInputType(InputType.TYPE_CLASS_PHONE);profile.addView(city);profile.addView(address);profile.addView(whatsapp);
  new android.app.AlertDialog.Builder(this).setTitle("Google account and membership").setView(profile)
   .setMessage("Review the published Terms of Service and Privacy Policy before continuing. New accounts require approval, then three free calendar months and USD $1 monthly manual renewal. No automatic charges. Accept all three to continue.")
   .setNegativeButton("Cancel",null).setPositiveButton("Accept and continue",(dialog,which)->{
    button.setEnabled(false);int version=generation;status.setText("Contacting Slashview…");
    worker.execute(()->{try{
     AccountClient.Result r=client.request("/v1/google/nonce",data(),"");
     if(!r.ok()){final String message="Google service: "+r.body.optString("error","Request failed")+" (HTTP "+r.status+")";runOnUiThread(()->{if(!isDestroyed()&&generation==version){googleResult(status,message);button.setEnabled(true);}});return;}String nonce=r.body.getString("nonce");
     runOnUiThread(()->{if(isDestroyed()||isFinishing()||generation!=version)return;
      try{
       googleCancel=new android.os.CancellationSignal();googleWaiting=true;status.setText("Choose your Google account…");
       final android.os.CancellationSignal attempt=googleCancel;
       mainHandler.postDelayed(()->{if(googleWaiting&&googleCancel==attempt&&generation==version&&!isDestroyed()){
        googleWaiting=false;attempt.cancel();button.setEnabled(true);googleResult(status,"Google did not finish signing in. Please try again. Your library is unchanged.");
       }},120000);

       com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption option=new com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption.Builder(GOOGLE_CLIENT_ID).setNonce(nonce).build();
       androidx.credentials.GetCredentialRequest request=new androidx.credentials.GetCredentialRequest.Builder().addCredentialOption(option).build();
       androidx.credentials.CredentialManager.create(this).getCredentialAsync(this,request,googleCancel,getMainExecutorCompat(),new androidx.credentials.CredentialManagerCallback<androidx.credentials.GetCredentialResponse,androidx.credentials.exceptions.GetCredentialException>(){
        public void onResult(androidx.credentials.GetCredentialResponse response){
         if(isDestroyed()||isFinishing()||generation!=version||!googleWaiting)return;
         googleWaiting=false;status.setText("Google account selected. Verifying with Slashview…");
         try{androidx.credentials.Credential credential=response.getCredential();
          if(!(credential instanceof androidx.credentials.CustomCredential))throw new Exception();
          String type=credential.getType();
          if(!com.google.android.libraries.identity.googleid.GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(type))throw new Exception();
          String idToken=com.google.android.libraries.identity.googleid.GoogleIdTokenCredential.createFrom(credential.getData()).getIdToken();
          call(button,status,"/v1/google/login",data("idToken",idToken,"city",value(city),"address",value(address),"whatsapp",value(whatsapp),"deviceId",client.deviceId(),"termsAccepted",true,"privacyAcknowledged",true,"pricingAccepted",true,"policyVersion","review-1"),false);
         }catch(Exception e){googleResult(status,"Google returned an unreadable credential. Please update Google Play services and try again.");button.setEnabled(true);}
        }
        public void onError(androidx.credentials.exceptions.GetCredentialException error){if(!isDestroyed()&&generation==version&&googleWaiting){googleWaiting=false;googleResult(status,error instanceof androidx.credentials.exceptions.GetCredentialCancellationException?"Google sign-in cancelled.":error instanceof androidx.credentials.exceptions.NoCredentialException?"No eligible Google account found. Check Google Play services and your Google account.":"Google sign-in provider error: "+error.getClass().getSimpleName());button.setEnabled(true);}}
       });
      }catch(Exception e){googleWaiting=false;googleResult(status,"Google sign-in could not complete. Check your connection and Google Play services, then try again.");button.setEnabled(true);}
     });
    }catch(Exception e){runOnUiThread(()->{if(!isDestroyed()&&generation==version){googleWaiting=false;googleResult(status,"Google sign-in could not complete. Check your connection and Google Play services, then try again.");button.setEnabled(true);}});}});
   }).show();
 }
 private java.util.concurrent.Executor getMainExecutorCompat(){return command->runOnUiThread(command);}
 @Override public void onCreate(Bundle b){super.onCreate(b);client=new AccountClient(this);getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);screen("Sign in");if(b!=null&&b.getBoolean("google_interrupted"))pendingGoogleResult="Android restarted the sign-in screen. Please select your Google account again. Your library is unchanged.";}
 @Override protected void onDestroy(){generation++;googleWaiting=false;mainHandler.removeCallbacksAndMessages(null);if(googleCancel!=null)googleCancel.cancel();worker.shutdown();super.onDestroy();}
}

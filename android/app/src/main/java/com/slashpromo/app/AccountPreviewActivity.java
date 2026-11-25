package com.slashpromo.app;
import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.text.InputType;
import android.view.WindowManager;
import android.widget.*;
public class AccountPreviewActivity extends Activity {
 private LinearLayout body;
 private int dp(int n){return Math.round(n*getResources().getDisplayMetrics().density);}
 private void label(String s,int size){TextView t=new TextView(this);t.setText(s);t.setTextSize(size);body.addView(t);}
 private void field(String hint,int type){EditText e=new EditText(this);e.setHint(hint);e.setInputType(type);e.setSaveEnabled(false);e.setAutofillHints((String[])null);body.addView(e);}
 private void button(String s,Runnable r){Button b=new Button(this);b.setText(s);b.setAllCaps(false);b.setOnClickListener(v->r.run());body.addView(b);}
 private void screen(String mode){
 ScrollView sc=new ScrollView(this);body=new LinearLayout(this);body.setOrientation(1);body.setPadding(dp(20),dp(24),dp(20),dp(24));sc.addView(body);setContentView(sc);
 label("Slashview",32);label("Read. Learn. Explore.",16);label(mode,24);label("Design preview only. Do not enter real credentials. Nothing is submitted or saved.",16);
 if(mode.equals("Register"))field("Full name",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PERSON_NAME);
 field("Email address",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
 if(!mode.equals("Reset password"))field("Password",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD);
 if(mode.equals("Register")){field("Confirm password",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD);label("Administrator approval and email verification required. Three-month trial starts after approval.",16);}
 Button submit=new Button(this);submit.setText("Unavailable in preview");submit.setEnabled(false);body.addView(submit);
 Button google=new Button(this);google.setText("Continue with Google (setup pending)");google.setAllCaps(false);google.setEnabled(false);body.addView(google);
 button("Register",()->screen("Register"));button("Sign in",()->screen("Sign in"));button("Forgot password",()->screen("Reset password"));button("Help & Support",()->startActivity(new android.content.Intent(this,SupportActivity.class)));button("Return to library",this::finish);
 }
 @Override public void onCreate(Bundle b){super.onCreate(b);getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);screen("Sign in");}
}

package com.slashpromo.app;
import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.net.Uri;
import android.widget.*;
public class SupportActivity extends Activity {
 public static final String EMAIL="slashviewofficial@gmail.com";
 private LinearLayout body;
 private int dp(int n){return Math.round(n*getResources().getDisplayMetrics().density);}
 private void label(String s,int size){TextView t=new TextView(this);t.setText(s);t.setTextSize(size);t.setPadding(0,dp(6),0,dp(6));body.addView(t);}
 private void button(String s,Runnable action){Button b=new Button(this);b.setText(s);b.setAllCaps(false);b.setOnClickListener(v->action.run());body.addView(b);}
 private void email(String subject){
  Intent i=new Intent(Intent.ACTION_SENDTO,Uri.parse("mailto:"+EMAIL));i.putExtra(Intent.EXTRA_SUBJECT,subject);
  try{startActivity(i);}catch(android.content.ActivityNotFoundException e){Toast.makeText(this,"No email app available. Copy the support address instead.",Toast.LENGTH_LONG).show();}
 }
 @Override public void onCreate(Bundle b){super.onCreate(b);
  ScrollView sc=new ScrollView(this);body=new LinearLayout(this);body.setOrientation(1);body.setPadding(dp(20),dp(24),dp(20),dp(24));sc.addView(body);setContentView(sc);
  body.setOnApplyWindowInsetsListener((v,insets)->{body.setPadding(dp(20)+insets.getSystemWindowInsetLeft(),dp(24)+insets.getSystemWindowInsetTop(),dp(20)+insets.getSystemWindowInsetRight(),dp(24)+insets.getSystemWindowInsetBottom());return insets;});body.requestApplyInsets();
  label("Slashview • Help & Support",25);label("Read. Learn. Explore.",16);label(EMAIL,18);
  button("Copy support email",()->{android.content.ClipboardManager c=(android.content.ClipboardManager)getSystemService(CLIPBOARD_SERVICE);c.setPrimaryClip(android.content.ClipData.newPlainText("Slashview support",EMAIL));Toast.makeText(this,"Email copied",Toast.LENGTH_SHORT).show();});
  button("Contact Slashview Team",()->email("Slashview support"));
  button("Report a technical problem",()->email("Slashview technical support"));
  button("Account and subscription enquiries",()->email("Slashview account enquiry"));
  button("Privacy or account deletion request",()->email("Slashview privacy request"));
  label("Privacy information",22);
  label("Your imported books, scans, notes, highlights and bookmarks are stored locally on your device. AI requests may send selected excerpts and prompts to the chosen AI provider only after your permission. Do not submit patient-identifiable information. Support emails are voluntary; do not include passwords, API keys or private documents.",16);
  label("Account registration and subscriptions are not active yet. Future account services will require limited account information and separate terms and privacy disclosures.",16);
  label("AI study output is educational and may be inaccurate. Verify it against reliable sources.",16);
  button("Return to library",this::finish);
 }
}

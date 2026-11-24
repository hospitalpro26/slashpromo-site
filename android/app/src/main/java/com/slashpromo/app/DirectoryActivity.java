package com.slashpromo.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.view.View;
import android.widget.*;
import android.text.TextWatcher;
import android.text.Editable;
import org.json.*;
import java.net.*;
import java.io.*;
import java.util.*;

public final class DirectoryActivity extends Activity {
    private static final String BASE="https://slashpromo.com";
    private static final int BLUE=0xff1954a6, NAVY=0xff123c78, INK=0xff183654, BG=0xfff2f6fc;
    private LinearLayout root,body,nav,results;
    private EditText search;
    private Spinner city,specialty;
    private JSONArray doctors=new JSONArray(), hospitals=new JSONArray();
    private boolean loaded=false,loading=false;
    private String screen="home", query="", selectedCity="All cities", selectedSpecialty="All specialties";
    private int limit=30;
    private int dp(int n){return Math.round(n*getResources().getDisplayMetrics().density);}
    private LinearLayout column(){LinearLayout l=new LinearLayout(this);l.setOrientation(LinearLayout.VERTICAL);return l;}
    private GradientDrawable bg(int c,int r){GradientDrawable d=new GradientDrawable();d.setColor(c);d.setCornerRadius(dp(r));return d;}
    private TextView text(String s,int size,int color,boolean bold){TextView t=new TextView(this);t.setText(s);t.setTextSize(size);t.setTextColor(color);if(bold)t.setTypeface(null,Typeface.BOLD);return t;}
    private void add(LinearLayout p,View v,int margin){LinearLayout.LayoutParams a=new LinearLayout.LayoutParams(-1,-2);a.bottomMargin=dp(margin);p.addView(v,a);}
    private TextView action(String s,Runnable f){TextView t=text(s,15,BLUE,true);t.setPadding(dp(12),dp(13),dp(12),dp(13));t.setGravity(android.view.Gravity.CENTER);t.setBackground(bg(Color.WHITE,12));t.setOnClickListener(v->f.run());return t;}
    private LinearLayout card(){LinearLayout l=column();l.setPadding(dp(16),dp(14),dp(16),dp(14));l.setBackground(bg(Color.WHITE,14));return l;}
    @Override public void onCreate(Bundle state){super.onCreate(state);root=column();root.setBackgroundColor(BG);root.setFitsSystemWindows(true);getWindow().setStatusBarColor(NAVY);getWindow().setNavigationBarColor(NAVY);
        LinearLayout header=column();header.setPadding(dp(18),dp(12),dp(18),dp(12));header.setBackgroundColor(Color.WHITE);TextView brand=text("SlashPromo",25,BLUE,true);android.text.SpannableString word=new android.text.SpannableString("SlashPromo");word.setSpan(new android.text.style.ForegroundColorSpan(0xffc33c51),5,10,0);brand.setText(word);header.addView(brand);header.addView(text("Explore Pakistan",14,INK,false));root.addView(header);
        ScrollView scroll=new ScrollView(this);scroll.setFillViewport(true);body=column();body.setPadding(dp(16),dp(14),dp(16),dp(16));scroll.addView(body);root.addView(scroll,new LinearLayout.LayoutParams(-1,0,1));nav=new LinearLayout(this);nav.setBackgroundColor(Color.WHITE);root.addView(nav);setContentView(root);showHome();fetchDirectory();}
    private void medicalIcon(TextView t,String name,int size,int color){
        android.graphics.drawable.Drawable icon=new android.graphics.drawable.Drawable(){
            final android.graphics.Paint p=new android.graphics.Paint(3);
            void line(android.graphics.Canvas c,float x,float y,float a,float b){c.drawLine(x,y,a,b,p);}
            @Override public void draw(android.graphics.Canvas c){c.save();c.translate(getBounds().left,getBounds().top);c.scale(getBounds().width()/24f,getBounds().height()/24f);p.setColor(color);p.setStyle(android.graphics.Paint.Style.STROKE);p.setStrokeWidth(1.8f);p.setStrokeCap(android.graphics.Paint.Cap.ROUND);p.setStrokeJoin(android.graphics.Paint.Join.ROUND);
                switch(name){
                    case "Doctors": c.drawArc(3,3,15,15,0,180,false,p);line(c,3,9,3,4);line(c,15,9,15,4);c.drawArc(9,10,21,22,0,180,false,p);line(c,9,15,9,16);line(c,21,16,21,9);c.drawCircle(21,6,2.5f,p);break;
                    case "Hospitals": c.drawRoundRect(4,3,20,21,2,2,p);line(c,9,9,15,9);line(c,12,6,12,12);c.drawRect(9,16,15,21,p);break;
                    case "Laboratories": line(c,9,3,15,3);line(c,10,3,10,10);line(c,14,3,14,10);android.graphics.Path flask=new android.graphics.Path();flask.moveTo(10,10);flask.lineTo(4,19);flask.quadTo(3,21,6,21);flask.lineTo(18,21);flask.quadTo(21,21,20,19);flask.lineTo(14,10);c.drawPath(flask,p);line(c,7,16,17,16);break;
                    case "Health guides": c.drawRoundRect(3,4,21,20,2,2,p);line(c,12,4,12,20);line(c,5,9,9,9);line(c,15,9,19,9);break;
                    case "Health news": c.drawRoundRect(3,4,21,20,2,2,p);c.drawRect(6,7,10,12,p);line(c,13,8,18,8);line(c,13,12,18,12);line(c,6,16,18,16);break;
                    case "Local food": c.drawArc(3,7,21,22,0,180,false,p);line(c,3,14,21,14);line(c,8,7,8,3);line(c,12,7,12,3);line(c,16,7,16,3);break;
                    case "Cities": c.drawCircle(12,9,5,p);android.graphics.Path pin=new android.graphics.Path();pin.moveTo(6,10);pin.quadTo(6,15,12,21);pin.quadTo(18,15,18,10);c.drawPath(pin,p);c.drawCircle(12,9,1.5f,p);break;
                    case "Ask a question": c.drawRoundRect(3,3,21,17,3,3,p);line(c,7,17,7,22);line(c,7,22,12,17);c.drawArc(9,6,15,12,180,270,false,p);line(c,12,12,12,13);c.drawPoint(12,15,p);break;
                    case "Home": {android.graphics.Path h=new android.graphics.Path();h.moveTo(2,11);h.lineTo(12,3);h.lineTo(22,11);h.moveTo(5,10);h.lineTo(5,21);h.lineTo(19,21);h.lineTo(19,10);c.drawPath(h,p);c.drawRect(10,15,14,21,p);break;}
                    case "Saved": {android.graphics.Path h=new android.graphics.Path();h.moveTo(12,21);h.cubicTo(-5,10,5,-1,12,8);h.cubicTo(19,-1,29,10,12,21);c.drawPath(h,p);break;}
                    default: c.drawCircle(5,12,1,p);c.drawCircle(12,12,1,p);c.drawCircle(19,12,1,p);
                }c.restore();}
            @Override public void setAlpha(int a){p.setAlpha(a);}
            @Override public void setColorFilter(android.graphics.ColorFilter f){p.setColorFilter(f);}
            @Override public int getOpacity(){return android.graphics.PixelFormat.TRANSLUCENT;}
        };
        icon.setBounds(0,0,dp(size),dp(size));t.setCompoundDrawables(null,icon,null,null);t.setCompoundDrawablePadding(dp(4));t.setPadding(dp(4),dp(7),dp(4),dp(7));t.setGravity(android.view.Gravity.CENTER);
    }
    private void navigation(){nav.removeAllViews();String[] labels={"Home","Doctors","Cities","Saved","More"};for(String s:labels){TextView b=action(s,()->{switch(s){case "Home":showHome();break;case "Doctors":showDoctors("");break;case "Cities":showCities();break;case "Saved":showSaved();break;default:showMore();}});b.setTextSize(12);b.setTextColor(screen.equals(s.toLowerCase(Locale.ROOT))?BLUE:0xff61758d);medicalIcon(b,s,21,screen.equals(s.toLowerCase(Locale.ROOT))?BLUE:0xff61758d);nav.addView(b,new LinearLayout.LayoutParams(0,dp(66),1));}}
    private void clear(String name){screen=name;body.removeAllViews();navigation();}
    private void heading(String s){add(body,text(s,21,INK,true),12);}
    private void showHome(){clear("home");add(body,action("Search doctors or specialties  →",()->showDoctors("")),12);LinearLayout hero=card();hero.setBackground(bg(NAVY,16));add(hero,text("Healthcare closer to you.",25,Color.WHITE,true),8);add(hero,text("Discover healthcare services across Pakistan.",15,0xffdce9ff,false),0);add(body,hero,18);heading("Explore services");String[] labels={"Doctors","Hospitals","Laboratories","Health guides","Health news","Local food","Cities","Ask a question","More"};String[] icons={"✚","▣","⚗","♡","▤","♨","⌖","?","⋯"};String[] routes={"","/hospitals/","/laboratories/","/sukkur/health-topics/","/health-news/","/sukkur/local-food/","","/contact/",""};for(int i=0;i<3;i++){LinearLayout row=new LinearLayout(this);for(int k=0;k<3;k++){final int n=i*3+k;TextView tile=action(labels[n],()->{if(n==0)showDoctors("");else if(n==6)showCities();else if(n==8)showMore();else if(n==1)showHospitals();else openPage(routes[n]);});tile.setTextSize(13);medicalIcon(tile,labels[n],28,BLUE);LinearLayout.LayoutParams a=new LinearLayout.LayoutParams(0,dp(90),1);a.setMargins(dp(3),0,dp(3),dp(6));row.addView(tile,a);}add(body,row,4);}heading("Popular specialties");for(String s:new String[]{"Physician","Cardiology","Gynaecology","Urology"})add(body,action(s,()->showDoctors(s)),6);add(body,action("Explore Slashcure.com  →",()->external("https://slashcure.com/")),12);}
    private void fetchDirectory(){if(loading)return;loading=true;new Thread(()->{try{java.net.HttpURLConnection c=(java.net.HttpURLConnection)new URL(BASE+"/assets/directory.json").openConnection();c.setConnectTimeout(12000);c.setReadTimeout(15000);c.setInstanceFollowRedirects(false);try{if(c.getResponseCode()!=200)throw new IOException("HTTP");ByteArrayOutputStream out=new ByteArrayOutputStream();try(InputStream in=c.getInputStream()){byte[] b=new byte[4096];int n;while((n=in.read(b))!=-1){out.write(b,0,n);if(out.size()>5000000)throw new IOException("size");}}JSONObject data=new JSONObject(out.toString("UTF-8"));JSONArray ds=data.getJSONArray("doctors"),hs=data.getJSONArray("hospitals");runOnUiThread(()->{if(isFinishing()||isDestroyed())return;doctors=ds;hospitals=hs;loaded=true;loading=false;refreshScreen();});}finally{c.disconnect();}}catch(Exception e){runOnUiThread(()->{if(isFinishing()||isDestroyed())return;loading=false;refreshScreen();});}}).start();}
    private void refreshScreen(){if(screen.equals("doctors"))showDoctors(query);else if(screen.equals("cities"))showCities();else if(screen.equals("hospitals"))showHospitals();else if(screen.equals("saved"))showSaved();}
    private void unavailable(){add(body,text(loading?"Loading directory…":"Directory unavailable. Check your internet connection.",16,INK,false),12);if(!loading)add(body,action("Retry",()->{fetchDirectory();refreshScreen();}),8);}
    private String val(JSONObject o,String k){return o.optString(k,"");}
    private String norm(String s){return s.toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{N}]+"," ").trim();}
    private boolean match(JSONObject d,String q){String n=norm(q);if(n.isEmpty())return true;String hay=norm(val(d,"name")+" "+val(d,"specialty")+" "+val(d,"hospital")+" "+val(d,"city")+" "+d.optJSONArray("cities"));if(n.equals("physician")||n.equals("internal medicine"))return norm(val(d,"specialty")).matches(".*(physician|internal medicine).*");for(String w:n.split(" "))if(!hay.contains(w))return false;return true;}
    private TreeSet<String> values(String key){TreeSet<String> set=new TreeSet<>(String.CASE_INSENSITIVE_ORDER);for(int i=0;i<doctors.length();i++){JSONObject d=doctors.optJSONObject(i);if(d==null)continue;String s=val(d,key);if(!s.isEmpty())set.add(s);if(key.equals("city")){JSONArray cs=d.optJSONArray("cities");if(cs!=null)for(int k=0;k<cs.length();k++)if(!cs.optString(k).isEmpty())set.add(cs.optString(k));}}return set;}
    private Spinner filter(String first,TreeSet<String> values,String selected,java.util.function.Consumer<String> change){ArrayList<String> list=new ArrayList<>();list.add(first);list.addAll(values);Spinner s=new Spinner(this);ArrayAdapter<String> a=new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,list);s.setAdapter(a);s.setSelection(Math.max(0,list.indexOf(selected)));s.setOnItemSelectedListener(new android.widget.AdapterView.OnItemSelectedListener(){public void onNothingSelected(android.widget.AdapterView<?> p){} public void onItemSelected(android.widget.AdapterView<?> p,View v,int pos,long id){change.accept(list.get(pos));}});return s;}
    private void showDoctors(String q){query=q;clear("doctors");heading("Find doctors");search=new EditText(this);search.setSingleLine(true);search.setTextSize(16);search.setHint("Doctor name or specialty");search.setText(q);search.setBackground(bg(Color.WHITE,12));search.setPadding(dp(12),dp(12),dp(12),dp(12));add(body,search,8);if(!loaded){unavailable();return;}city=filter("All cities",values("city"),selectedCity,v->{if(!selectedCity.equals(v)){selectedCity=v;limit=30;renderDoctors();}});specialty=filter("All specialties",values("specialty"),selectedSpecialty,v->{if(!selectedSpecialty.equals(v)){selectedSpecialty=v;limit=30;renderDoctors();}});add(body,city,6);add(body,specialty,8);results=column();add(body,results,0);search.addTextChangedListener(new TextWatcher(){public void beforeTextChanged(CharSequence s,int a,int c,int f){}public void onTextChanged(CharSequence s,int a,int before,int c){query=s.toString();limit=30;renderDoctors();}public void afterTextChanged(Editable e){}});renderDoctors();}
    private boolean cityMatches(JSONObject d){if(selectedCity.equals("All cities")||selectedCity.equalsIgnoreCase(val(d,"city")))return true;JSONArray a=d.optJSONArray("cities");if(a!=null)for(int i=0;i<a.length();i++)if(selectedCity.equalsIgnoreCase(a.optString(i)))return true;return false;}
    private void renderDoctors(){if(results==null||!screen.equals("doctors"))return;results.removeAllViews();int count=0;for(int i=0;i<doctors.length();i++){JSONObject d=doctors.optJSONObject(i);if(d==null||!match(d,query)||!cityMatches(d)||(!selectedSpecialty.equals("All specialties")&&!selectedSpecialty.equalsIgnoreCase(val(d,"specialty"))))continue;count++;if(count<=limit)add(results,doctorCard(d),10);}TextView total=text(count+" matching profiles",14,INK,false);results.addView(total,0);if(count==0)add(results,text("No matching doctors. Try another search or city.",16,INK,false),10);if(count>limit)add(results,action("Show more",()->{limit+=30;renderDoctors();}),8);add(results,text("Confirm clinic details and availability directly with the provider.",13,0xff61758d,false),8);}
    private LinearLayout doctorCard(JSONObject d){LinearLayout c=card();add(c,text(val(d,"name"),19,INK,true),5);add(c,text(val(d,"specialty"),15,BLUE,true),5);for(String k:new String[]{"qualifications","hospital","city"})if(!val(d,k).isEmpty())add(c,text(val(d,k),14,INK,false),4);add(c,action("View profile  →",()->showDoctor(d)),0);return c;}
    private void showDoctor(JSONObject d){clear("profile");heading(val(d,"name"));LinearLayout c=card();for(String k:new String[]{"specialty","qualifications","hospital","city","experience"})if(!val(d,k).isEmpty())add(c,text(val(d,k),16,INK,false),10);add(body,c,10);if(!val(d,"url").isEmpty())add(body,action("Full Slashpromo profile",()->openPage(val(d,"url"))),8);String ext=val(d,"externalProfile");if(ext.startsWith("https://slashcure.com/"))add(body,action("View on Slashcure",()->external(ext)),8);String id=val(d,"id");if(!id.isEmpty())add(body,action(isSaved(id)?"Remove from saved":"Save doctor",()->{Set<String> ids=saved();if(!ids.add(id))ids.remove(id);getPreferences(0).edit().putStringSet("saved",ids).apply();showDoctor(d);}),8);add(body,action("Back to doctors",()->showDoctors(query)),8);add(body,text("Published directory information; confirm current availability with the provider.",14,INK,false),8);}
    private Set<String> saved(){return new HashSet<>(getPreferences(0).getStringSet("saved",Collections.emptySet()));}
    private boolean isSaved(String id){return saved().contains(id);}
    private void showSaved(){clear("saved");heading("Saved doctors");if(!loaded){unavailable();return;}int n=0;for(int i=0;i<doctors.length();i++){JSONObject d=doctors.optJSONObject(i);if(d!=null&&isSaved(val(d,"id"))){add(body,doctorCard(d),10);n++;}}if(n==0)add(body,text("Save a doctor to find their profile here.",16,INK,false),10);}
    private void showCities(){clear("cities");heading("Explore cities");if(!loaded){unavailable();return;}for(String s:values("city"))add(body,action(s,()->{selectedCity=s;selectedSpecialty="All specialties";showDoctors("");}),6);}
    private void showHospitals(){clear("hospitals");heading("Hospitals");if(!loaded){unavailable();return;}for(int i=0;i<hospitals.length();i++){JSONObject h=hospitals.optJSONObject(i);if(h==null)continue;LinearLayout c=card();add(c,text(val(h,"name"),18,INK,true),5);add(c,text(val(h,"city"),14,INK,false),5);add(c,action("View hospital",()->openPage(val(h,"url"))),0);add(body,c,8);}}
    private void showMore(){clear("more");heading("More");String[] names={"Health news","Local food","Contact","Privacy policy","Website"};String[] paths={"/health-news/","/sukkur/local-food/","/contact/","/privacy/","/"};for(int i=0;i<names.length;i++){final String p=paths[i];add(body,action(names[i],()->openPage(p)),8);}}
    private void openPage(String p){if(p==null||!p.startsWith("/")||p.startsWith("//")||p.contains(".."))return;Intent i=new Intent(this,MainActivity.class);i.setData(Uri.parse(BASE+p));startActivity(i);}
    private void external(String u){Uri uri=Uri.parse(u);if(!"https".equals(uri.getScheme())||!"slashcure.com".equals(uri.getHost()))return;try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(Exception e){Toast.makeText(this,"No browser available",Toast.LENGTH_SHORT).show();}}
    @Override public void onBackPressed(){if(screen.equals("home"))super.onBackPressed();else if(screen.equals("profile"))showDoctors(query);else showHome();}
}

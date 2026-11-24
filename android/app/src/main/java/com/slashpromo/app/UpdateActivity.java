package com.slashpromo.app;

import android.app.*;
import android.content.*;
import android.content.pm.*;
import android.net.Uri;
import android.os.*;
import android.widget.*;
import org.json.*;
import java.io.*;
import java.net.*;
import java.security.*;
import java.util.Arrays;

public final class UpdateActivity extends Activity {
    private static final String API="https://api.github.com/repos/hospitalpro26/slashpromo-site/releases/latest";
    private static final String PREFIX="https://github.com/hospitalpro26/slashpromo-site/releases/download/";
    private TextView status; private Button download; private String url,digest; private long remoteCode; private boolean busy;
    static long code(PackageInfo p){return Build.VERSION.SDK_INT>=28?p.getLongVersionCode():p.versionCode;}
    static int flags(){return Build.VERSION.SDK_INT>=28?PackageManager.GET_SIGNING_CERTIFICATES:PackageManager.GET_SIGNATURES;}
    static android.content.pm.Signature[] signers(PackageInfo p){return Build.VERSION.SDK_INT>=28?p.signingInfo.getApkContentsSigners():p.signatures;}
    static HttpURLConnection connect(String address,boolean apk)throws Exception{
        for(int i=0;i<6;i++){
            URL u=new URL(address);String host=u.getHost();
            if(!"https".equals(u.getProtocol())||u.getUserInfo()!=null||u.getPort()!=-1||
               !(apk?host.equals("github.com")||host.equals("release-assets.githubusercontent.com")||host.equals("objects.githubusercontent.com"):host.equals("api.github.com")))throw new IOException("Untrusted update address");
            HttpURLConnection c=(HttpURLConnection)u.openConnection();c.setInstanceFollowRedirects(false);c.setConnectTimeout(12000);c.setReadTimeout(20000);c.setRequestProperty("User-Agent","Slashpromo-Android");
            int rc=c.getResponseCode();if(rc>=300&&rc<400){String next=c.getHeaderField("Location");c.disconnect();if(next==null)throw new IOException("Missing redirect");address=new URL(u,next).toString();continue;}
            if(rc!=200){c.disconnect();throw new IOException("HTTP "+rc);}return c;
        }throw new IOException("Too many redirects");
    }
    static JSONObject latest()throws Exception{
        HttpURLConnection c=connect(API,false);try(InputStream in=c.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[4096];int n;while((n=in.read(b))!=-1){if(out.size()+n>1000000)throw new IOException("Response too large");out.write(b,0,n);}return new JSONObject(out.toString("UTF-8"));}finally{c.disconnect();}
    }
    static long releaseCode(JSONObject j)throws Exception{String tag=j.getString("tag_name");if(!tag.matches("android-[0-9]+"))throw new IOException("Unknown release tag");return Long.parseLong(tag.substring(8));}
    @Override public void onCreate(Bundle b){super.onCreate(b);LinearLayout l=new LinearLayout(this);l.setOrientation(1);l.setPadding(32,32,32,32);setContentView(l);TextView title=new TextView(this);title.setText("Slashpromo • App updates");title.setTextSize(25);l.addView(title);status=new TextView(this);status.setTextSize(17);l.addView(status);Button check=new Button(this);check.setText("Check for updates");check.setOnClickListener(v->check());l.addView(check);download=new Button(this);download.setText("Download verified update");download.setEnabled(false);download.setOnClickListener(v->fetch());l.addView(download);Button home=new Button(this);home.setText("Back");home.setOnClickListener(v->finish());l.addView(home);check();}
    private void check(){if(busy)return;busy=true;download.setEnabled(false);status.setText("Checking official release…");new Thread(()->{try{
        PackageInfo installed=getPackageManager().getPackageInfo(getPackageName(),flags());JSONObject j=latest();long version=releaseCode(j);String installedText="Installed: "+installed.versionName;
        if(!getPackageName().equals("com.slashpromo.app"))throw new IOException("Updates are for the signed production app only");
        if(version<=code(installed)){show(installedText+"\nYou are up to date.",false);return;}
        JSONArray assets=j.getJSONArray("assets");for(int i=0;i<assets.length();i++){JSONObject a=assets.getJSONObject(i);if(!a.optString("name").equals("slashpromo-release.apk"))continue;
            String link=a.getString("browser_download_url"),hash=a.optString("digest");if(!link.equals(PREFIX+j.getString("tag_name")+"/slashpromo-release.apk")||!hash.matches("sha256:[a-fA-F0-9]{64}"))throw new IOException("Release integrity information unavailable");
            url=link;digest=hash.substring(7);remoteCode=version;show(installedText+"\nAvailable: "+j.optString("name",j.getString("tag_name"))+"\n"+j.optString("body",""),true);return;}
        throw new IOException("No verified APK in release");
    }catch(Exception e){show("Update check unavailable. Try again when online. Your library is unchanged.",false);}}).start();}
    private void show(String message,boolean enabled){runOnUiThread(()->{if(isDestroyed())return;busy=false;status.setText(message);download.setEnabled(enabled);});}
    private void fetch(){if(busy||url==null)return;busy=true;download.setEnabled(false);status.setText("Downloading and verifying update…");new Thread(()->{File dir=new File(getCacheDir(),"updates");dir.mkdirs();File apk=new File(dir,"slashpromo-release.apk");try{
        MessageDigest sha=MessageDigest.getInstance("SHA-256");HttpURLConnection c=connect(url,true);try(InputStream in=c.getInputStream();OutputStream out=new FileOutputStream(apk)){byte[] b=new byte[65536];int n;long count=0;while((n=in.read(b))!=-1){count+=n;if(count>150L*1024*1024)throw new IOException("APK too large");sha.update(b,0,n);out.write(b,0,n);}}finally{c.disconnect();}
        StringBuilder hex=new StringBuilder();for(byte b:sha.digest())hex.append(String.format(java.util.Locale.ROOT,"%02x",b&255));if(!hex.toString().equalsIgnoreCase(digest))throw new IOException("Checksum mismatch");
        PackageManager pm=getPackageManager();PackageInfo current=pm.getPackageInfo(getPackageName(),flags()),next=pm.getPackageArchiveInfo(apk.getPath(),flags());
        if(next==null||!getPackageName().equals(next.packageName)||code(next)!=remoteCode||code(next)<=code(current)||!Arrays.equals(signers(current),signers(next)))throw new IOException("Package or certificate mismatch");
        runOnUiThread(()->{if(isDestroyed())return;busy=false;status.setText("Update verified. Confirm installation in Android.");install(apk);});
    }catch(Exception e){apk.delete();show("Update could not be verified or downloaded. Nothing installed.",true);}}).start();}
    private void install(File apk){try{if(Build.VERSION.SDK_INT>=26&&!getPackageManager().canRequestPackageInstalls()){status.setText("Allow Slashpromo to install updates in Android settings, then tap Download verified update again.");download.setEnabled(true);startActivity(new Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:"+getPackageName())));return;}
        Intent i=new Intent(Intent.ACTION_VIEW);i.setDataAndType(Uri.parse("content://"+getPackageName()+".updates/slashpromo-release.apk"),"application/vnd.android.package-archive");i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);startActivity(i);download.setEnabled(true);
    }catch(Exception e){show("Android installer unavailable.",true);}}
}

package com.slashpromo.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.os.Bundle;
import android.content.Intent;
import android.net.Uri;
import android.graphics.Color;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.Button;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.webkit.*;
import android.widget.Toast;

public final class MainActivity extends Activity {
    private WebView web;
    private ProgressBar progress;
    private static final String HOME = "https://slashpromo.com/?source=android";

    private boolean internal(Uri uri) {
        if (uri == null || !"https".equalsIgnoreCase(uri.getScheme())
                || uri.getUserInfo() != null || (uri.getPort() != -1 && uri.getPort() != 443)) return false;
        return "slashpromo.com".equalsIgnoreCase(uri.getHost());
    }
    private boolean publicPage(Uri uri) {
        if (!internal(uri)) return false;
        String p = uri.getPath();
        return p != null && !p.contains("..") && !p.matches("(?i)^/(admin|qa-admin|secure-backups|control-center|api|[.]well-known)(/.*)?$");
    }
    private void external(Uri uri) {
        String scheme = uri.getScheme();
        if (scheme == null || !(scheme.equalsIgnoreCase("https") || scheme.equalsIgnoreCase("tel") || scheme.equalsIgnoreCase("mailto") || scheme.equalsIgnoreCase("whatsapp"))) return;
        try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
        catch (android.content.ActivityNotFoundException e) { Toast.makeText(this, "No compatible app is installed.", Toast.LENGTH_SHORT).show(); }
    }
    private void navigate(String url) {
        Uri u = Uri.parse(url);
        if (publicPage(u)) web.loadUrl(url);
        else if (!internal(u)) external(u);
    }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(11,35,83));
        getWindow().setNavigationBarColor(Color.rgb(11,35,83));
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.WHITE);
        root.setFitsSystemWindows(true);
        TextView title = new TextView(this);
        title.setText("SlashPromo");
        title.setTextColor(Color.WHITE);
        title.setTextSize(21);
        title.setPadding(dp(16),dp(10),dp(16),dp(10));
        title.setBackgroundColor(Color.rgb(11,35,83));
        root.addView(title);
        progress = new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);
        progress.setMax(100);
        root.addView(progress,new LinearLayout.LayoutParams(-1,dp(3)));
        web = new WebView(this);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setGeolocationEnabled(false);
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(false);
        settings.setBuiltInZoomControls(false);
        if (android.os.Build.VERSION.SDK_INT >= 26) settings.setSafeBrowsingEnabled(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (publicPage(u)) return false;
                if (request.isForMainFrame() && !internal(u)) external(u);
                return true;
            }
            @Override public void onReceivedSslError(WebView v, SslErrorHandler handler, android.net.http.SslError error) {
                handler.cancel();
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view,int value) {
                progress.setProgress(value);
                progress.setVisibility(value == 100 ? View.GONE : View.VISIBLE);
            }
            @Override public void onPermissionRequest(PermissionRequest request) { request.deny(); }
            @Override public void onGeolocationPermissionsShowPrompt(String origin,GeolocationPermissions.Callback callback) { callback.invoke(origin,false,false); }
        });
        root.addView(web,new LinearLayout.LayoutParams(-1,0,1));
        LinearLayout nav = new LinearLayout(this);
        nav.setOrientation(LinearLayout.HORIZONTAL);
        String[] labels = {"Home","Doctors","Cities","Hospitals","More"};
        String[] routes = {"/","/doctors/","/cities/","/hospitals/","/about/"};
        for(int i=0;i<labels.length;i++){
            final String path=routes[i];
            Button b=new Button(this);
            b.setText(labels[i]);
            b.setAllCaps(false);
            b.setTextSize(12);
            b.setMinWidth(0);
            b.setMinimumWidth(0);
            b.setPadding(0,0,0,0);
            b.setTextColor(Color.rgb(11,35,83));
            nav.addView(b,new LinearLayout.LayoutParams(0,dp(52),1));
            b.setOnClickListener(v -> { if ("/about/".equals(path)) { new AlertDialog.Builder(this).setTitle("More").setItems(new String[]{"My Medical Library","Native homepage","About Slashpromo"},(d,which)->{if(which==0)startActivity(new Intent(this,LibraryActivity.class));else if(which==1){startActivity(new Intent(this,DirectoryActivity.class));finish();}else navigate("https://slashpromo.com/about/");}).show(); } else if ("/".equals(path)) { startActivity(new Intent(this,DirectoryActivity.class));finish(); } else navigate("https://slashpromo.com"+path); });
        }
        root.addView(nav);
        setContentView(root);
        if(state==null || web.restoreState(state)==null) openIntent(getIntent());
    }
    private int dp(int n){return Math.round(n*getResources().getDisplayMetrics().density);}
    private void openIntent(Intent intent){
        Uri u=intent == null ? null : intent.getData();
        web.loadUrl(publicPage(u)?u.toString():HOME);
    }
    @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);openIntent(intent);}
    @Override protected void onSaveInstanceState(Bundle state){web.saveState(state);super.onSaveInstanceState(state);}
    @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else super.onBackPressed();}
    @Override protected void onDestroy(){if(web!=null){((ViewGroup)web.getParent()).removeView(web);web.destroy();}super.onDestroy();}
}

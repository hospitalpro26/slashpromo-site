package com.slashpromo.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.security.KeyStore;
import java.security.SecureRandom;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.net.ssl.HttpsURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import org.json.JSONObject;

final class AccountClient {
 // Review build only. Never turn on before staging, policy publication and security tests.
 static final boolean ENABLED = false;
 private static final String BASE = "https://slashview-api.slashview.workers.dev";
 private static final String ALIAS = "slashview.account.session.v1";
 private final SharedPreferences prefs;
 AccountClient(Context c){prefs=c.getSharedPreferences("slashview_account_v1",Context.MODE_PRIVATE);}
 synchronized String deviceId(){
  String id=prefs.getString("installation",null);
  if(id!=null&&id.matches("[a-f0-9]{64}"))return id;
  byte[] b=new byte[32];new SecureRandom().nextBytes(b);
  StringBuilder s=new StringBuilder();for(byte v:b)s.append(String.format(java.util.Locale.ROOT,"%02x",v&255));
  id=s.toString();if(!prefs.edit().putString("installation",id).commit())throw new IllegalStateException("Cannot save installation");
  return id;
 }
 private SecretKey key() throws Exception {
  KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);
  if(ks.containsAlias(ALIAS))return (SecretKey)ks.getKey(ALIAS,null);
  KeyGenerator g=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
  g.init(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
  return g.generateKey();
 }
 synchronized void saveSession(String token) throws Exception {
  if(!token.matches("[a-f0-9]{64}"))throw new IllegalArgumentException("Invalid session");
  Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,key());
  String record=Base64.encodeToString(c.getIV(),Base64.NO_WRAP)+":"+Base64.encodeToString(c.doFinal(token.getBytes(StandardCharsets.UTF_8)),Base64.NO_WRAP);
  if(!prefs.edit().putString("session",record).commit())throw new IllegalStateException("Cannot save session");
 }
 synchronized String session() {
  try{String record=prefs.getString("session","");if(record.isEmpty())return "";String[] parts=record.split(":");if(parts.length!=2)throw new Exception();
   Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(parts[0],Base64.NO_WRAP)));
   String token=new String(c.doFinal(Base64.decode(parts[1],Base64.NO_WRAP)),StandardCharsets.UTF_8);if(!token.matches("[a-f0-9]{64}"))throw new Exception();return token;
  }catch(Exception e){clearSession();return "";}
 }
 void clearSession(){prefs.edit().remove("session").apply();}
 static final class Result {
  final int status;final JSONObject body;
  Result(int s,JSONObject b){status=s;body=b;}
  boolean ok(){return status>=200&&status<300;}
 }
 Result request(String path,JSONObject payload,String token) throws Exception {
  if(!ENABLED)throw new IllegalStateException("Account service is not enabled");
  if(!path.matches("/v1/(register|login|me|logout|verification/request|verification/confirm|recovery/request|recovery/confirm)"))throw new IllegalArgumentException("Invalid endpoint");
  HttpsURLConnection c=(HttpsURLConnection)new URL(BASE+path).openConnection();
  try{
   c.setInstanceFollowRedirects(false);c.setConnectTimeout(10000);c.setReadTimeout(15000);c.setUseCaches(false);
   c.setRequestProperty("Accept","application/json");
   if(token!=null&&!token.isEmpty())c.setRequestProperty("Authorization","Bearer "+token);
   if(payload!=null){c.setRequestMethod("POST");c.setDoOutput(true);c.setRequestProperty("Content-Type","application/json");byte[] data=payload.toString().getBytes(StandardCharsets.UTF_8);c.setFixedLengthStreamingMode(data.length);try(java.io.OutputStream out=c.getOutputStream()){out.write(data);}}
   int status=c.getResponseCode();if(status>=300&&status<400)throw new Exception("Unexpected redirect");
   InputStream raw=status>=400?c.getErrorStream():c.getInputStream();if(raw==null)throw new Exception("Empty response");
   try(InputStream in=raw;ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] buffer=new byte[4096];int n;while((n=in.read(buffer))!=-1){if(out.size()+n>65536)throw new Exception("Response too large");out.write(buffer,0,n);}return new Result(status,new JSONObject(out.toString("UTF-8")));}
  }finally{c.disconnect();}
 }
}

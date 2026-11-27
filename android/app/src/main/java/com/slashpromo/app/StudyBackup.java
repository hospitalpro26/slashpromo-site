package com.slashpromo.app;

import android.content.SharedPreferences;
import org.json.*;
import java.io.*;
import java.security.SecureRandom;
import java.util.*;
import javax.crypto.*;
import javax.crypto.spec.*;
import java.util.zip.*;

final class StudyBackup {
    private static final byte[] MAGIC={'S','V','B','1'};
    private static final long MAX_FILE=64L*1024*1024, MAX_TOTAL=64L*1024*1024;
    private static final int MAX_PREFS=16*1024*1024;
    private static boolean allowed(String key){return key.equals("bookTitle")||key.equals("selectedBook")||key.startsWith("study.")||key.startsWith("reader.")||key.startsWith("offlineStudy.")||key.startsWith("offlineRecent.");}
    private static boolean id(String s){return s.equals("legacy")||s.matches("volume-[a-f0-9-]{1,64}");}
    private static Cipher cipher(int mode,char[] password,byte[] salt,byte[] iv)throws Exception{
        PBEKeySpec spec=new PBEKeySpec(password,salt,600000,256);
        byte[] key=null;
        try{key=SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
            Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(mode,new SecretKeySpec(key,"AES"),new GCMParameterSpec(128,iv));c.updateAAD(MAGIC);return c;
        }finally{spec.clearPassword();if(key!=null)Arrays.fill(key,(byte)0);}
    }
    private static JSONObject metadata(SharedPreferences prefs)throws Exception{
        JSONObject all=new JSONObject();
        for(Map.Entry<String,?> e:prefs.getAll().entrySet()){
            if(!allowed(e.getKey()))continue;Object v=e.getValue();JSONObject item=new JSONObject();
            if(v instanceof String)item.put("type","s").put("value",v);
            else if(v instanceof Integer)item.put("type","i").put("value",v);
            else if(v instanceof Long)item.put("type","l").put("value",v);
            else if(v instanceof Boolean)item.put("type","b").put("value",v);
            else if(v instanceof Float)item.put("type","f").put("value",v);
            else if(v instanceof Set)item.put("type","set").put("value",new JSONArray((Set<?>)v));
            else continue;
            all.put(e.getKey(),item);
        }return all;
    }
    private static long copy(InputStream in,OutputStream out,long limit)throws IOException{
        byte[] buf=new byte[65536];int n;long total=0;while((n=in.read(buf))!=-1){total+=n;if(total>limit)throw new IOException("Backup size limit");out.write(buf,0,n);}return total;
    }
    static void exportTo(OutputStream output,File root,List<String> ids,SharedPreferences prefs,char[] password)throws Exception{
        byte[] salt=new byte[16],iv=new byte[12];SecureRandom random=new SecureRandom();random.nextBytes(salt);random.nextBytes(iv);
        Cipher c=cipher(Cipher.ENCRYPT_MODE,password,salt,iv);
        byte[] meta=metadata(prefs).toString().getBytes("UTF-8");if(meta.length>MAX_PREFS)throw new IOException("Study metadata too large");
        long raw=meta.length;for(String book:ids){if(!id(book))throw new IOException("Invalid book ID");File dir=book.equals("legacy")?root:new File(root,book);for(String name:new String[]{"book.pdf","book.sqlite"}){File f=new File(dir,name);if(!f.isFile())throw new IOException("Missing book file");raw+=f.length();}}if(raw>60L*1024*1024)throw new IOException("Backup exceeds current 60 MB limit");
        output.write(MAGIC);output.write(salt);output.write(iv);
        try(ZipOutputStream zip=new ZipOutputStream(new CipherOutputStream(output,c))){
            zip.putNextEntry(new ZipEntry("study.json"));zip.write(meta);zip.closeEntry();long total=meta.length;
            for(String book:ids){if(!id(book))throw new IOException("Invalid book ID");File dir=book.equals("legacy")?root:new File(root,book);
                for(String name:new String[]{"book.pdf","book.sqlite"}){File file=new File(dir,name);if(!file.isFile())throw new IOException("Missing book file");
                    zip.putNextEntry(new ZipEntry(book+"/"+name));try(InputStream in=new FileInputStream(file)){total+=copy(in,zip,MAX_FILE);}zip.closeEntry();if(total>MAX_TOTAL)throw new IOException("Backup too large");
                }
            }
        }
    }
    // Authenticate the entire encrypted stream before opening its ZIP or making any live change.
    // CipherInputStream can buffer GCM plaintext, so use bounded-size authenticated chunks in the
    // future; this first format is limited to a conservative archive size on restore.
    private static final int MAX_ENCRYPTED=64*1024*1024;
    static int restore(InputStream input,File root,SharedPreferences prefs,char[] password)throws Exception{
        if(!emptyLibrary(root,prefs))throw new IOException("Restore requires an empty study library");
        File stage=new File(root,"restore-"+UUID.randomUUID());if(!stage.mkdir())throw new IOException("Cannot stage restore");
        ArrayList<File> published=new ArrayList<>();
        try{
            DataInputStream header=new DataInputStream(input);byte[] magic=new byte[4],salt=new byte[16],iv=new byte[12];header.readFully(magic);header.readFully(salt);header.readFully(iv);if(!Arrays.equals(magic,MAGIC))throw new IOException("Unknown backup format");
            Cipher c=cipher(Cipher.DECRYPT_MODE,password,salt,iv);
            File zipFile=new File(stage,"verified.zip");
            // Authenticate before reading any untrusted archive entry. Bound memory and disk use.
            byte[] encrypted;
            try(ByteArrayOutputStream buffer=new ByteArrayOutputStream()){copy(header,buffer,MAX_ENCRYPTED);encrypted=buffer.toByteArray();}
            byte[] plain=c.doFinal(encrypted);Arrays.fill(encrypted,(byte)0);
            try(OutputStream out=new FileOutputStream(zipFile)){out.write(plain);}finally{Arrays.fill(plain,(byte)0);}
            JSONObject meta=null;Set<String> seen=new HashSet<>(),books=new HashSet<>();long total=0;
            try(ZipInputStream zip=new ZipInputStream(new FileInputStream(zipFile))){
                ZipEntry e;while((e=zip.getNextEntry())!=null){String name=e.getName();if(e.isDirectory()||!seen.add(name)||seen.size()>2001)throw new IOException("Invalid archive entry");
                    if(name.equals("study.json")){ByteArrayOutputStream bytes=new ByteArrayOutputStream();total+=copy(zip,bytes,MAX_PREFS);meta=new JSONObject(bytes.toString("UTF-8"));}
                    else{String[] parts=name.split("/",-1);if(parts.length!=2||!id(parts[0])||!(parts[1].equals("book.pdf")||parts[1].equals("book.sqlite")))throw new IOException("Unexpected archive entry");
                        File dir=new File(stage,parts[0]);if(!dir.isDirectory()&&!dir.mkdir())throw new IOException("Cannot stage book");
                        try(OutputStream out=new FileOutputStream(new File(dir,parts[1]))){total+=copy(zip,out,MAX_FILE);}books.add(parts[0]);
                    }if(total>MAX_TOTAL)throw new IOException("Backup too large");zip.closeEntry();
                }
            }
            if(meta==null)throw new IOException("Missing study metadata");
            for(String book:books){File dir=new File(stage,book);if(!new File(dir,"book.pdf").isFile()||!new File(dir,"book.sqlite").isFile())throw new IOException("Incomplete book");}
            SharedPreferences.Editor edit=prefs.edit();Iterator<String> keys=meta.keys();
            while(keys.hasNext()){String k=keys.next();if(!allowed(k))throw new IOException("Unexpected preference");JSONObject v=meta.getJSONObject(k);switch(v.getString("type")){
                case "s":edit.putString(k,v.getString("value"));break;
                case "i":edit.putInt(k,v.getInt("value"));break;
                case "l":edit.putLong(k,v.getLong("value"));break;
                case "b":edit.putBoolean(k,v.getBoolean("value"));break;
                case "f":edit.putFloat(k,(float)v.getDouble("value"));break;
                case "set":JSONArray a=v.getJSONArray("value");Set<String> set=new HashSet<>();for(int i=0;i<a.length();i++)set.add(a.getString(i));edit.putStringSet(k,set);break;
                default:throw new IOException("Unknown preference type");
            }}
            if(!emptyLibrary(root,prefs))throw new IOException("Library changed during restore");
            for(String book:books){File dir=new File(stage,book);if(book.equals("legacy")){for(String name:new String[]{"book.pdf","book.sqlite"}){File target=new File(root,name);if(target.exists()||!new File(dir,name).renameTo(target))throw new IOException("Restore conflict");published.add(target);}}
                else{File target=new File(root,book);if(target.exists()||!dir.renameTo(target))throw new IOException("Restore conflict");published.add(target);}
            }
            if(!edit.commit())throw new IOException("Cannot save study metadata");return books.size();
        }catch(Exception e){for(File f:published)remove(f);throw e;}finally{remove(stage);}
    }
    private static boolean emptyLibrary(File root,SharedPreferences prefs){
        File[] children=root.listFiles();if(children==null)return false;for(File f:children){String n=f.getName();if(n.equals("book.pdf")||n.equals("book.sqlite")||n.startsWith("volume-")||n.startsWith("scan-")||n.startsWith("pending-"))return false;}
        for(String k:prefs.getAll().keySet())if(allowed(k)&&!k.equals("selectedBook"))return false;return true;
    }
    private static void remove(File f){if(f.isDirectory()){File[] children=f.listFiles();if(children!=null)for(File child:children)remove(child);}f.delete();}
}

package com.slashpromo.app;

import android.app.*;
import android.os.*;
import android.content.*;
import android.graphics.*;
import android.graphics.pdf.PdfRenderer;
import android.widget.*;
import android.view.*;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import java.io.*;
import java.util.concurrent.*;
import java.util.regex.*;
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader;
import com.tom_roush.pdfbox.pdmodel.PDDocument;
import com.tom_roush.pdfbox.text.PDFTextStripper;

public final class LibraryActivity extends Activity {
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private LinearLayout body;
    private EditText search;
    private TextView status;
    private File book,index;
    private int generation=0;
    private boolean busy=false;
    private int currentPage=0;
    private static final int PICK=31;
    @Override public void onCreate(Bundle b){
        super.onCreate(b);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        android.app.KeyguardManager kg=(android.app.KeyguardManager)getSystemService(KEYGUARD_SERVICE);
        if(!kg.isDeviceSecure()){new AlertDialog.Builder(this).setMessage("Set a secure screen lock in Android settings before using the private library.").setPositiveButton("Close",(d,w)->finish()).setOnCancelListener(d->finish()).show();return;}
        Intent auth=kg.createConfirmDeviceCredentialIntent("Private medical library","Unlock with your device credential");
        if(auth==null){finish();return;}startActivityForResult(auth,32);
    }
    private void init(){
        PDFBoxResourceLoader.init(getApplicationContext());
        File dir=new File(getNoBackupFilesDir(),"medical-library");dir.mkdirs();
        book=new File(dir,"book.pdf");index=new File(dir,"book.sqlite");
        home();
    }
    private int dp(int n){return Math.round(n*getResources().getDisplayMetrics().density);}
    private TextView label(String s,int size){TextView t=new TextView(this);t.setText(s);t.setTextSize(size);t.setTextColor(0xff183654);t.setPadding(0,dp(8),0,dp(8));return t;}
    private void button(String s,Runnable r){Button b=new Button(this);b.setText(s);b.setAllCaps(false);b.setOnClickListener(v->r.run());body.addView(b);}
    private void layout(){ScrollView sc=new ScrollView(this);body=new LinearLayout(this);body.setOrientation(1);body.setPadding(dp(16),dp(16),dp(16),dp(16));sc.addView(body);setContentView(sc);}
    private void home(){generation++;layout();body.addView(label("My Medical Library",26));body.addView(label("Private • Offline • No search uploads",14));status=label(index.isFile()&&book.isFile()?"Book ready for offline search":"Add your personal PDF once to enable offline search.",16);body.addView(status);
        if(busy){status.setText("Preparing library…");return;}
        button("Add book once (Files or private Drive)",()->{Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.setType("application/pdf");i.addCategory(Intent.CATEGORY_OPENABLE);startActivityForResult(i,PICK);});
        if(book.isFile()&&index.isFile()){
            search=new EditText(this);search.setSingleLine(true);search.setHint("Search any medical topic");body.addView(search);button("Search whole book",()->find(search.getText().toString()));button("Open book",()->page(0));
        }
    }
    @Override protected void onActivityResult(int req,int result,Intent data){super.onActivityResult(req,result,data);if(req==32){if(result==RESULT_OK)init();else finish();return;}if(req==PICK&&result==RESULT_OK&&data!=null&&data.getData()!=null&&!busy){importBook(data.getData());}}
    private void importBook(android.net.Uri uri){
        busy=true;home();worker.execute(()->{
            File pending=new File(book.getParentFile(),"pending.pdf"), dbFile=new File(book.getParentFile(),"pending.sqlite");
            try{
                if(dbFile.exists())dbFile.delete();
                try(InputStream in=getContentResolver().openInputStream(uri);OutputStream out=new FileOutputStream(pending)){
                    if(in==null)throw new IOException("Cannot read PDF");byte[] buf=new byte[65536];int n;long bytes=0;while((n=in.read(buf))!=-1){bytes+=n;if(bytes>1024L*1024*1024)throw new IOException("PDF exceeds 1 GB");out.write(buf,0,n);}
                }
                try(PDDocument doc=PDDocument.load(pending,com.tom_roush.pdfbox.io.MemoryUsageSetting.setupTempFileOnly())){
                    SQLiteDatabase db=SQLiteDatabase.openOrCreateDatabase(dbFile,null);
                    try{db.execSQL("CREATE VIRTUAL TABLE pages USING fts4(content, tokenize=unicode61)");PDFTextStripper stripper=new PDFTextStripper();stripper.setSortByPosition(true);int total=doc.getNumberOfPages();int readable=0;
                        db.beginTransaction();try{for(int p=1;p<=total;p++){stripper.setStartPage(p);stripper.setEndPage(p);String text=stripper.getText(doc).replaceAll("[\\u00ad\\u200b]","").replaceAll("\\s+"," ").trim();if(!text.isEmpty())readable++;db.execSQL("INSERT INTO pages(docid,content) VALUES(?,?)",new Object[]{p,text});if(p%25==0){final int done=p;runOnUiThread(()->{if(!isDestroyed())status.setText("Indexing "+done+" / "+total+" pages");});}}if(readable==0)throw new IOException("No searchable text; OCR not supported yet");db.setTransactionSuccessful();}finally{db.endTransaction();}
                    }finally{db.close();}
                }
                // Keep the previous pair until the new PDF and index are complete.
                File oldBook=new File(book.getParentFile(),"previous.pdf"),oldIndex=new File(book.getParentFile(),"previous.sqlite");
                if(oldBook.exists()||oldIndex.exists())throw new IOException("Previous recovery files exist");
                boolean hadBook=book.exists(),hadIndex=index.exists();
                if(hadBook&&!book.renameTo(oldBook))throw new IOException("Cannot preserve old PDF");
                if(hadIndex&&!index.renameTo(oldIndex)){if(hadBook)oldBook.renameTo(book);throw new IOException("Cannot preserve old index");}
                if(!pending.renameTo(book)||!dbFile.renameTo(index)){book.delete();index.delete();if(hadBook)oldBook.renameTo(book);if(hadIndex)oldIndex.renameTo(index);throw new IOException("Cannot activate library");}
                oldBook.delete();oldIndex.delete();runOnUiThread(()->{busy=false;if(!isDestroyed())home();});
            }catch(Exception e){pending.delete();dbFile.delete();runOnUiThread(()->{busy=false;if(!isDestroyed()){home();status.setText("Import failed. Check file and free storage, then retry.");}});}
        });
    }
    private void find(String q){
        String clean=q.trim().replaceAll("[^\\p{L}\\p{N}]+"," ").trim();if(clean.isEmpty())return;
        int token=++generation;layout();body.addView(label("Search: "+q,22));button("Back to library",this::home);
        worker.execute(()->{
            java.util.ArrayList<Integer> hits=new java.util.ArrayList<>();java.util.ArrayList<String> snippets=new java.util.ArrayList<>();
            try(SQLiteDatabase db=SQLiteDatabase.openDatabase(index.getPath(),null,SQLiteDatabase.OPEN_READONLY);Cursor c=db.rawQuery("SELECT docid,snippet(pages, '[', ']', ' … ', 0, 24) FROM pages WHERE pages MATCH ? ORDER BY docid LIMIT 200",new String[]{"\""+clean+"\""})){
                while(c.moveToNext()){hits.add(c.getInt(0)-1);snippets.add(c.getString(1));}
                runOnUiThread(()->{if(isDestroyed()||generation!=token)return;body.addView(label(hits.size()+" matching pages (up to 200)",16));for(int i=0;i<hits.size();i++){final int p=hits.get(i);button("PDF page "+(p+1)+" — "+snippets.get(i),()->page(p));}});
            }catch(Exception e){runOnUiThread(()->{if(!isDestroyed()&&generation==token)body.addView(label("Search unavailable. Reopen the library.",16));});}
        });
    }
    private void page(int number){int token=++generation;currentPage=number;layout();button("Back to library",this::home);body.addView(label("PDF page "+(number+1),20));
        worker.execute(()->{try(ParcelFileDescriptor fd=ParcelFileDescriptor.open(book,ParcelFileDescriptor.MODE_READ_ONLY);PdfRenderer renderer=new PdfRenderer(fd)){
            int total=renderer.getPageCount();if(number<0||number>=total)return;
            Bitmap bitmap;try(PdfRenderer.Page p=renderer.openPage(number)){int width=Math.min(1600,Math.max(800,getResources().getDisplayMetrics().widthPixels));int height=Math.max(1,(int)((long)width*p.getHeight()/p.getWidth()));if(height>3000){width=(int)((long)width*3000/height);height=3000;}bitmap=Bitmap.createBitmap(width,height,Bitmap.Config.ARGB_8888);bitmap.eraseColor(Color.WHITE);p.render(bitmap,null,null,PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);}
            runOnUiThread(()->{if(isDestroyed()||generation!=token){bitmap.recycle();return;}ImageView img=new ImageView(this);img.setAdjustViewBounds(true);img.setImageBitmap(bitmap);body.addView(img,new LinearLayout.LayoutParams(-1,-2));if(number>0)button("Previous page",()->page(number-1));if(number+1<total)button("Next page",()->page(number+1));});
        }catch(Exception e){runOnUiThread(()->{if(!isDestroyed()&&generation==token)body.addView(label("Unable to open page",16));});}});
    }
    @Override public void onBackPressed(){if(!busy&&book!=null)home();else super.onBackPressed();}
    @Override protected void onDestroy(){worker.shutdown();super.onDestroy();}
}

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
    private String lastQuery="";
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
    private void home(){generation++;layout();button("← Back to Slashpromo Home",()->{startActivity(new Intent(this,DirectoryActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP));finish();});body.addView(label("My Medical Library",26));body.addView(label("Private • Offline • No search uploads",14));status=label(index.isFile()&&book.isFile()?"Book ready for offline search":"Add your personal PDF once to enable offline search.",16);body.addView(status);
        if(busy){status.setText("Preparing library…");return;}
        button("Add book once (Files or private Drive)",()->{Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.setType("application/pdf");i.addCategory(Intent.CATEGORY_OPENABLE);startActivityForResult(i,PICK);});
        if(book.isFile()&&index.isFile()){
            search=new EditText(this);search.setSingleLine(true);search.setHint("Search any medical topic");search.setText(lastQuery);body.addView(search);button("Search whole book",()->find(search.getText().toString()));button("Open book",()->page(0));
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
    private String normalized(String text){return java.text.Normalizer.normalize(text,java.text.Normalizer.Form.NFKC).toLowerCase(java.util.Locale.ROOT).replaceAll("[\\p{Pd}\\p{Punct}]+"," ").replaceAll("\\s+"," ").trim();}
    private static final class Hit {
        final int page; final String snippet; int score; boolean heading;
        Hit(int p,String s,int rank){page=p;snippet=s;score=rank;}
    }
    private void find(String q){
        String clean=q.trim().replaceAll("[^\\p{L}\\p{N}]+"," ").trim();if(clean.isEmpty())return;
        lastQuery=q;int token=++generation;layout();body.addView(label("Search: "+q,22));button("Back to library",this::home);body.addView(label("Finding topic headings and related pages…",14));
        worker.execute(()->{
            java.util.ArrayList<Hit> hits=new java.util.ArrayList<>();String wanted=normalized(clean);
            try(SQLiteDatabase db=SQLiteDatabase.openDatabase(index.getPath(),null,SQLiteDatabase.OPEN_READONLY);Cursor c=db.rawQuery("SELECT docid,snippet(pages, '[', ']', ' … ', 0, 24),content FROM pages WHERE pages MATCH ? ORDER BY docid",new String[]{"\""+clean+"\""})){
                while(c.moveToNext()){
                    String content=normalized(c.getString(2));int count=0,offset=0;
                    while((offset=content.indexOf(wanted,offset))>=0){count++;offset+=wanted.length();}
                    hits.add(new Hit(c.getInt(0)-1,c.getString(1),Math.min(count,20)));
                }
                // Inspect original line boundaries and font information from the saved PDF,
                // including on existing installations whose FTS index flattened whitespace.
                try(PDDocument doc=PDDocument.load(book,com.tom_roush.pdfbox.io.MemoryUsageSetting.setupTempFileOnly())){
                    PDFTextStripper stripper=new PDFTextStripper();stripper.setSortByPosition(true);
                    for(Hit h:hits){
                        stripper.setStartPage(h.page+1);stripper.setEndPage(h.page+1);
                        String raw=stripper.getText(doc);String[] lines=raw.split("\\R");
                        boolean toc=raw.matches("(?is).*\\b(contents|index)\\b.*") && raw.matches("(?s).*(?:\\d{2,4}\\s*\\R){1}.*");
                        for(String line:lines){
                            String n=normalized(line);
                            if(n.equals(wanted)){h.heading=true;h.score+=1000;break;}
                            if(n.matches(java.util.regex.Pattern.quote(wanted)+"\\s+\\d{1,4}"))h.score+=20;
                        }
                        if(toc&&!h.heading)h.score-=15;
                    }
                }catch(IOException ignored){/* Preserve full-text results if heading analysis fails. */}
                hits.sort((x,y)->{int cmp=Integer.compare(y.score,x.score);return cmp!=0?cmp:Integer.compare(x.page,y.page);});
                runOnUiThread(()->{if(isDestroyed()||generation!=token)return;body.removeViewAt(body.getChildCount()-1);body.addView(label(hits.size()+" matching pages • topic headings first",16));for(int i=0;i<Math.min(200,hits.size());i++){Hit h=hits.get(i);button((h.heading?"Topic heading • ":"Related page • ")+"PDF page "+(h.page+1)+" — "+h.snippet,()->page(h.page));}});
            }catch(Exception e){runOnUiThread(()->{if(!isDestroyed()&&generation==token)body.addView(label("Search unavailable. Reopen the library.",16));});}
        });
    }
    private final class ZoomPage extends ImageView {
        private final Matrix transform=new Matrix();private final ScaleGestureDetector pinch;private final GestureDetector gestures;
        private float zoom=1,base=1,x=0,y=0;private Bitmap bitmap;
        ZoomPage(Bitmap image){super(LibraryActivity.this);bitmap=image;setImageBitmap(image);setScaleType(ScaleType.MATRIX);setBackgroundColor(Color.WHITE);
            pinch=new ScaleGestureDetector(LibraryActivity.this,new ScaleGestureDetector.SimpleOnScaleGestureListener(){@Override public boolean onScale(ScaleGestureDetector d){scaleTo(zoom*d.getScaleFactor(),d.getFocusX(),d.getFocusY());return true;}});
            gestures=new GestureDetector(LibraryActivity.this,new GestureDetector.SimpleOnGestureListener(){@Override public boolean onDown(android.view.MotionEvent e){return true;}@Override public boolean onDoubleTap(android.view.MotionEvent e){scaleTo(zoom>1.1f?1:2.5f,e.getX(),e.getY());return true;}@Override public boolean onScroll(android.view.MotionEvent a,android.view.MotionEvent b,float dx,float dy){if(!pinch.isInProgress()){x-=dx;y-=dy;apply();}return true;}});
        }
        @Override protected void onSizeChanged(int w,int h,int oldw,int oldh){super.onSizeChanged(w,h,oldw,oldh);if(bitmap==null||w==0||h==0)return;base=Math.min((float)w/bitmap.getWidth(),(float)h/bitmap.getHeight());zoom=1;x=0;y=0;apply();}
        void scaleTo(float value,float fx,float fy){float z=Math.max(1,Math.min(5,value));float ratio=z/zoom;x=fx-(fx-x)*ratio;y=fy-(fy-y)*ratio;zoom=z;apply();}
        void change(float f){scaleTo(zoom*f,getWidth()/2f,getHeight()/2f);}
        void reset(){scaleTo(1,getWidth()/2f,getHeight()/2f);}
        private void apply(){float w=bitmap.getWidth()*base*zoom,h=bitmap.getHeight()*base*zoom;x=w<=getWidth()?(getWidth()-w)/2f:Math.max(getWidth()-w,Math.min(0,x));y=h<=getHeight()?(getHeight()-h)/2f:Math.max(getHeight()-h,Math.min(0,y));transform.setScale(base*zoom,base*zoom);transform.postTranslate(x,y);setImageMatrix(transform);}
        @Override public boolean onTouchEvent(android.view.MotionEvent e){pinch.onTouchEvent(e);gestures.onTouchEvent(e);return true;}
    }
    private void page(int number){int token=++generation;currentPage=number;
        body=new LinearLayout(this);body.setOrientation(1);body.setPadding(dp(6),dp(6),dp(6),dp(6));setContentView(body);
        LinearLayout bar=new LinearLayout(this);body.addView(bar);
        Button back=new Button(this);back.setText(lastQuery.isEmpty()?"Library":"Results");back.setOnClickListener(v->{if(lastQuery.isEmpty())home();else find(lastQuery);});bar.addView(back,new LinearLayout.LayoutParams(0,-2,1));
        Button lib=new Button(this);lib.setText("Library");lib.setOnClickListener(v->home());bar.addView(lib,new LinearLayout.LayoutParams(0,-2,1));
        body.addView(label("PDF page "+(number+1)+" • Pinch or double-tap to zoom",16));
        worker.execute(()->{try(ParcelFileDescriptor fd=ParcelFileDescriptor.open(book,ParcelFileDescriptor.MODE_READ_ONLY);PdfRenderer renderer=new PdfRenderer(fd)){
            int total=renderer.getPageCount();if(number<0||number>=total)return;
            Bitmap bitmap;try(PdfRenderer.Page p=renderer.openPage(number)){int width=2200;int height=Math.max(1,(int)((long)width*p.getHeight()/p.getWidth()));if(height>3400){width=Math.max(1,(int)((long)width*3400/height));height=3400;}bitmap=Bitmap.createBitmap(width,height,Bitmap.Config.ARGB_8888);bitmap.eraseColor(Color.WHITE);p.render(bitmap,null,null,PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);}
            runOnUiThread(()->{if(isDestroyed()||generation!=token){bitmap.recycle();return;}
                ZoomPage img=new ZoomPage(bitmap);body.addView(img,new LinearLayout.LayoutParams(-1,0,1));
                LinearLayout tools=new LinearLayout(this);body.addView(tools);
                String[] labels={"−","Fit","+","Prev","Next"};Runnable[] actions={()->img.change(0.7f),img::reset,()->img.change(1.5f),()->page(number-1),()->page(number+1)};
                for(int i=0;i<labels.length;i++){final int k=i;Button btn=new Button(this);btn.setText(labels[i]);btn.setMinWidth(0);btn.setMinimumWidth(0);btn.setPadding(0,0,0,0);btn.setEnabled(i!=3||number>0);if(i==4)btn.setEnabled(number+1<total);btn.setOnClickListener(v->actions[k].run());tools.addView(btn,new LinearLayout.LayoutParams(0,-2,1));}
            });
        }catch(Exception e){runOnUiThread(()->{if(!isDestroyed()&&generation==token)body.addView(label("Unable to open page",16));});}});
    }
    @Override public void onBackPressed(){if(!busy&&book!=null)home();else super.onBackPressed();}
    @Override protected void onDestroy(){worker.shutdown();super.onDestroy();}
}

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
    private File book,index,libraryRoot;
    private String bookId="legacy";
    private boolean night=false;
    private android.content.SharedPreferences prefs(){return getPreferences(MODE_PRIVATE);}
    private String key(String suffix){return "study."+bookId+"."+suffix;}
    private void selectBook(String id){bookId=id;File dir=id.equals("legacy")?libraryRoot:new File(libraryRoot,id);book=new File(dir,"book.pdf");index=new File(dir,"book.sqlite");pageCount=0;currentPage=0;lastQuery="";prefs().edit().putString("selectedBook",id).apply();}
    private String titleFor(String id){return prefs().getString(id.equals("legacy")?"bookTitle":"study."+id+".title","").trim();}
    private java.util.TreeSet<Integer> bookmarks(){java.util.TreeSet<Integer> out=new java.util.TreeSet<>();for(String n:prefs().getString(key("bookmarks"),"").split(",")){try{out.add(Integer.parseInt(n));}catch(NumberFormatException ignored){}}return out;}
    private void toggleBookmark(int number){java.util.TreeSet<Integer> set=bookmarks();if(!set.add(number))set.remove(number);StringBuilder b=new StringBuilder();for(int n:set){if(b.length()>0)b.append(",");b.append(n);}prefs().edit().putString(key("bookmarks"),b.toString()).apply();}
    private void bookmarkDialog(){java.util.ArrayList<Integer> pages=new java.util.ArrayList<>(bookmarks());if(pages.isEmpty()){Toast.makeText(this,"No bookmarks yet",Toast.LENGTH_SHORT).show();return;}String[] labels=new String[pages.size()];for(int i=0;i<labels.length;i++)labels[i]="PDF page "+(pages.get(i)+1);new AlertDialog.Builder(this).setTitle("Bookmarks").setItems(labels,(d,w)->page(pages.get(w))).setNegativeButton("Close",null).show();}
    private void goToPage(int total){EditText input=new EditText(this);input.setInputType(android.text.InputType.TYPE_CLASS_NUMBER);input.setHint("1–"+total);AlertDialog dialog=new AlertDialog.Builder(this).setTitle("Go to PDF page").setView(input).setPositiveButton("Go",null).setNegativeButton("Cancel",null).create();dialog.setOnShowListener(d->dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{try{int n=Integer.parseInt(input.getText().toString());if(n<1||n>total)throw new NumberFormatException();dialog.dismiss();page(n-1);}catch(NumberFormatException e){input.setError("Enter a page from 1 to "+total);}}));dialog.show();}
    private int generation=0;
    private boolean busy=false;
    private int currentPage=0;
    private int pageCount=0;
    private Bitmap displayedBitmap;
    
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
        libraryRoot=dir;String selected=prefs().getString("selectedBook","legacy");if(!selected.equals("legacy")&&(!selected.matches("volume-[a-f0-9-]+")||!new File(new File(dir,selected),"book.pdf").isFile()))selected="legacy";selectBook(selected);night=prefs().getBoolean("study.night",false);
        home();
    }
    private int dp(int n){return Math.round(n*getResources().getDisplayMetrics().density);}
    private TextView label(String s,int size){TextView t=new TextView(this);t.setText(s);t.setTextSize(size);t.setTextColor(0xff183654);t.setPadding(0,dp(8),0,dp(8));return t;}
    private void button(String s,Runnable r){Button b=new Button(this);b.setText(s);b.setAllCaps(false);b.setOnClickListener(v->r.run());body.addView(b);}
    private void releaseBitmap(){if(displayedBitmap!=null){displayedBitmap=null;}}
    private void layout(){releaseBitmap();ScrollView sc=new ScrollView(this);body=new LinearLayout(this);body.setOrientation(1);body.setPadding(dp(16),dp(16),dp(16),dp(16));sc.addView(body);setContentView(sc);}
    private void home(){generation++;layout();button("← Back to Slashpromo Home",()->{startActivity(new Intent(this,DirectoryActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP));finish();});body.addView(label("My Medical Library",26));body.addView(label("Private • Offline • No search uploads",14));status=label(index.isFile()&&book.isFile()?"Book ready for offline search":"Add your personal PDF once to enable offline search.",16);body.addView(status);
        if(busy){status.setText("Preparing library…");return;}
        button("Add another PDF (keep existing books)",()->{Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.setType("application/pdf");i.addCategory(Intent.CATEGORY_OPENABLE);startActivityForResult(i,PICK);});
        File[] volumes=libraryRoot.listFiles(f->f.isDirectory()&&f.getName().matches("volume-[a-f0-9-]+")&&new File(f,"book.pdf").isFile()&&new File(f,"book.sqlite").isFile());
        if(new File(libraryRoot,"book.pdf").isFile()&&new File(libraryRoot,"book.sqlite").isFile()){String title=titleFor("legacy");button((bookId.equals("legacy")?"✓ ":"")+(title.isEmpty()?"Original medical book":title),()->{selectBook("legacy");home();});}
        if(volumes!=null){java.util.Arrays.sort(volumes,java.util.Comparator.comparingLong(File::lastModified).reversed());for(File volume:volumes){String id=volume.getName(),title=titleFor(id);button((bookId.equals(id)?"✓ ":"")+(title.isEmpty()?"Medical PDF":title),()->{selectBook(id);home();});}}
        if(book.isFile()&&index.isFile()){
            final int infoToken=generation;
            TextView details=label("Reading saved book information…",15);body.addView(details);
            worker.execute(()->{
                try {
                    int total;
                    try(ParcelFileDescriptor fd=ParcelFileDescriptor.open(book,ParcelFileDescriptor.MODE_READ_ONLY)){
                        // PdfRenderer owns its descriptor after construction.
                        PdfRenderer reader=new PdfRenderer(ParcelFileDescriptor.dup(fd.getFileDescriptor()));
                        try{total=reader.getPageCount();}finally{reader.close();}
                    }
                    long indexed,searchable;
                    try(SQLiteDatabase db=SQLiteDatabase.openDatabase(index.getPath(),null,SQLiteDatabase.OPEN_READONLY);
                        Cursor c=db.rawQuery("SELECT count(*),sum(CASE WHEN length(trim(content))>0 THEN 1 ELSE 0 END) FROM pages",null)){
                        c.moveToFirst();indexed=c.getLong(0);searchable=c.getLong(1);
                    }
                    String title=titleFor(bookId);
                    if(title.isEmpty()){
                        try(PDDocument doc=PDDocument.load(book,com.tom_roush.pdfbox.io.MemoryUsageSetting.setupTempFileOnly())){
                            String embedded=doc.getDocumentInformation().getTitle();if(embedded!=null)title=embedded.trim();
                        }catch(IOException ignored){}
                    }
                    if(title.isEmpty())title="Imported medical PDF (original filename unavailable)";
                    final String description=title+"\nPDF pages: "+total+"\nIndexed pages: "+indexed+" / "+total+"\nPages with searchable text: "+searchable+"\nLocal file size: "+String.format(java.util.Locale.ROOT,"%.1f MB",book.length()/1048576.0)+"\n"+(indexed==total?"Page-count check passed":"Page-count mismatch — review import");
                    runOnUiThread(()->{if(!isDestroyed()&&generation==infoToken)details.setText(description);});
                }catch(Exception e){runOnUiThread(()->{if(!isDestroyed()&&generation==infoToken)details.setText("Unable to verify book information; existing PDF preserved.");});}
            });
            search=new EditText(this);search.setSingleLine(true);search.setHint("Search any medical topic");search.setText(lastQuery);body.addView(search);button("Search whole book",()->find(search.getText().toString()));button("Resume reading • page "+(prefs().getInt(key("lastPage"),0)+1),()->page(prefs().getInt(key("lastPage"),0)));button("Open first page",()->page(0));button("Bookmarks",this::bookmarkDialog);
        }
    }
    @Override protected void onActivityResult(int req,int result,Intent data){super.onActivityResult(req,result,data);if(req==32){if(result==RESULT_OK)init();else finish();return;}if(req==PICK&&result==RESULT_OK&&data!=null&&data.getData()!=null&&!busy){importBook(data.getData());}}
    private void importBook(android.net.Uri uri){
        busy=true;home();worker.execute(()->{
            String importedName="";
            try(Cursor c=getContentResolver().query(uri,new String[]{android.provider.OpenableColumns.DISPLAY_NAME},null,null,null)){if(c!=null&&c.moveToFirst())importedName=c.getString(0);}catch(Exception ignored){}
            if(importedName==null)importedName="";
            String id="volume-"+java.util.UUID.randomUUID().toString();File staging=new File(libraryRoot,"pending-"+id),volume=new File(libraryRoot,id);File pending=new File(staging,"book.pdf"), dbFile=new File(staging,"book.sqlite");
            try{
                if(!staging.mkdir())throw new IOException("Cannot prepare new book");
                try(InputStream in=getContentResolver().openInputStream(uri);OutputStream out=new FileOutputStream(pending)){
                    if(in==null)throw new IOException("Cannot read PDF");byte[] buf=new byte[65536];int n;long bytes=0;while((n=in.read(buf))!=-1){bytes+=n;if(bytes>1024L*1024*1024)throw new IOException("PDF exceeds 1 GB");out.write(buf,0,n);}
                }
                try(PDDocument doc=PDDocument.load(pending,com.tom_roush.pdfbox.io.MemoryUsageSetting.setupTempFileOnly())){
                    SQLiteDatabase db=SQLiteDatabase.openOrCreateDatabase(dbFile,null);
                    try{db.execSQL("CREATE VIRTUAL TABLE pages USING fts4(content, tokenize=unicode61)");PDFTextStripper stripper=new PDFTextStripper();stripper.setSortByPosition(true);int total=doc.getNumberOfPages();int readable=0;
                        db.beginTransaction();try{for(int p=1;p<=total;p++){stripper.setStartPage(p);stripper.setEndPage(p);String text=stripper.getText(doc).replaceAll("[\\u00ad\\u200b]","").replaceAll("\\s+"," ").trim();if(!text.isEmpty())readable++;db.execSQL("INSERT INTO pages(docid,content) VALUES(?,?)",new Object[]{p,text});if(p%25==0){final int done=p;runOnUiThread(()->{if(!isDestroyed())status.setText("Indexing "+done+" / "+total+" pages");});}}if(readable==0)throw new IOException("No searchable text; OCR not supported yet");db.setTransactionSuccessful();}finally{db.endTransaction();}
                    }finally{db.close();}
                }
                // Publish a new independent volume only after PDF and index are complete.
                if(!staging.renameTo(volume))throw new IOException("Cannot activate new book");
                prefs().edit().putString("study."+id+".title",importedName).apply();runOnUiThread(()->{busy=false;if(!isDestroyed()){selectBook(id);home();}});
            }catch(Exception e){pending.delete();dbFile.delete();staging.delete();runOnUiThread(()->{busy=false;if(!isDestroyed()){home();status.setText("Import failed. Check file and free storage, then retry.");}});}
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
        private float zoom=1,base=1,x=0,y=0;private Bitmap bitmap;private boolean multiTouch=false;private float downX,downY;
        ZoomPage(Bitmap image){super(LibraryActivity.this);bitmap=image;setImageBitmap(image);setScaleType(ScaleType.MATRIX);setBackgroundColor(Color.WHITE);
            pinch=new ScaleGestureDetector(LibraryActivity.this,new ScaleGestureDetector.SimpleOnScaleGestureListener(){@Override public boolean onScale(ScaleGestureDetector d){scaleTo(zoom*d.getScaleFactor(),d.getFocusX(),d.getFocusY());return true;}});
            gestures=new GestureDetector(LibraryActivity.this,new GestureDetector.SimpleOnGestureListener(){@Override public boolean onDown(android.view.MotionEvent e){return true;}@Override public boolean onDoubleTap(android.view.MotionEvent e){scaleTo(zoom>1.1f?1:2.5f,e.getX(),e.getY());return true;}@Override public boolean onScroll(android.view.MotionEvent a,android.view.MotionEvent b,float dx,float dy){if(!pinch.isInProgress()&&zoom>1.05f){x-=dx;y-=dy;apply();}return true;}});
        }
        @Override protected void onSizeChanged(int w,int h,int oldw,int oldh){super.onSizeChanged(w,h,oldw,oldh);if(bitmap==null||w==0||h==0)return;base=Math.min((float)w/bitmap.getWidth(),(float)h/bitmap.getHeight());zoom=1;x=0;y=0;apply();}
        void scaleTo(float value,float fx,float fy){float z=Math.max(1,Math.min(5,value));float ratio=z/zoom;x=fx-(fx-x)*ratio;y=fy-(fy-y)*ratio;zoom=z;apply();}
        void change(float f){scaleTo(zoom*f,getWidth()/2f,getHeight()/2f);}
        void reset(){scaleTo(1,getWidth()/2f,getHeight()/2f);}
        private void apply(){float w=bitmap.getWidth()*base*zoom,h=bitmap.getHeight()*base*zoom;x=w<=getWidth()?(getWidth()-w)/2f:Math.max(getWidth()-w,Math.min(0,x));y=h<=getHeight()?(getHeight()-h)/2f:Math.max(getHeight()-h,Math.min(0,y));transform.setScale(base*zoom,base*zoom);transform.postTranslate(x,y);setImageMatrix(transform);}
        @Override public boolean onTouchEvent(android.view.MotionEvent e){if(e.getActionMasked()==MotionEvent.ACTION_DOWN){multiTouch=false;downX=e.getX();downY=e.getY();}if(e.getPointerCount()>1)multiTouch=true;pinch.onTouchEvent(e);gestures.onTouchEvent(e);if(e.getActionMasked()==MotionEvent.ACTION_UP&&!multiTouch&&zoom<=1.05f){float dx=e.getX()-downX,dy=e.getY()-downY;if(Math.abs(dx)>dp(70)&&Math.abs(dx)>Math.abs(dy)*1.5f){int next=currentPage+(dx<0?1:-1);if(next>=0&&next<pageCount)page(next);}}return true;}
    }
    private void page(int number){if(number<0||(pageCount>0&&number>=pageCount))return;int token=++generation;currentPage=number;releaseBitmap();
        body=new LinearLayout(this);body.setOrientation(1);body.setPadding(dp(6),dp(6),dp(6),dp(6));setContentView(body);
        LinearLayout bar=new LinearLayout(this);body.addView(bar);
        Button back=new Button(this);back.setText(lastQuery.isEmpty()?"Library":"Results");back.setOnClickListener(v->{if(lastQuery.isEmpty())home();else find(lastQuery);});bar.addView(back,new LinearLayout.LayoutParams(0,-2,1));
        Button lib=new Button(this);lib.setText("Library");lib.setOnClickListener(v->home());bar.addView(lib,new LinearLayout.LayoutParams(0,-2,1));
        TextView pageLabel=label("Loading PDF page "+(number+1)+"…",16);body.addView(pageLabel);
        worker.execute(()->{try(ParcelFileDescriptor fd=ParcelFileDescriptor.open(book,ParcelFileDescriptor.MODE_READ_ONLY);PdfRenderer renderer=new PdfRenderer(ParcelFileDescriptor.dup(fd.getFileDescriptor()))){
            int total=renderer.getPageCount();if(number<0||number>=total)return;
            Bitmap bitmap;try(PdfRenderer.Page p=renderer.openPage(number)){int width=2200;int height=Math.max(1,(int)((long)width*p.getHeight()/p.getWidth()));if(height>3400){width=Math.max(1,(int)((long)width*3400/height));height=3400;}bitmap=Bitmap.createBitmap(width,height,Bitmap.Config.ARGB_8888);bitmap.eraseColor(Color.WHITE);p.render(bitmap,null,null,PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);}
            runOnUiThread(()->{if(isDestroyed()||generation!=token){bitmap.recycle();return;}
                pageCount=total;displayedBitmap=bitmap;prefs().edit().putInt(key("lastPage"),number).apply();pageLabel.setText("PDF page "+(number+1)+" / "+total+" • "+Math.round(100.0*(number+1)/total)+"% position");
                ZoomPage img=new ZoomPage(bitmap);if(night)img.setColorFilter(new ColorMatrixColorFilter(new float[]{-1,0,0,0,255,0,-1,0,0,255,0,0,-1,0,255,0,0,0,1,0}));body.addView(img,new LinearLayout.LayoutParams(-1,0,1));
                LinearLayout tools=new LinearLayout(this);body.addView(tools);
                String[] labels={"−","Fit","+","Go to","Night"};Runnable[] actions={()->img.change(0.7f),img::reset,()->img.change(1.5f),()->goToPage(total),()->{night=!night;prefs().edit().putBoolean("study.night",night).apply();page(number);}};
                for(int i=0;i<labels.length;i++){final int k=i;Button btn=new Button(this);btn.setText(labels[i]);btn.setMinWidth(0);btn.setMinimumWidth(0);btn.setPadding(0,0,0,0);btn.setOnClickListener(v->actions[k].run());tools.addView(btn,new LinearLayout.LayoutParams(0,-2,1));}
                LinearLayout marks=new LinearLayout(this);body.addView(marks);Button mark=new Button(this);mark.setText(bookmarks().contains(number)?"★ Saved":"☆ Bookmark");mark.setOnClickListener(v->{toggleBookmark(number);mark.setText(bookmarks().contains(number)?"★ Saved":"☆ Bookmark");});marks.addView(mark,new LinearLayout.LayoutParams(0,-2,1));Button list=new Button(this);list.setText("Bookmarks");list.setOnClickListener(v->bookmarkDialog());marks.addView(list,new LinearLayout.LayoutParams(0,-2,1));
                LinearLayout nav=new LinearLayout(this);body.addView(nav);Button prev=new Button(this);prev.setText("← Previous");prev.setEnabled(number>0);prev.setOnClickListener(v->page(number-1));nav.addView(prev,new LinearLayout.LayoutParams(0,dp(52),1));Button next=new Button(this);next.setText("Next →");next.setEnabled(number+1<total);next.setOnClickListener(v->page(number+1));nav.addView(next,new LinearLayout.LayoutParams(0,dp(52),1));
            });
        }catch(Exception e){runOnUiThread(()->{if(!isDestroyed()&&generation==token)body.addView(label("Unable to open page",16));});}});
    }
    @Override public void onBackPressed(){if(!busy&&book!=null)home();else super.onBackPressed();}
    @Override protected void onDestroy(){generation++;releaseBitmap();worker.shutdown();super.onDestroy();}
}

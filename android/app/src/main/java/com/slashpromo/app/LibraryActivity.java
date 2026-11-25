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
    private boolean night=false, fullscreen=false;
    private String pageKey(String type,int number){return key(type+"."+number);}
    private void rememberPage(int number){
        java.util.LinkedHashSet<Integer> pages=new java.util.LinkedHashSet<>();pages.add(number);
        for(String value:prefs().getString(key("history"),"").split(",")){try{int p=Integer.parseInt(value);if(p>=0)pages.add(p);}catch(NumberFormatException ignored){}}
        StringBuilder out=new StringBuilder();int count=0;for(int p:pages){if(count++>=100)break;if(out.length()>0)out.append(",");out.append(p);}
        prefs().edit().putInt(key("lastPage"),number).putString(key("history"),out.toString()).apply();
    }
    private void history(){
        java.util.ArrayList<Integer> pages=new java.util.ArrayList<>();for(String n:prefs().getString(key("history"),"").split(",")){try{int p=Integer.parseInt(n);if(p>=0)pages.add(p);}catch(NumberFormatException ignored){}}
        if(pages.isEmpty()){Toast.makeText(this,"No reading history yet",Toast.LENGTH_SHORT).show();return;}
        String[] labels=new String[pages.size()];for(int i=0;i<labels.length;i++)labels[i]="PDF page "+(pages.get(i)+1);
        new AlertDialog.Builder(this).setTitle("Recently read pages").setItems(labels,(d,w)->page(pages.get(w))).setNegativeButton("Close",null).show();
    }
    private void studyNote(int number){
        final String storageKey=pageKey("note",number);EditText input=new EditText(this);input.setGravity(Gravity.TOP);input.setMinLines(5);input.setInputType(android.text.InputType.TYPE_CLASS_TEXT|android.text.InputType.TYPE_TEXT_FLAG_MULTI_LINE);input.setFilters(new android.text.InputFilter[]{new android.text.InputFilter.LengthFilter(20000)});input.setText(prefs().getString(storageKey,""));
        new AlertDialog.Builder(this).setTitle("Study notes • PDF page "+(number+1)).setView(input).setPositiveButton("Save",(d,w)->prefs().edit().putString(storageKey,input.getText().toString()).apply()).setNegativeButton("Cancel",null).show();
    }
    private void savedNotes(){
        String prefix=key("note.");java.util.TreeMap<Integer,String> notes=new java.util.TreeMap<>();
        for(java.util.Map.Entry<String,?> entry:prefs().getAll().entrySet()){if(entry.getKey().startsWith(prefix)&&entry.getValue() instanceof String){try{int p=Integer.parseInt(entry.getKey().substring(prefix.length()));String note=(String)entry.getValue();if(p>=0&&!note.trim().isEmpty())notes.put(p,note);}catch(NumberFormatException ignored){}}}
        if(notes.isEmpty()){Toast.makeText(this,"No study notes yet",Toast.LENGTH_SHORT).show();return;}
        java.util.ArrayList<Integer> pages=new java.util.ArrayList<>(notes.keySet());String[] labels=new String[pages.size()];for(int i=0;i<labels.length;i++){int p=pages.get(i);String n=notes.get(p);labels[i]="Page "+(p+1)+" • "+n.substring(0,Math.min(n.length(),100));}
        new AlertDialog.Builder(this).setTitle("Saved study notes").setItems(labels,(d,w)->page(pages.get(w))).setNegativeButton("Close",null).show();
    }

    private void revisionHub(){
        final String id=bookId;final String prefix=key("highlights.");
        java.util.TreeSet<Integer> pages=new java.util.TreeSet<>(bookmarks());
        pages.removeIf(p->p<0);
        java.util.Set<Integer> marked=new java.util.HashSet<>(),noted=new java.util.HashSet<>();
        for(java.util.Map.Entry<String,?> e:prefs().getAll().entrySet()){
            if(!(e.getValue() instanceof String))continue;
            String k=e.getKey(),value=(String)e.getValue();
            try{
                if(k.startsWith(prefix)&&new org.json.JSONArray(value).length()>0){int p=Integer.parseInt(k.substring(prefix.length()));if(p>=0){marked.add(p);pages.add(p);}}
                String np=key("note.");
                if(k.startsWith(np)&&!value.trim().isEmpty()){int p=Integer.parseInt(k.substring(np.length()));if(p>=0){noted.add(p);pages.add(p);}}
            }catch(Exception ignored){}
        }
        java.util.ArrayList<Integer> all=new java.util.ArrayList<>(pages);
        LinearLayout panel=new LinearLayout(this);panel.setOrientation(1);panel.setPadding(dp(12),dp(8),dp(12),dp(8));
        panel.addView(label(all.size()+" revision pages • "+marked.size()+" highlighted • "+noted.size()+" with notes",15));
        EditText filter=new EditText(this);filter.setHint("Search saved notes or page number");filter.setSingleLine(true);panel.addView(filter);
        Spinner mode=new Spinner(this);mode.setAdapter(new ArrayAdapter<String>(this,android.R.layout.simple_spinner_dropdown_item,new String[]{"All saved pages","Highlights","Notes","Bookmarks"}));panel.addView(mode);
        TextView empty=label("",14);panel.addView(empty);
        ListView list=new ListView(this);panel.addView(list,new LinearLayout.LayoutParams(-1,dp(240)));
        java.util.ArrayList<Integer> visible=new java.util.ArrayList<>();
        ArrayAdapter<String> adapter=new ArrayAdapter<>(this,android.R.layout.simple_list_item_1,new java.util.ArrayList<String>());list.setAdapter(adapter);
        java.util.Set<Integer> saved=bookmarks();
        Runnable refresh=()->{visible.clear();adapter.clear();String q=filter.getText().toString().trim().toLowerCase(java.util.Locale.ROOT);int m=mode.getSelectedItemPosition();for(int p:all){
            if((m==1&&!marked.contains(p))||(m==2&&!noted.contains(p))||(m==3&&!saved.contains(p)))continue;
            String note=prefs().getString(pageKey("note",p),"");String row="PDF page "+(p+1)+(marked.contains(p)?" • Highlighted":"")+(saved.contains(p)?" • Bookmarked":"")+(noted.contains(p)?" • Note":"");
            if(!q.isEmpty()&&!row.toLowerCase(java.util.Locale.ROOT).contains(q)&&!note.toLowerCase(java.util.Locale.ROOT).contains(q))continue;
            visible.add(p);adapter.add(row+(note.trim().isEmpty()?"":"\n"+note.substring(0,Math.min(160,note.length()))));
        }adapter.notifyDataSetChanged();empty.setText(all.isEmpty()?"No saved revision pages yet":visible.isEmpty()?"No matching revision pages":"");empty.setVisibility(visible.isEmpty()?View.VISIBLE:View.GONE);};
        AlertDialog dialog=new AlertDialog.Builder(this).setTitle("Revision centre").setView(panel).setNegativeButton("Close",null).create();
        filter.addTextChangedListener(new android.text.TextWatcher(){public void beforeTextChanged(CharSequence x,int a,int c,int f){}public void onTextChanged(CharSequence x,int a,int b,int c){refresh.run();}public void afterTextChanged(android.text.Editable e){}});
        mode.setOnItemSelectedListener(new android.widget.AdapterView.OnItemSelectedListener(){public void onItemSelected(android.widget.AdapterView<?> parent,View v,int pos,long row){refresh.run();}public void onNothingSelected(android.widget.AdapterView<?> parent){}});
        list.setOnItemClickListener((parent,v,pos,row)->{if(bookId.equals(id)&&pos>=0&&pos<visible.size()){int p=visible.get(pos);dialog.dismiss();page(p);}});
        dialog.show();refresh.run();
    }
    private void setFullscreen(boolean enabled){
        fullscreen=enabled;getWindow().getDecorView().setSystemUiVisibility(enabled?(View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY):0);
    }
    private static final class Chapter {
        final String title; final int page,depth;
        Chapter(String t,int p,int d){title=t;page=p;depth=d;}
    }
    private final java.util.Map<String,java.util.List<Chapter>> chapterCache=new java.util.concurrent.ConcurrentHashMap<>();
    private Chapter activeChapter(java.util.List<Chapter> rows,int p){Chapter best=null;if(rows!=null)for(Chapter c:rows)if(c.page<=p&&(best==null||c.page>best.page||(c.page==best.page&&c.depth>=best.depth)))best=c;return best;}
    private void collectChapters(PDDocument doc,com.tom_roush.pdfbox.pdmodel.interactive.documentnavigation.outline.PDOutlineItem item,int depth,java.util.List<Chapter> rows,java.util.Set<Object> seen,int[] visited){
        if(depth>20)return;
        while(item!=null&&visited[0]++<20000&&seen.add(item.getCOSObject())){
            String title=item.getTitle();
            try{
                com.tom_roush.pdfbox.pdmodel.PDPage target=item.findDestinationPage(doc);
                int p=target==null?-1:doc.getPages().indexOf(target);
                if(title!=null&&!title.trim().isEmpty()&&p>=0&&p<doc.getNumberOfPages())rows.add(new Chapter(title.trim(),p,depth));
            }catch(Exception ignored){}
            collectChapters(doc,item.getFirstChild(),depth+1,rows,seen,visited);
            item=item.getNextSibling();
        }
    }
    private void chapters(){
        final File source=book;final String id=bookId;final int token=generation;
        final Dialog dialog=new Dialog(this);
        LinearLayout panel=new LinearLayout(this);panel.setOrientation(1);panel.setPadding(dp(12),dp(12),dp(12),dp(12));panel.setBackgroundColor(Color.WHITE);
        panel.addView(label("Chapter index",23));
        TextView note=label("Reading embedded PDF contents…",14);panel.addView(note);
        EditText filter=new EditText(this);filter.setSingleLine(true);filter.setHint("Find chapter");panel.addView(filter);
        CheckBox topOnly=new CheckBox(this);topOnly.setText("Main chapters only");panel.addView(topOnly);
        ListView list=new ListView(this);panel.addView(list,new LinearLayout.LayoutParams(-1,0,1));
        Button close=new Button(this);close.setText("Close");close.setOnClickListener(v->dialog.dismiss());panel.addView(close);
        dialog.setContentView(panel);dialog.show();
        Window win=dialog.getWindow();if(win!=null){win.setBackgroundDrawableResource(android.R.color.transparent);win.setGravity(Gravity.START|Gravity.TOP);win.setLayout(Math.min(dp(380),(int)(getResources().getDisplayMetrics().widthPixels*0.88)),(int)(getResources().getDisplayMetrics().heightPixels*0.88));win.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE|WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN);}
        worker.execute(()->{
            java.util.List<Chapter> rows=chapterCache.get(id);String error=null;
            if(rows==null){rows=new java.util.ArrayList<>();try(PDDocument doc=PDDocument.load(source,com.tom_roush.pdfbox.io.MemoryUsageSetting.setupTempFileOnly())){
                com.tom_roush.pdfbox.pdmodel.interactive.documentnavigation.outline.PDDocumentOutline outline=doc.getDocumentCatalog().getDocumentOutline();
                if(outline!=null)collectChapters(doc,outline.getFirstChild(),0,rows,java.util.Collections.newSetFromMap(new java.util.IdentityHashMap<Object,Boolean>()),new int[]{0});
                chapterCache.put(id,rows);
            }catch(Exception e){error="Unable to read PDF chapter index.";}}
            final java.util.List<Chapter> all=rows;final String problem=error;
            runOnUiThread(()->{if(isDestroyed()||!dialog.isShowing()||generation!=token||!bookId.equals(id))return;
                if(problem!=null||all.isEmpty()){note.setText(problem!=null?problem:"This PDF has no usable embedded chapter links. Use Search or Go to page.");filter.setEnabled(false);return;}
                final Chapter active=activeChapter(all,currentPage);note.setText(all.size()+" linked sections"+(active==null?"":"\nCurrent: "+active.title));
                java.util.ArrayList<Chapter> visible=new java.util.ArrayList<>();
                ArrayAdapter<String> adapter=new ArrayAdapter<>(this,android.R.layout.simple_list_item_1,new java.util.ArrayList<String>());list.setAdapter(adapter);
                Runnable refresh=()->{visible.clear();adapter.clear();String q=filter.getText().toString().trim().toLowerCase(java.util.Locale.ROOT);for(Chapter c:all){if((topOnly.isChecked()&&c.depth>0)||!c.title.toLowerCase(java.util.Locale.ROOT).contains(q))continue;visible.add(c);StringBuilder indent=new StringBuilder();for(int i=0;i<Math.min(c.depth,5);i++)indent.append("  ");adapter.add((c==active?"▶ ":"")+indent+c.title+"  ·  "+(c.page+1));}adapter.notifyDataSetChanged();};
                topOnly.setOnCheckedChangeListener((v,checked)->refresh.run());
                filter.addTextChangedListener(new android.text.TextWatcher(){public void beforeTextChanged(CharSequence x,int a,int c,int f){}public void onTextChanged(CharSequence x,int a,int b,int c){refresh.run();}public void afterTextChanged(android.text.Editable e){}});
                list.setOnItemClickListener((parent,v,pos,rowId)->{if(pos>=0&&pos<visible.size()&&generation==token&&bookId.equals(id)){int target=visible.get(pos).page;dialog.dismiss();page(target);}});
                refresh.run();int activeIndex=visible.indexOf(active);if(activeIndex>=0)list.setSelection(activeIndex);
            });
        });
    }
    private android.content.SharedPreferences prefs(){return getPreferences(MODE_PRIVATE);}
    private String key(String suffix){return "study."+bookId+"."+suffix;}
    private void selectBook(String id){bookId=id;File dir=id.equals("legacy")?libraryRoot:new File(libraryRoot,id);book=new File(dir,"book.pdf");index=new File(dir,"book.sqlite");pageCount=0;currentPage=0;lastQuery="";prefs().edit().putString("selectedBook",id).apply();}
    private String titleFor(String id){return prefs().getString(id.equals("legacy")?"bookTitle":"study."+id+".title","").trim();}
    private java.util.TreeSet<Integer> bookmarks(){java.util.TreeSet<Integer> out=new java.util.TreeSet<>();for(String n:prefs().getString(key("bookmarks"),"").split(",")){try{int p=Integer.parseInt(n);if(p>=0)out.add(p);}catch(NumberFormatException ignored){}}return out;}
    private void toggleBookmark(int number){java.util.TreeSet<Integer> set=bookmarks();if(!set.add(number))set.remove(number);StringBuilder b=new StringBuilder();for(int n:set){if(b.length()>0)b.append(",");b.append(n);}prefs().edit().putString(key("bookmarks"),b.toString()).apply();}
    private void bookmarkDialog(){java.util.ArrayList<Integer> pages=new java.util.ArrayList<>(bookmarks());if(pages.isEmpty()){Toast.makeText(this,"No bookmarks yet",Toast.LENGTH_SHORT).show();return;}String[] labels=new String[pages.size()];for(int i=0;i<labels.length;i++)labels[i]="PDF page "+(pages.get(i)+1);new AlertDialog.Builder(this).setTitle("Bookmarks").setItems(labels,(d,w)->page(pages.get(w))).setNegativeButton("Close",null).show();}
    private void goToPage(int total){EditText input=new EditText(this);input.setInputType(android.text.InputType.TYPE_CLASS_NUMBER);input.setHint("1–"+total);AlertDialog dialog=new AlertDialog.Builder(this).setTitle("Go to PDF page").setView(input).setPositiveButton("Go",null).setNegativeButton("Cancel",null).create();dialog.setOnShowListener(d->dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{try{int n=Integer.parseInt(input.getText().toString());if(n<1||n>total)throw new NumberFormatException();dialog.dismiss();page(n-1);}catch(NumberFormatException e){input.setError("Enter a page from 1 to "+total);}}));dialog.show();}
    private volatile int generation=0;
    private boolean busy=false;
    private int currentPage=0;
    private int pageCount=0;
    private Bitmap displayedBitmap;
    
    private String lastQuery="";
    private static final int PICK=31, SCAN=33;
    private boolean scannerOpening=false;
    @Override public void onCreate(Bundle b){
        super.onCreate(b);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        android.app.KeyguardManager kg=(android.app.KeyguardManager)getSystemService(KEYGUARD_SERVICE);
        if(!kg.isDeviceSecure()){new AlertDialog.Builder(this).setMessage("Set a secure screen lock in Android settings before using the private library.").setPositiveButton("Close",(d,w)->finish()).setOnCancelListener(d->finish()).show();return;}
        Intent auth=kg.createConfirmDeviceCredentialIntent("Private medical library","Unlock with your device credential");
        if(auth==null){finish();return;}startActivityForResult(auth,32);
    }
    private void scanBook(){
        if(busy||scannerOpening)return;
        scannerOpening=true;
        com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions options=
            new com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions.Builder()
            .setGalleryImportAllowed(true).setPageLimit(50)
            .setResultFormats(com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions.RESULT_FORMAT_PDF)
            .setScannerMode(com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions.SCANNER_MODE_FULL).build();
        com.google.mlkit.vision.documentscanner.GmsDocumentScanning.getClient(options)
            .getStartScanIntent(this).addOnSuccessListener(this,sender->{
                scannerOpening=false;if(isFinishing()||isDestroyed())return;
                try{startIntentSenderForResult(sender,SCAN,null,0,0,0);}
                catch(IntentSender.SendIntentException e){Toast.makeText(this,"Scanner unavailable; import a PDF instead.",Toast.LENGTH_LONG).show();}
            }).addOnFailureListener(this,e->{scannerOpening=false;Toast.makeText(this,"Scanner unavailable. Check Google Play services or import a PDF.",Toast.LENGTH_LONG).show();});
    }
    private void renameBook(){
        final String id=bookId;EditText input=new EditText(this);input.setSingleLine(true);
        input.setFilters(new android.text.InputFilter[]{new android.text.InputFilter.LengthFilter(160)});input.setText(titleFor(id));
        AlertDialog dialog=new AlertDialog.Builder(this).setTitle("Rename book").setView(input).setPositiveButton("Save",null).setNegativeButton("Cancel",null).create();
        dialog.setOnShowListener(d->dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{
            String title=input.getText().toString().trim();if(title.isEmpty()){input.setError("Enter a book title");return;}
            prefs().edit().putString(id.equals("legacy")?"bookTitle":"study."+id+".title",title).apply();dialog.dismiss();home();
        }));dialog.show();
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
    private void layout(){setFullscreen(false);releaseBitmap();ScrollView sc=new ScrollView(this);body=new LinearLayout(this);body.setOrientation(1);body.setPadding(dp(16),dp(16),dp(16),dp(16));sc.addView(body);setContentView(sc);}
    private void home(){generation++;layout();button("← Back to Slashpromo Home",()->{startActivity(new Intent(this,DirectoryActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP));finish();});body.addView(label("My Medical Library",26));body.addView(label("Private • Offline • No search uploads",14));status=label(index.isFile()&&book.isFile()?"Book ready for offline search":"Add your personal PDF once to enable offline search.",16);body.addView(status);
        if(busy){status.setText("Preparing library…");return;}
        button("Scan hard-copy book • up to 50 pages",this::scanBook);
        button("Add another PDF (keep existing books)",()->{Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.setType("application/pdf");i.addCategory(Intent.CATEGORY_OPENABLE);startActivityForResult(i,PICK);});
        File[] volumes=libraryRoot.listFiles(f->f.isDirectory()&&f.getName().matches("volume-[a-f0-9-]+")&&new File(f,"book.pdf").isFile()&&new File(f,"book.sqlite").isFile());
        if(new File(libraryRoot,"book.pdf").isFile()&&new File(libraryRoot,"book.sqlite").isFile()){String title=titleFor("legacy");button((bookId.equals("legacy")?"✓ ":"")+(title.isEmpty()?"Original medical book":title),()->{selectBook("legacy");home();});}
        if(volumes!=null){java.util.Arrays.sort(volumes,java.util.Comparator.comparingLong(File::lastModified).reversed());for(File volume:volumes){String id=volume.getName(),title=titleFor(id);button((bookId.equals(id)?"✓ ":"")+(title.isEmpty()?"Medical PDF":title),()->{selectBook(id);home();});}}
        if(book.isFile()&&index.isFile()){
            final int infoToken=generation;final File infoBook=book,infoIndex=index;final String infoId=bookId;final int resumePage=prefs().getInt(key("lastPage"),0);
            TextView details=label("Reading saved book information…",15);body.addView(details);
            worker.execute(()->{
                try {
                    int total;
                    try(ParcelFileDescriptor fd=ParcelFileDescriptor.open(infoBook,ParcelFileDescriptor.MODE_READ_ONLY)){
                        // PdfRenderer owns its descriptor after construction.
                        PdfRenderer reader=new PdfRenderer(ParcelFileDescriptor.dup(fd.getFileDescriptor()));
                        try{total=reader.getPageCount();}finally{reader.close();}
                    }
                    long indexed,searchable;
                    try(SQLiteDatabase db=SQLiteDatabase.openDatabase(infoIndex.getPath(),null,SQLiteDatabase.OPEN_READONLY);
                        Cursor c=db.rawQuery("SELECT count(*),sum(CASE WHEN length(trim(content))>0 THEN 1 ELSE 0 END) FROM pages",null)){
                        c.moveToFirst();indexed=c.getLong(0);searchable=c.getLong(1);
                    }
                    String title=titleFor(infoId);
                    if(title.isEmpty()){
                        try(PDDocument doc=PDDocument.load(infoBook,com.tom_roush.pdfbox.io.MemoryUsageSetting.setupTempFileOnly())){
                            String embedded=doc.getDocumentInformation().getTitle();if(embedded!=null)title=embedded.trim();
                        }catch(IOException ignored){}
                    }
                    if(title.isEmpty())title="Imported medical PDF (original filename unavailable)";
                    final String description=title+"\nPDF pages: "+total+"\nIndexed pages: "+indexed+" / "+total+"\nPages with searchable text: "+searchable+"\nLocal file size: "+String.format(java.util.Locale.ROOT,"%.1f MB",infoBook.length()/1048576.0)+"\nLast reading position: "+Math.min(total,Math.max(1,resumePage+1))+" / "+total+"\n"+(searchable==0?"Image-only PDF • reading available, text search unavailable\n":"")+(indexed==total?"Page-count check passed":"Page-count mismatch — review import");
                    runOnUiThread(()->{if(!isDestroyed()&&generation==infoToken)details.setText(description);});
                }catch(Exception e){runOnUiThread(()->{if(!isDestroyed()&&generation==infoToken)details.setText("Unable to verify book information; existing PDF preserved.");});}
            });
            button("Rename selected book",this::renameBook);
            search=new EditText(this);search.setSingleLine(true);search.setHint("Search any medical topic");search.setText(lastQuery);body.addView(search);button("Search whole book",()->find(search.getText().toString()));button("Resume reading • page "+(prefs().getInt(key("lastPage"),0)+1),()->page(prefs().getInt(key("lastPage"),0)));button("Open first page",()->page(0));button("Bookmarks",this::bookmarkDialog);button("Chapter index",this::chapters);button("Reading history",this::history);button("Saved study notes",this::savedNotes);button("Revision centre",this::revisionHub);
        }
    }
    @Override protected void onActivityResult(int req,int result,Intent data){super.onActivityResult(req,result,data);if(req==32){if(result==RESULT_OK)init();else finish();return;}if(req==SCAN&&result==RESULT_OK&&data!=null&&!busy&&libraryRoot!=null){com.google.mlkit.vision.documentscanner.GmsDocumentScanningResult scanned=com.google.mlkit.vision.documentscanner.GmsDocumentScanningResult.fromActivityResultIntent(data);if(scanned!=null&&scanned.getPdf()!=null){importBook(scanned.getPdf().getUri(),true);}return;}if(req==PICK&&result==RESULT_OK&&data!=null&&data.getData()!=null&&!busy&&libraryRoot!=null){importBook(data.getData(),false);}}
    private void importBook(android.net.Uri uri,boolean scanned){
        busy=true;home();worker.execute(()->{
            String importedName="";
            try(Cursor c=getContentResolver().query(uri,new String[]{android.provider.OpenableColumns.DISPLAY_NAME},null,null,null)){if(c!=null&&c.moveToFirst())importedName=c.getString(0);}catch(Exception ignored){}
            if(importedName==null)importedName="";if(scanned)importedName="Scanned book "+new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm",java.util.Locale.ROOT).format(new java.util.Date());
            String id="volume-"+java.util.UUID.randomUUID().toString();File staging=new File(libraryRoot,"pending-"+id),volume=new File(libraryRoot,id);File pending=new File(staging,"book.pdf"), dbFile=new File(staging,"book.sqlite");
            try{
                if(!staging.mkdir())throw new IOException("Cannot prepare new book");
                try(InputStream in=getContentResolver().openInputStream(uri);OutputStream out=new FileOutputStream(pending)){
                    if(in==null)throw new IOException("Cannot read PDF");byte[] buf=new byte[65536];int n;long bytes=0;while((n=in.read(buf))!=-1){bytes+=n;if(bytes>1024L*1024*1024)throw new IOException("PDF exceeds 1 GB");out.write(buf,0,n);}
                }
                try(PDDocument doc=PDDocument.load(pending,com.tom_roush.pdfbox.io.MemoryUsageSetting.setupTempFileOnly())){
                    SQLiteDatabase db=SQLiteDatabase.openOrCreateDatabase(dbFile,null);
                    try{db.execSQL("CREATE VIRTUAL TABLE pages USING fts4(content, tokenize=unicode61)");PDFTextStripper stripper=new PDFTextStripper();stripper.setSortByPosition(true);int total=doc.getNumberOfPages();if(total<=0)throw new IOException("Empty PDF");int readable=0;
                    int ocrPages=0;boolean ocrAvailable=true;
                    try(com.google.mlkit.vision.text.TextRecognizer recognizer=com.google.mlkit.vision.text.TextRecognition.getClient(com.google.mlkit.vision.text.latin.TextRecognizerOptions.DEFAULT_OPTIONS)){
                        db.beginTransaction();try{for(int p=1;p<=total;p++){stripper.setStartPage(p);stripper.setEndPage(p);String text=stripper.getText(doc).replaceAll("[\\u00ad\\u200b]","").replaceAll("\\s+"," ").trim();if(text.isEmpty()&&ocrAvailable&&ocrPages<100){ocrPages++;try{text=recognizePage(pending,p-1,recognizer);}catch(Exception e){ocrAvailable=false;}}if(!text.isEmpty())readable++;db.execSQL("INSERT INTO pages(docid,content) VALUES(?,?)",new Object[]{p,text});if(p%25==0){final int done=p;runOnUiThread(()->{if(!isDestroyed())status.setText("Indexing "+done+" / "+total+" pages");});}}db.setTransactionSuccessful();}finally{db.endTransaction();}
                    }
                    }finally{db.close();}
                }
                // Publish a new independent volume only after PDF and index are complete.
                if(!staging.renameTo(volume))throw new IOException("Cannot activate new book");
                prefs().edit().putString("study."+id+".title",importedName).apply();runOnUiThread(()->{busy=false;if(!isDestroyed()){selectBook(id);home();}});
            }catch(Exception e){pending.delete();dbFile.delete();staging.delete();runOnUiThread(()->{busy=false;if(!isDestroyed()){home();status.setText("Import failed. Check file and free storage, then retry.");}});}
        });
    }
    private String recognizePage(File source,int pageNumber,com.google.mlkit.vision.text.TextRecognizer recognizer) throws Exception{
        Bitmap image;
        try(ParcelFileDescriptor fd=ParcelFileDescriptor.open(source,ParcelFileDescriptor.MODE_READ_ONLY);
            PdfRenderer renderer=new PdfRenderer(ParcelFileDescriptor.dup(fd.getFileDescriptor()));
            PdfRenderer.Page p=renderer.openPage(pageNumber)){
            double scale=Math.min(2400.0/p.getWidth(),3200.0/p.getHeight());
            image=Bitmap.createBitmap(Math.max(1,(int)(p.getWidth()*scale)),Math.max(1,(int)(p.getHeight()*scale)),Bitmap.Config.ARGB_8888);
            image.eraseColor(Color.WHITE);p.render(image,null,null,PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);
        }
        // Do not recycle the bitmap while an asynchronous recognition task might still use it.
        com.google.android.gms.tasks.Task<com.google.mlkit.vision.text.Text> task=recognizer.process(com.google.mlkit.vision.common.InputImage.fromBitmap(image,0));
        task.addOnCompleteListener(t->image.recycle());
        return com.google.android.gms.tasks.Tasks.await(task,30,TimeUnit.SECONDS).getText().replaceAll("\\s+"," ").trim();
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
        private final String highlightKey;
        private final java.util.ArrayList<RectF> highlights=new java.util.ArrayList<>();
        private final Paint highlightPaint=new Paint();
        private boolean marking=false;private PointF start;private RectF preview;
        private void loadHighlights(){try{org.json.JSONArray arr=new org.json.JSONArray(prefs().getString(highlightKey,"[]"));for(int i=0;i<Math.min(arr.length(),500);i++){org.json.JSONArray a=arr.getJSONArray(i);RectF r=new RectF((float)a.getDouble(0),(float)a.getDouble(1),(float)a.getDouble(2),(float)a.getDouble(3));if(r.left>=0&&r.top>=0&&r.right<=1&&r.bottom<=1&&r.width()>0&&r.height()>0)highlights.add(r);}}catch(Exception ignored){}}
        private void saveHighlights(){org.json.JSONArray arr=new org.json.JSONArray();try{for(RectF r:highlights){org.json.JSONArray a=new org.json.JSONArray();a.put((double)r.left);a.put((double)r.top);a.put((double)r.right);a.put((double)r.bottom);arr.put(a);}prefs().edit().putString(highlightKey,arr.toString()).apply();}catch(org.json.JSONException ignored){}}
        void toggleMarking(Button button){marking=!marking;start=null;preview=null;button.setText(marking?"Done marking":"Highlight");if(marking)Toast.makeText(LibraryActivity.this,"Drag over a passage to highlight",Toast.LENGTH_SHORT).show();invalidate();}
        void undoHighlight(){if(!highlights.isEmpty()){highlights.remove(highlights.size()-1);saveHighlights();invalidate();}}
        private PointF normalizedPoint(float sx,float sy){Matrix inverse=new Matrix();if(!transform.invert(inverse))return null;float[] xy={sx,sy};inverse.mapPoints(xy);return new PointF(Math.max(0,Math.min(1,xy[0]/bitmap.getWidth())),Math.max(0,Math.min(1,xy[1]/bitmap.getHeight())));}
        private void drawMark(Canvas canvas,RectF r){RectF b=new RectF(r.left*bitmap.getWidth(),r.top*bitmap.getHeight(),r.right*bitmap.getWidth(),r.bottom*bitmap.getHeight());transform.mapRect(b);canvas.drawRect(b,highlightPaint);}
        @Override protected void onDraw(Canvas canvas){super.onDraw(canvas);highlightPaint.setColor(night?0x809b7c16:0x70ffd600);for(RectF r:highlights)drawMark(canvas,r);if(preview!=null)drawMark(canvas,preview);}
        private boolean markTouch(MotionEvent e){int action=e.getActionMasked();if(e.getPointerCount()>1||action==MotionEvent.ACTION_CANCEL){start=null;preview=null;invalidate();return true;}PointF p=normalizedPoint(e.getX(),e.getY());if(p==null)return true;if(action==MotionEvent.ACTION_DOWN){start=p;preview=null;}else if(start!=null&&(action==MotionEvent.ACTION_MOVE||action==MotionEvent.ACTION_UP)){preview=new RectF(Math.min(start.x,p.x),Math.min(start.y,p.y),Math.max(start.x,p.x),Math.max(start.y,p.y));if(action==MotionEvent.ACTION_UP){if(preview.width()>0.002f&&preview.height()>0.002f){if(highlights.size()<500){highlights.add(preview);saveHighlights();}else Toast.makeText(LibraryActivity.this,"Page highlight limit reached",Toast.LENGTH_SHORT).show();}preview=null;start=null;}}invalidate();return true;}
        ZoomPage(Bitmap image){super(LibraryActivity.this);highlightKey=pageKey("highlights",currentPage);bitmap=image;loadHighlights();setImageBitmap(image);setScaleType(ScaleType.MATRIX);setBackgroundColor(Color.WHITE);
            pinch=new ScaleGestureDetector(LibraryActivity.this,new ScaleGestureDetector.SimpleOnScaleGestureListener(){@Override public boolean onScale(ScaleGestureDetector d){scaleTo(zoom*d.getScaleFactor(),d.getFocusX(),d.getFocusY());return true;}});
            gestures=new GestureDetector(LibraryActivity.this,new GestureDetector.SimpleOnGestureListener(){@Override public boolean onDown(android.view.MotionEvent e){return true;}@Override public boolean onDoubleTap(android.view.MotionEvent e){scaleTo(zoom>1.1f?1:2.5f,e.getX(),e.getY());return true;}@Override public boolean onScroll(android.view.MotionEvent a,android.view.MotionEvent b,float dx,float dy){if(!pinch.isInProgress()&&zoom>1.05f){x-=dx;y-=dy;apply();}return true;}});
        }
        @Override protected void onSizeChanged(int w,int h,int oldw,int oldh){super.onSizeChanged(w,h,oldw,oldh);if(bitmap==null||w==0||h==0)return;base=Math.min((float)w/bitmap.getWidth(),(float)h/bitmap.getHeight());zoom=1;x=0;y=0;apply();}
        void scaleTo(float value,float fx,float fy){float z=Math.max(1,Math.min(5,value));float ratio=z/zoom;x=fx-(fx-x)*ratio;y=fy-(fy-y)*ratio;zoom=z;apply();}
        void change(float f){scaleTo(zoom*f,getWidth()/2f,getHeight()/2f);}
        void reset(){scaleTo(1,getWidth()/2f,getHeight()/2f);}
        private void apply(){float w=bitmap.getWidth()*base*zoom,h=bitmap.getHeight()*base*zoom;x=w<=getWidth()?(getWidth()-w)/2f:Math.max(getWidth()-w,Math.min(0,x));y=h<=getHeight()?(getHeight()-h)/2f:Math.max(getHeight()-h,Math.min(0,y));transform.setScale(base*zoom,base*zoom);transform.postTranslate(x,y);setImageMatrix(transform);}
        @Override public boolean onTouchEvent(android.view.MotionEvent e){if(marking)return markTouch(e);if(e.getActionMasked()==MotionEvent.ACTION_DOWN){multiTouch=false;downX=e.getX();downY=e.getY();}if(e.getPointerCount()>1)multiTouch=true;pinch.onTouchEvent(e);gestures.onTouchEvent(e);if(e.getActionMasked()==MotionEvent.ACTION_UP&&!multiTouch&&zoom<=1.05f){float dx=e.getX()-downX,dy=e.getY()-downY;if(Math.abs(dx)>dp(70)&&Math.abs(dx)>Math.abs(dy)*1.5f){int next=currentPage+(dx<0?1:-1);if(next>=0&&next<pageCount)page(next);}}return true;}
    }
    private void page(int number){if(number<0||(pageCount>0&&number>=pageCount))return;int token=++generation;final File source=book;currentPage=number;releaseBitmap();
        body=new LinearLayout(this);body.setOrientation(1);body.setPadding(dp(6),dp(6),dp(6),dp(6));setContentView(body);
        LinearLayout bar=new LinearLayout(this);body.addView(bar);
        Button back=new Button(this);back.setText(lastQuery.isEmpty()?"Library":"Results");back.setOnClickListener(v->{if(lastQuery.isEmpty())home();else find(lastQuery);});bar.addView(back,new LinearLayout.LayoutParams(0,-2,1));
        Button lib=new Button(this);lib.setText("Library");lib.setOnClickListener(v->home());bar.addView(lib,new LinearLayout.LayoutParams(0,-2,1));Button chapter=new Button(this);chapter.setText("☰ Chapters");chapter.setAllCaps(false);chapter.setOnClickListener(v->chapters());bar.addView(chapter,new LinearLayout.LayoutParams(0,-2,1));
        TextView pageLabel=label("Loading PDF page "+(number+1)+"…",16);body.addView(pageLabel);
        worker.execute(()->{if(isDestroyed()||generation!=token)return;try(ParcelFileDescriptor fd=ParcelFileDescriptor.open(source,ParcelFileDescriptor.MODE_READ_ONLY);PdfRenderer renderer=new PdfRenderer(ParcelFileDescriptor.dup(fd.getFileDescriptor()))){
            int total=renderer.getPageCount();if(number<0||number>=total){runOnUiThread(()->{if(!isDestroyed()&&generation==token){pageCount=total;pageLabel.setText("Saved page is outside this PDF. Return to library or open page 1.");}});return;}
            Bitmap bitmap;try(PdfRenderer.Page p=renderer.openPage(number)){int width=2200;int height=Math.max(1,(int)((long)width*p.getHeight()/p.getWidth()));if(height>3400){width=Math.max(1,(int)((long)width*3400/height));height=3400;}bitmap=Bitmap.createBitmap(width,height,Bitmap.Config.ARGB_8888);bitmap.eraseColor(Color.WHITE);p.render(bitmap,null,null,PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);}
            runOnUiThread(()->{if(isDestroyed()||generation!=token){bitmap.recycle();return;}
                pageCount=total;displayedBitmap=bitmap;rememberPage(number);pageLabel.setText("PDF page "+(number+1)+" / "+total+" • "+Math.round(100.0*(number+1)/total)+"% position");
                ZoomPage img=new ZoomPage(bitmap);if(night)img.setColorFilter(new ColorMatrixColorFilter(new float[]{-1,0,0,0,255,0,-1,0,0,255,0,0,-1,0,255,0,0,0,1,0}));body.addView(img,new LinearLayout.LayoutParams(-1,0,1));
                LinearLayout tools=new LinearLayout(this);body.addView(tools);
                String[] labels={"−","Fit","+","Go to","Night"};Runnable[] actions={()->img.change(0.7f),img::reset,()->img.change(1.5f),()->goToPage(total),()->{night=!night;prefs().edit().putBoolean("study.night",night).apply();page(number);}};
                for(int i=0;i<labels.length;i++){final int k=i;Button btn=new Button(this);btn.setText(labels[i]);btn.setMinWidth(0);btn.setMinimumWidth(0);btn.setPadding(0,0,0,0);btn.setOnClickListener(v->actions[k].run());tools.addView(btn,new LinearLayout.LayoutParams(0,-2,1));}
                LinearLayout marks=new LinearLayout(this);body.addView(marks);Button mark=new Button(this);mark.setText(bookmarks().contains(number)?"★ Saved":"☆ Bookmark");mark.setOnClickListener(v->{toggleBookmark(number);mark.setText(bookmarks().contains(number)?"★ Saved":"☆ Bookmark");});marks.addView(mark,new LinearLayout.LayoutParams(0,-2,1));Button list=new Button(this);list.setText("Bookmarks");list.setOnClickListener(v->bookmarkDialog());marks.addView(list,new LinearLayout.LayoutParams(0,-2,1));
                LinearLayout study=new LinearLayout(this);body.addView(study);Button highlight=new Button(this);highlight.setText("Highlight");highlight.setOnClickListener(v->img.toggleMarking(highlight));study.addView(highlight,new LinearLayout.LayoutParams(0,-2,1));Button undo=new Button(this);undo.setText("Undo mark");undo.setOnClickListener(v->img.undoHighlight());study.addView(undo,new LinearLayout.LayoutParams(0,-2,1));Button noteButton=new Button(this);noteButton.setText("Notes");noteButton.setOnClickListener(v->studyNote(number));study.addView(noteButton,new LinearLayout.LayoutParams(0,-2,1));Button revision=new Button(this);revision.setText("Revise");revision.setOnClickListener(v->revisionHub());study.addView(revision,new LinearLayout.LayoutParams(0,-2,1));
                LinearLayout nav=new LinearLayout(this);body.addView(nav);Button prev=new Button(this);prev.setText("← Previous");prev.setEnabled(number>0);prev.setOnClickListener(v->page(number-1));nav.addView(prev,new LinearLayout.LayoutParams(0,dp(52),1));Button next=new Button(this);next.setText("Next →");next.setEnabled(number+1<total);next.setOnClickListener(v->page(number+1));nav.addView(next,new LinearLayout.LayoutParams(0,dp(52),1));
                Button focus=new Button(this);focus.setAllCaps(false);body.addView(focus);Runnable applyFocus=()->{int visibility=fullscreen?View.GONE:View.VISIBLE;for(View view:new View[]{bar,pageLabel,tools,marks,study,nav})view.setVisibility(visibility);focus.setText(fullscreen?"Exit full screen":"Full-screen reading");};focus.setOnClickListener(v->{setFullscreen(!fullscreen);applyFocus.run();});applyFocus.run();
            });
        }catch(Exception e){runOnUiThread(()->{if(!isDestroyed()&&generation==token)body.addView(label("Unable to open page",16));});}});
    }
    @Override public void onBackPressed(){if(fullscreen){setFullscreen(false);page(currentPage);return;}if(!busy&&book!=null)home();else super.onBackPressed();}
    @Override protected void onDestroy(){generation++;releaseBitmap();worker.shutdown();super.onDestroy();}
}

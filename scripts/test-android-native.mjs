import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const app=read('android/app/build.gradle');
const manifest=read('android/app/src/main/AndroidManifest.xml');
const strings=read('android/app/src/main/res/values/strings.xml');
const workflow=read('.github/workflows/android-debug-apk.yml');
assert(app.includes("applicationId 'com.slashpromo.app'"));
assert(app.includes("applicationIdSuffix '.debug'"));
assert(!app.includes('androidbrowserhelper'));
assert(manifest.includes('android:name="android.permission.INTERNET"'));
assert(manifest.includes('android:allowBackup="false"'));
assert(manifest.includes('android:usesCleartextTraffic="false"'));
assert(manifest.includes('android:host="slashpromo.com"'));
assert(manifest.includes('android:name=".MainActivity"'));
const activity=read('android/app/src/main/java/com/slashpromo/app/MainActivity.java');
for(const marker of ['new WebView(this)','setAllowFileAccess(false)','setAllowContentAccess(false)','MIXED_CONTENT_NEVER_ALLOW','handler.cancel()','request.deny()','setAcceptThirdPartyCookies(web,false)','web.canGoBack()']) assert(activity.includes(marker),marker);
assert(!activity.includes('addJavascriptInterface'));
assert(!manifest.includes('android.permission.ACCESS_FINE_LOCATION'));
assert(!manifest.includes('android.permission.CAMERA'));
assert(!manifest.includes('android.permission.POST_NOTIFICATIONS'));
assert(strings.includes('https://slashpromo.com/?source=android'));
assert(workflow.includes('assembleDebug'));
assert(!workflow.includes('assembleRelease')&&!workflow.includes('bundleRelease'));
assert(existsSync(new URL('../android/app/src/main/res/drawable/ic_launcher.xml',import.meta.url)));
console.log('PASS Android native project structural and privacy tests');

const directory=read("android/app/src/main/java/com/slashpromo/app/DirectoryActivity.java");
assert(manifest.includes('android:name=".DirectoryActivity"'));
assert.equal((manifest.match(/android.intent.category.LAUNCHER/g)||[]).length,1);
for(const marker of ["assets/directory.json","getJSONArray(\"doctors\")","showHome()","renderDoctors()","cityMatches","showDoctor(","showSaved()","setInstanceFollowRedirects(false)"])assert(directory.includes(marker),marker);
assert(Number(app.match(/versionCode\s+(\d+)/)?.[1]) >= 3);
console.log("PASS dedicated mobile home and directory structure");

const updater=read("android/app/src/main/java/com/slashpromo/app/UpdateActivity.java");
const provider=read("android/app/src/main/java/com/slashpromo/app/UpdateProvider.java");
const releaseWorkflow=read(".github/workflows/android-release-candidate.yml");
for(const marker of ["Arrays.equals(signers(current),signers(next))","Checksum mismatch","code(next)<=code(current)","setInstanceFollowRedirects(false)","FLAG_GRANT_READ_URI_PERMISSION"])assert(updater.includes(marker),marker);
assert(manifest.includes('android:name=".UpdateProvider"'));
assert(manifest.includes('android:grantUriPermissions="true"'));
assert(provider.includes("ParcelFileDescriptor.MODE_READ_ONLY"));
assert(releaseWorkflow.includes("inputs.publish_update == true"));
assert.equal((releaseWorkflow.match(/environment: android-release/g)||[]).length,1);
assert(releaseWorkflow.includes("github.event_name == 'push' || inputs.publish_update == true"));
assert(releaseWorkflow.indexOf("Sign and verify candidate") < releaseWorkflow.indexOf("Publish signed APK only"));
assert(releaseWorkflow.includes("paths: ['android/app/build.gradle']"));
assert(releaseWorkflow.includes("default: false"));
console.log("PASS signed update structural safeguards");

for(const marker of ["Downloading update:","Verifying APK integrity and signature","Signing certificate mismatch","safeError(e)","setOnApplyWindowInsetsListener","url=null;digest=null;remoteCode=0"])assert(updater.includes(marker),marker);
console.log("PASS updater diagnostic structural checks");

const library=read("android/app/src/main/java/com/slashpromo/app/LibraryActivity.java");
for(const marker of ["getNoBackupFilesDir()","FLAG_SECURE","staging.renameTo(volume)","Resume reading","toggleBookmark","goToPage(total)","study.night","volume-","selectedBook"])assert(library.includes(marker),marker);
assert(!library.includes("oldBook.delete()"));
console.log("PASS private study library structural safeguards");

for(const marker of ["getDocumentOutline()","findDestinationPage(doc)","getFirstChild()","☰ Chapters","Find chapter","chapterCache.get(id)","page(target)"])assert(library.includes(marker),marker);
console.log("PASS offline chapter navigation structural checks");

for(const marker of ['pageKey("highlights",currentPage)',"transform.invert(inverse)","saveHighlights()","studyNote(number)","savedNotes","rememberPage(number)","SYSTEM_UI_FLAG_IMMERSIVE_STICKY","Exit full screen","Main chapters only","activeChapter(all,currentPage)"])assert(library.includes(marker),marker);
assert(app.includes("versionName '0.7.0'"));
assert(Number(app.match(/versionCode\s+(\d+)/)?.[1]) >= 18);
console.log("PASS Smart Study Reader structural safeguards");

for(const marker of ["private void revisionHub()","Search saved notes or page number","All saved pages","key(\"highlights.\")","this::revisionHub"])assert(library.includes(marker),marker);
console.log("PASS revision centre structural checks");

for(const marker of ["No saved revision pages yet","No matching revision pages","pages.removeIf(p->p<0)"])assert(library.includes(marker),marker);
console.log("PASS revision centre stability structural checks");

for(const marker of ["setPageLimit(50)","SCANNER_MODE_FULL","getStartScanIntent(this)","scanned.getPdf().getUri()","recognizePage(pending,p-1,recognizer)","ocrPages<100","Image-only PDF","Rename selected book","final File source=book","Last reading position"])assert(library.includes(marker),marker);
assert(app.includes("com.google.mlkit:text-recognition:16.0.1"));
assert(app.includes("play-services-mlkit-document-scanner:16.0.0"));
console.log("PASS cumulative reader and local scanner structural checks");

for(const marker of ['menuCard("Add new book"','menuCard("Scan hard copies"','menuCard("My books"','menuCard("Read & search"','menuCard("Study & revision"',"private void booksMenu()","private void readingMenu()","private void revisionMenu()"])assert(library.includes(marker),marker);
console.log("PASS separate library menu structural checks");

for(const marker of ["availableBooks()","Uploaded books: ","Active book: ","Select book for search","Select book for revision","getDocumentInformation().getTitle()","Change active book","indexed pages • "])assert(library.includes(marker),marker);
console.log("PASS library inventory and explicit active book selection checks");

for(const marker of ["AI Medical Study Assistant","Find supporting book excerpts","cb.setChecked(false)","allowed.size()<4","Exact text to be sent:","if(!consent.isChecked())","x-goog-api-key","keyInput.setText","maxOutputTokens","setInstanceFollowRedirects(false)","Verify PDF page","No automatic retry"])assert(library.includes(marker),marker);
console.log("PASS AI study assistant consent and request structural checks");

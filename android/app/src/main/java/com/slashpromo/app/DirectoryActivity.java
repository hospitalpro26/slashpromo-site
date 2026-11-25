package com.slashpromo.app;
import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
public final class DirectoryActivity extends Activity {
    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        startActivity(new Intent(this,LibraryActivity.class));
        finish();
    }
}

package com.farmvisit.app;

import android.os.Bundle;
import android.Manifest;
import android.content.pm.PackageManager;
import android.webkit.PermissionRequest;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.farmvisit.app.GeminiNanoPlugin;

public class MainActivity extends BridgeActivity {
    private static final int PERMISSIONS_REQUEST_CODE = 100;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(GeminiNanoPlugin.class);
        requestCriticalPermissions();
    }

    /**
     * Request RECORD_AUDIO, CAMERA, and LOCATION at app startup so that
     * WebView getUserMedia() calls succeed without a second permission dance.
     */
    private void requestCriticalPermissions() {
        String[] needed = {
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.CAMERA,
            Manifest.permission.ACCESS_FINE_LOCATION
        };

        boolean anyMissing = false;
        for (String perm : needed) {
            if (ContextCompat.checkSelfPermission(this, perm)
                    != PackageManager.PERMISSION_GRANTED) {
                anyMissing = true;
                break;
            }
        }

        if (anyMissing) {
            ActivityCompat.requestPermissions(this, needed, PERMISSIONS_REQUEST_CODE);
        }
    }
}

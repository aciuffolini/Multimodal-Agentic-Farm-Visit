package com.farmvisit.app;

import android.os.Bundle;
import android.Manifest;
import android.content.pm.PackageManager;
import android.webkit.PermissionRequest;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.farmvisit.app.GeminiNanoPlugin;

public class MainActivity extends BridgeActivity {
    private static final int PERMISSIONS_REQUEST_CODE = 100;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(GeminiNanoPlugin.class);
        requestCriticalPermissions();
        configureWebViewPermissionBridge();
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

    /**
     * Ensure WebView media permission requests are granted when OS permissions are
     * already approved. Without this bridge, some Android WebView builds deny
     * navigator.mediaDevices.getUserMedia() even with RECORD_AUDIO granted.
     */
    private void configureWebViewPermissionBridge() {
        if (bridge == null || bridge.getWebView() == null) {
            return;
        }

        bridge.getWebView().setWebChromeClient(new BridgeWebChromeClient(bridge) {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    String[] resources = request.getResources();
                    boolean needsAudio = false;
                    boolean needsVideo = false;

                    for (String resource : resources) {
                        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                            needsAudio = true;
                        }
                        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                            needsVideo = true;
                        }
                    }

                    boolean audioGranted = !needsAudio || ContextCompat.checkSelfPermission(
                        MainActivity.this,
                        Manifest.permission.RECORD_AUDIO
                    ) == PackageManager.PERMISSION_GRANTED;

                    boolean cameraGranted = !needsVideo || ContextCompat.checkSelfPermission(
                        MainActivity.this,
                        Manifest.permission.CAMERA
                    ) == PackageManager.PERMISSION_GRANTED;

                    if (audioGranted && cameraGranted) {
                        request.grant(resources);
                    } else {
                        request.deny();
                    }
                });
            }
        });
    }
}

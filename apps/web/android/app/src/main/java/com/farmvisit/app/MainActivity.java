package com.farmvisit.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.farmvisit.app.GeminiNanoPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        registerPlugin(GeminiNanoPlugin.class);
    }
}

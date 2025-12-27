import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// Track if we've already warned about the API server (module-level)
let apiServerWarningShown = false;

// Plugin to suppress proxy connection errors
// Must run early to intercept before Vite logs
const suppressProxyErrorsPlugin = () => ({
  name: 'suppress-proxy-errors',
  enforce: 'pre', // Run before other plugins
  configureServer(server) {
    // Intercept ALL logger methods that might log proxy errors
    const originalError = server.config.logger.error.bind(server.config.logger);
    const originalInfo = server.config.logger.info?.bind(server.config.logger);

    // Override error logger
    server.config.logger.error = (msg, options) => {
      const message = typeof msg === 'string' ? msg :
        msg?.message ||
        (msg instanceof Error ? msg.toString() : String(msg));

      // Check for proxy errors - be very permissive to catch all variations
      const isProxyError =
        message.includes('http proxy error') ||
        message.includes('proxy error') ||
        (message.includes('ECONNREFUSED') && (
          message.includes('AggregateError') ||
          message.includes('proxy') ||
          message.includes('/api/') ||
          message.includes('localhost:3000')
        )) ||
        (msg instanceof Error && (
          msg.message?.includes('ECONNREFUSED') ||
          msg.message?.includes('proxy error') ||
          msg.name === 'AggregateError'
        ));

      if (isProxyError) {
        // Show warning only once
        if (!apiServerWarningShown) {
          apiServerWarningShown = true;
          server.config.logger.warn('⚠️  API server not running on port 3000. Start with: node test-server.js');
          server.config.logger.warn('   (Proxy errors suppressed. The app will work, but API calls will fail.)');
        }
        return; // Suppress the error
      }
      // Log other errors normally
      originalError(msg, options);
    };

    // Also intercept info logs (Vite sometimes logs errors as info)
    if (originalInfo) {
      server.config.logger.info = (msg, options) => {
        const message = typeof msg === 'string' ? msg : String(msg);
        if (message.includes('http proxy error') ||
          (message.includes('ECONNREFUSED') && message.includes('/api/'))) {
          return; // Suppress proxy-related info messages
        }
        originalInfo(msg, options);
      };
    }
  }
});

export default defineConfig(({ mode }) => {
  // Disable service worker for Android builds (Capacitor bundles everything)
  // Service worker causes caching issues in native apps where files are bundled
  // When building for Android, use --mode android to disable PWA plugin
  const disablePWA = mode === 'android' || process.env.BUILD_TARGET === 'android';

  // Base path configuration:
  // - Android builds (--mode android): Use relative paths './' for Capacitor WebView
  // - GitHub Pages: Use '/Agentic-Farm-Visit/' (set via VITE_BASE_PATH or auto-detected in production)
  // - Local dev: Use '/'
  const isAndroidBuild = mode === 'android' || process.env.BUILD_TARGET === 'android';
  const basePath = isAndroidBuild
    ? './'
    : (process.env.VITE_BASE_PATH || (process.env.NODE_ENV === 'production' ? '/Multimodal-Agentic-Farm-Visit/' : '/'));

  return {
    base: basePath,
    resolve: {
      alias: {
        // Always point to src - Vite will compile TypeScript
        '@farm-visit/shared': path.resolve(__dirname, '../../packages/shared/src'),
      },
    },
    plugins: [
      react(),
      suppressProxyErrorsPlugin(),
      // Only enable PWA/service worker for web builds, not Android
      // Android builds bundle everything, so service worker caching causes issues
      ...(disablePWA ? [] : [
        VitePWA({
          registerType: "autoUpdate",
          base: basePath,
          manifest: {
            name: "Farm Field Visit",
            short_name: "Farm Visit",
            start_url: basePath,
            scope: basePath,
            display: "standalone",
            background_color: "#ffffff",
            theme_color: "#22c55e",
            orientation: "portrait",
            icons: [
              { src: "pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
              { src: "pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
            ]
          },
          workbox: {
            globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
            navigateFallback: `${basePath}index.html`
          }
        })
      ])
    ],
    server: {
      port: 5173,
      host: true, // Allow access from network (for mobile testing)
      open: true, // Automatically open browser when dev server starts
      proxy: {
        "/api": {
          target: "http://localhost:3000",
          changeOrigin: true,
          configure: (proxy, _options) => {
            proxy.on('error', (err, req, res) => {
              const errorMessage = err.message || '';
              const isConnectionRefused = errorMessage.includes('ECONNREFUSED') ||
                errorMessage.includes('connect') ||
                err.code === 'ECONNREFUSED';

              if (isConnectionRefused) {
                // Return a clean error response
                if (res && !res.headersSent) {
                  res.writeHead(503, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                  });
                  res.end(JSON.stringify({
                    error: 'API server unavailable',
                    message: 'Test server is not running. Start it with: node test-server.js',
                    hint: 'Run "node test-server.js" in a separate terminal'
                  }));
                }
                return;
              }
              // For other errors, log them normally
              console.error('[Proxy Error]', err.message);
            });
          },
        },
      },
    },
  };
});


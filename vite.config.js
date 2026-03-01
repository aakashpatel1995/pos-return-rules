import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Related: https://github.com/remix-run/remix/issues/2835#issuecomment-1144947483
// Replace the HOST env var with SHOPIFY_APP_URL so that it doesn't break the remix server. The CLI will still correctly
// use a tunnel URL on the Shopify end.
if (
    process.env.HOST &&
    (!process.env.SHOPIFY_APP_URL ||
        process.env.SHOPIFY_APP_URL === process.env.HOST)
) {
    process.env.SHOPIFY_APP_URL = process.env.HOST;
    delete process.env.HOST;
}

const host = new URL(process.env.SHOPIFY_APP_URL || "http://localhost")
    .hostname;
// HMR doesn't work when test with a real Shopify domain and the tunnel URL is different from the request URL.
const hmrConfig =
    host === "localhost"
        ? {
            protocol: "ws",
            host: "localhost",
            port: 64999,
            clientPort: 64999,
        }
        : {
            protocol: "wss",
            host: host,
            port: parseInt(process.env.FRONTEND_PORT) || 8002,
            clientPort: 443,
        };

export default defineConfig({
    server: {
        port: Number(process.env.PORT || 3000),
        hmr: hmrConfig,
        fs: {
            // See https://vitejs.dev/config/server-options.html#server-fs-allow for more information
            allow: ["app", "node_modules"],
        },
    },
    plugins: [
        remix({
            ignoredRouteFiles: ["**/.*"],
            future: {
                v3_fetcherPersist: true,
                v3_relativeSplatPath: true,
                v3_throwAbortReason: true,
            },
        }),
        tsconfigPaths(),
    ],
    build: {
        assetsInlineLimit: 0,
    },
    optimizeDeps: {
        include: ["@shopify/app-bridge-react"],
    },
});

import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function resolveOwnerProxyTarget(env = process.env) {
  const explicitProxyTarget = String(env.OWNER_UI_PROXY_TARGET || "").trim();
  if (explicitProxyTarget) return explicitProxyTarget;

  const adminBackendBaseUrl = String(env.ADMIN_BACKEND_BASE_URL || "").trim();
  if (adminBackendBaseUrl) return adminBackendBaseUrl.replace(/\/+$/, "");

  const tenantHost = String(env.TENANT_WEB_HOST || "127.0.0.1").trim() || "127.0.0.1";
  const tenantPort = String(env.TENANT_WEB_PORT || "3202").trim() || "3202";
  return `http://${tenantHost}:${tenantPort}`;
}

const ownerProxyTarget = resolveOwnerProxyTarget();

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    proxy: {
      "/owner/api": {
        target: ownerProxyTarget,
        changeOrigin: true,
        secure: false,
      },
      "/admin/api": {
        target: ownerProxyTarget,
        changeOrigin: true,
        secure: false,
      },
      "/platform/api": {
        target: ownerProxyTarget,
        changeOrigin: true,
        secure: false,
      },
      "/login": {
        target: ownerProxyTarget,
        changeOrigin: true,
        secure: false,
      },
      "/owner/login": {
        target: ownerProxyTarget,
        changeOrigin: true,
        secure: false,
      },
      "/auth": {
        target: ownerProxyTarget,
        changeOrigin: true,
        secure: false,
      },
      "/api": {
        target: ownerProxyTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

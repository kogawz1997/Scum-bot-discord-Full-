import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { motion } from "framer-motion";
import { Shield, Loader2 } from "lucide-react";
import ScumOwnerUnifiedControlPlane from "./ScumOwnerUnifiedControlPlane.jsx";
import OwnerLoginPage from "./OwnerLoginPage.jsx";
import { buildOwnerLoginRedirect, getOwnerSession } from "./lib/owner-auth.js";
import { resolveOwnerPrototypeRoute } from "./lib/owner-routes.js";
import "./styles.css";

const route = resolveOwnerPrototypeRoute(window.location.pathname);

function OwnerGate() {
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const isDevMode = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

      try {
        const result = await getOwnerSession();
        if (!mounted) return;
        if (result.ok) {
          setAuthorized(true);
          return;
        }
      } catch {
        // Fall through to login redirect.
      }

      if (isDevMode && window.location.port === '5177') {
        setAuthorized(true);
        return;
      }

      if (mounted) {
        window.location.replace(buildOwnerLoginRedirect(window.location.pathname, window.location.search));
      }
    }

    checkSession();
    return () => {
      mounted = false;
    };
  }, []);

  if (!authorized) {
    return (
      <main className="owner-shell grid min-h-screen place-items-center px-5 text-white">
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="owner-card relative max-w-md overflow-hidden rounded-2xl border p-7 text-center"
        >
          <div
            className="pointer-events-none absolute -inset-x-10 -top-24 h-48 opacity-40"
            style={{ background: "radial-gradient(circle at center, rgba(34,211,238,0.25), transparent 60%)" }}
          />
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
            className="relative mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-400/20 to-sky-500/10 text-cyan-200 shadow-[0_0_30px_rgba(34,211,238,0.25)]"
          >
            <Shield className="h-6 w-6" />
          </motion.div>
          <div className="relative mt-4 text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-300">Owner access</div>
          <h1 className="relative mt-2 text-2xl font-bold text-white">Checking session</h1>
          <p className="relative mt-2 text-sm leading-6 text-zinc-400">
            The control plane opens only after a valid owner login session exists.
          </p>
          <div className="relative mt-5 flex items-center justify-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-zinc-500">
            <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
            verifying
          </div>
        </motion.div>
      </main>
    );
  }

  return <ScumOwnerUnifiedControlPlane />;
}

const App = route === "login" ? OwnerLoginPage : OwnerGate;

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

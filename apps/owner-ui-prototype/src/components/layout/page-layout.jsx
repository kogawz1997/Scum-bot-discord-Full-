import React from "react";
import { motion } from "framer-motion";

export function PageLayout({ title, subtitle, icon: Icon, rightActions, showActions = false, children }) {
  return (
    <div className="owner-page-content w-full">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative mb-8 overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-white/[0.025] via-white/[0.01] to-transparent p-5 md:p-6"
      >
        <div
          className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(34,211,238,0.22), transparent 70%)" }}
        />
        <div className={`relative grid gap-5 ${showActions && rightActions ? "xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center" : ""}`}>
          <div className="flex min-w-0 items-center gap-4">
            {Icon && (
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.08, type: "spring", stiffness: 220, damping: 18 }}
                className="relative shrink-0"
              >
                <div className="grid h-12 w-12 place-items-center rounded-xl border border-cyan-400/25 bg-gradient-to-br from-cyan-400/[0.14] to-sky-500/[0.05] text-cyan-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_24px_rgba(34,211,238,0.15)]">
                  <Icon className="h-5 w-5" />
                </div>
              </motion.div>
            )}
            <div className="min-w-0 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="h-px w-5 bg-gradient-to-r from-cyan-400/60 to-transparent" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300/80">Owner</span>
              </div>
              <h1 className="mt-1.5 text-[22px] font-bold leading-tight tracking-[-0.01em] text-white md:text-[26px]">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1.5 max-w-2xl text-[13px] leading-6 text-zinc-400">{subtitle}</p>
              )}
            </div>
          </div>
          {showActions && rightActions ? (
            <div className="flex flex-wrap items-center gap-2 xl:justify-end">{rightActions}</div>
          ) : null}
        </div>
      </motion.div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

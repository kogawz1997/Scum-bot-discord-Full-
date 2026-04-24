import React from "react";
import { motion } from "framer-motion";

export function StatCard({ label, value, sub, icon: Icon, spark, rightMeta, compact = false, tone }) {
  const toneMap = {
    warning: {
      border: "hover:border-amber-400/25",
      icon: "border-amber-400/20 bg-amber-400/[0.08] text-amber-300",
      accent: "from-amber-400/30",
    },
    critical: {
      border: "hover:border-red-400/25",
      icon: "border-red-400/20 bg-red-400/[0.08] text-red-300",
      accent: "from-red-400/30",
    },
    healthy: {
      border: "hover:border-emerald-400/25",
      icon: "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300",
      accent: "from-emerald-400/30",
    },
    default: {
      border: "hover:border-cyan-400/25",
      icon: "border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-300",
      accent: "from-cyan-400/25",
    },
  };
  const t = toneMap[tone] || toneMap.default;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className={`group relative flex h-full flex-col overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-colors ${t.border}`}
    >
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${t.accent} to-transparent opacity-40 blur-2xl`}
      />

      <div className="relative flex items-center justify-between gap-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          {label}
        </div>
        {Icon ? (
          <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${t.icon}`}>
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>

      <div
        className={`owner-kpi-value relative mt-3 font-black leading-none text-white ${
          compact ? "text-[24px]" : "text-[30px]"
        }`}
      >
        {value}
      </div>

      {sub ? (
        <div className="relative mt-2 text-[12px] leading-5 text-zinc-500">{sub}</div>
      ) : null}

      {(rightMeta || spark) ? (
        <div className="relative mt-auto w-full space-y-2 pt-3">
          {rightMeta ? (
            <div className="text-sm font-medium leading-6 text-zinc-300">{rightMeta}</div>
          ) : null}
          {spark ? (
            <div className="owner-sparkline">
              <div className={`owner-sparkline-fill ${spark}`} />
            </div>
          ) : null}
        </div>
      ) : null}
    </motion.div>
  );
}

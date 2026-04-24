import React from "react";

export function Field({ label, value, sub, className = "" }) {
  return (
    <div className={`rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3.5 ${className}`}>
      <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{label}</div>
      <div className="mt-2 text-[14px] font-semibold leading-6 text-white break-words">{value}</div>
      {sub ? <div className="mt-1.5 text-[12px] leading-5 text-zinc-400">{sub}</div> : null}
    </div>
  );
}

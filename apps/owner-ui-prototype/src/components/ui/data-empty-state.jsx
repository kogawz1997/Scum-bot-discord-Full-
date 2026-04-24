import React from "react";

export function DataEmptyState({ title = "No backend records", body = "The endpoint is live, but it returned no rows for this section." }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-black/20 px-5 py-4 text-sm text-zinc-400">
      <div className="font-semibold leading-6 text-white">{title}</div>
      <div className="mt-1.5 max-w-[58ch] leading-6">{body}</div>
    </div>
  );
}

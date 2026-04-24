import React from "react";

export function SectionTitle({ title, subtitle, right }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="text-[18px] font-semibold leading-7 text-white">{title}</div>
        {subtitle ? <div className="mt-1.5 text-[13px] leading-6 text-zinc-500">{subtitle}</div> : null}
      </div>
      {right}
    </div>
  );
}

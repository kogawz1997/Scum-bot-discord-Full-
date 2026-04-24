import React from "react";
import { Filter, Search, X } from "lucide-react";
import { Input } from "./input";
import { Button } from "./button";

function joinClassNames(...values) {
  return values.filter(Boolean).join(" ");
}

export function SearchRail({
  label = "Search",
  summary = null,
  summaryIcon: SummaryIcon = Filter,
  placeholder = "Search...",
  value = "",
  onChange,
  controls = null,
  activeCount = 0,
  onClear,
  clearLabel = "Clear",
  className = "",
  inputClassName = "",
}) {
  const hasControls = Boolean(controls) || (activeCount > 0 && typeof onClear === "function");

  return (
    <div
      className={joinClassNames(
        "grid gap-3.5",
        hasControls ? "xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end" : "",
        className
      )}
    >
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">{label}</div>
          {summary ? (
            <div className="inline-flex h-8 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 text-[11px] text-zinc-400">
              <SummaryIcon className="h-3 w-3 text-zinc-500" />
              <span>{summary}</span>
            </div>
          ) : null}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            className={joinClassNames("h-10 pl-9 text-sm", inputClassName)}
          />
        </div>
      </div>

      {hasControls ? (
        <div className="flex flex-wrap items-end gap-3 xl:justify-end">
          {controls}
          {activeCount > 0 && typeof onClear === "function" ? (
            <Button variant="outline" className="self-end" onClick={onClear}>
              <X className="mr-1 h-3.5 w-3.5" /> {clearLabel} ({activeCount})
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Settings, ChevronRight, CheckCircle2, Circle } from "lucide-react";
import { AUTOMATION_RULES } from "../../lib/automation-rules";

export function AutomationPanel({ onToggleRule }) {
  const [rules, setRules] = useState(AUTOMATION_RULES);

  const toggle = (id) => {
    const updated = rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    setRules(updated);
    onToggleRule?.(id, updated.find((r) => r.id === id)?.enabled);
  };

  return (
    <div className="space-y-2">
      {rules.map((rule, idx) => (
        <motion.div
          key={rule.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.05 }}
          className="group flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3 transition-colors hover:border-cyan-400/20"
        >
          <button
            onClick={() => toggle(rule.id)}
            className="mt-0.5 shrink-0 opacity-60 hover:opacity-100 transition"
          >
            {rule.enabled ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            ) : (
              <Circle className="h-5 w-5 text-zinc-500" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold ${rule.enabled ? "text-white" : "text-zinc-400"}`}>
                {rule.name}
              </span>
              {rule.enabled && <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />}
            </div>
            <p className="mt-0.5 text-xs leading-5 text-zinc-500">{rule.description}</p>
            {rule.help && <p className="mt-1 text-xs text-zinc-400 italic">💡 {rule.help}</p>}
            <div className="mt-1.5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400" title={rule.trigger}>
                <Settings className="h-3 w-3" />
                {rule.trigger.replace(/_/g, " ")}
              </span>
              {Object.entries(rule.conditions || {}).map(([key, value]) => (
                <span key={key} className="inline-flex rounded bg-cyan-400/10 px-2 py-0.5 text-[10px] text-cyan-300" title={rule.conditionLabels?.[key]}>
                  {rule.conditionLabels?.[key] || key}: {typeof value === "object" ? JSON.stringify(value) : String(value)}
                </span>
              ))}
            </div>
          </div>

          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 opacity-40 group-hover:opacity-60 transition" />
        </motion.div>
      ))}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, AlertCircle, CheckCircle, Info, Bell } from "lucide-react";

export function AlertsCenter({ alerts = [], onDismiss }) {
  const [activeAlerts, setActiveAlerts] = useState(alerts);

  useEffect(() => {
    setActiveAlerts(alerts);
  }, [alerts]);

  const dismiss = (id) => {
    setActiveAlerts(activeAlerts.filter((a) => a.id !== id));
    onDismiss?.(id);
  };

  const getIcon = (type) => {
    switch (type) {
      case "error":
        return <AlertTriangle className="h-4 w-4" />;
      case "warning":
        return <AlertCircle className="h-4 w-4" />;
      case "success":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getColor = (type) => {
    switch (type) {
      case "error":
        return "border-red-500/30 bg-red-500/[0.08] text-red-300";
      case "warning":
        return "border-amber-500/30 bg-amber-500/[0.08] text-amber-300";
      case "success":
        return "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-300";
      default:
        return "border-cyan-400/30 bg-cyan-400/[0.08] text-cyan-300";
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm space-y-2">
      <AnimatePresence>
        {activeAlerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`flex items-start gap-3 rounded-lg border p-3 ${getColor(alert.type)}`}
          >
            <div className="mt-0.5 shrink-0">{getIcon(alert.type)}</div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{alert.title}</div>
              {alert.message && <div className="mt-0.5 text-xs opacity-85">{alert.message}</div>}
            </div>
            <button
              onClick={() => dismiss(alert.id)}
              className="shrink-0 opacity-60 hover:opacity-100 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function AlertBadge({ count = 0 }) {
  if (count === 0) return null;
  return (
    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

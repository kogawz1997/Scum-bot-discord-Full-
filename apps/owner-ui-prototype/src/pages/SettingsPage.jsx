import React, { useState } from "react";
import { AlertTriangle, Settings, Zap } from "lucide-react";
import { PageLayout } from "../components/layout/page-layout";
import { GlassCard } from "../components/ui/glass-card";
import { ToneBadge } from "../components/ui/tone-badge";
import { MetricPair } from "../components/ui/metric-pair";
import { Field } from "../components/ui/field";
import { Button } from "../components/ui/button";
import { extractItems } from "../lib/owner-adapters";
import { AutomationPanel } from "../components/ui/automation-panel";

export function SettingsPage({ data, onRun }) {
  const raw = data?.raw || {};
  const settings = raw.controlPanelSettings?.data || raw.controlPanelSettings || {};
  const runtime = raw.runtimeSupervisor?.data || raw.runtimeSupervisor || {};
  const apiKeys = extractItems(raw.apiKeys);
  const webhooks = extractItems(raw.webhooks);
  const marketplace = extractItems(raw.marketplace);
  const restartPlans = extractItems(raw.restartPlans);

  const handleToggleRule = (ruleId, enabled) => {
    // In a real app, this would persist to backend
    console.log(`Rule ${ruleId} toggled to ${enabled}`);
  };

  return (
    <PageLayout
      title="Platform Settings"
      subtitle="Platform settings, integration posture, and runtime supervisor state."
      icon={Settings}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <GlassCard title="Control Plane Settings" right={<ToneBadge tone="healthy">Read-only live</ToneBadge>}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Surface" value={settings.surface || settings.mode || "owner"} />
              <Field label="Environment" value={settings.environment || settings.nodeEnv || "unknown"} />
            </div>
            <div className="mt-4">
              <Field label="Owner API Endpoint" value={settings.ownerBaseUrl || settings.publicEndpoint || "/owner/api"} />
            </div>
            <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-sm text-amber-200/80">
              <AlertTriangle className="mb-2 h-4 w-4" />
              Direct environment editing is still guarded. The backend route exists, but the UI should only unlock it once
              validation, audit preview, and typed confirmation are complete.
            </div>
          </GlassCard>

          <GlassCard title="Integrations">
            <div className="space-y-3">
              <MetricPair label="API Keys" value={apiKeys.length} />
              <MetricPair label="Webhooks" value={webhooks.length} />
              <MetricPair label="Marketplace Offers" value={marketplace.length} />
            </div>
          </GlassCard>

          <GlassCard title={<span className="flex items-center gap-2"><Zap className="h-3.5 w-3.5 text-cyan-300" /> Automation Rules</span>} description="Manage platform automation triggers and actions">
            <AutomationPanel onToggleRule={handleToggleRule} />
          </GlassCard>
        </div>

        <GlassCard title="Runtime Supervisor">
          <div className="space-y-3">
            <MetricPair
              label="Supervisor"
              value={runtime.status || runtime.state || "unknown"}
              tone={runtime.status === "healthy" ? "healthy" : "stable"}
            />
            <MetricPair
              label="Services"
              value={extractItems(runtime.services).length || runtime.serviceCount || "n/a"}
            />
            <MetricPair label="Restart Plans" value={restartPlans.length} />
          </div>
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[0.05] p-3 text-sm text-red-100/80">
            Restart stays guarded. Operators should confirm the runtime scope and affected service list before the backend
            mutation runs.
          </div>
          <Button
            data-owner-managed="true"
            className="mt-4 h-11 w-full rounded-xl bg-red-600 hover:bg-red-500"
            onClick={() => onRun?.("restartOwnerRuntime")}
          >
            Restart Runtime
          </Button>
        </GlassCard>
      </div>
    </PageLayout>
  );
}

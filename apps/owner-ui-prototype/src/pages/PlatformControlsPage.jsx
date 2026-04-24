import React from "react";
import { Wrench, RotateCcw } from "lucide-react";
import { PageLayout } from "../components/layout/page-layout";
import { GlassCard } from "../components/ui/glass-card";
import { ToneBadge } from "../components/ui/tone-badge";
import { StatCard } from "../components/ui/stat-card";
import { Button } from "../components/ui/button";
import { pickRecordTitle } from "../lib/ui-helpers";
import { CenteredRecordCard, JsonPreviewCard, PrimitiveFieldGrid, SimpleRecordList, pickRecord, pickRecords, statusTone } from "./live-page-helpers";

export function PlatformControlsPage({ data, recordId, onRun }) {
  const raw = data?.raw || {};
  const apiKeys = pickRecords(raw.apiKeys);
  const webhooks = pickRecords(raw.webhooks);
  const marketplace = pickRecords(raw.marketplace);
  const restartPlans = pickRecords(raw.restartPlans);
  const restartExecutions = pickRecords(raw.restartExecutions);
  const settings = raw.controlPanelSettings?.data || raw.controlPanelSettings || {};
  const selected = pickRecord([restartExecutions, restartPlans, webhooks, apiKeys, marketplace], recordId);

  const actions = (
    <Button variant="outline" onClick={() => onRun?.("restartOwnerRuntime")}>
      <RotateCcw className="mr-2 h-4 w-4" /> Restart Owner Runtime
    </Button>
  );

  return (
    <PageLayout title="Platform Controls" subtitle="Control-plane settings, restart planning, integrations, and runtime control evidence" icon={Wrench} rightActions={actions}>
      <div className="grid gap-4 md:grid-cols-5">
        <StatCard label="API Keys" value={apiKeys.length} compact />
        <StatCard label="Webhooks" value={webhooks.length} compact />
        <StatCard label="Marketplace" value={marketplace.length} compact />
        <StatCard label="Restart Plans" value={restartPlans.length} compact />
        <StatCard label="Executions" value={restartExecutions.length} compact />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <GlassCard title="Control Panel Settings" right={<ToneBadge tone={Object.keys(settings).length ? "healthy" : "locked"}>{Object.keys(settings).length ? "live" : "empty"}</ToneBadge>}>
            <PrimitiveFieldGrid record={settings} />
          </GlassCard>

          <SimpleRecordList
            title="Restart Plan Registry"
            items={[...restartPlans.slice(0, 4), ...restartExecutions.slice(0, 4)]}
            emptyTitle="No runtime control rows"
            emptyBody="The restart-plan and execution endpoints returned no rows."
            right={<ToneBadge tone={restartPlans.length || restartExecutions.length ? "warning" : "locked"}>{restartPlans.length + restartExecutions.length} rows</ToneBadge>}
            renderItem={(row, index) => (
              <CenteredRecordCard
                key={row.id || index}
                title={pickRecordTitle(row, "Runtime control row")}
                badge={<ToneBadge tone={statusTone(row.status || row.state)}>{row.status || row.state || "unknown"}</ToneBadge>}
                description={row.service || row.scope || row.name || "No scope"}
              />
            )}
          />
        </div>

        <div className="space-y-4">
          <JsonPreviewCard title="Selected Control Payload" value={selected || settings} />
        </div>
      </div>
    </PageLayout>
  );
}

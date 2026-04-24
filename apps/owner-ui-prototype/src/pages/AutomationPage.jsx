import React from "react";
import { Bot, RefreshCcw } from "lucide-react";
import { PageLayout } from "../components/layout/page-layout";
import { GlassCard } from "../components/ui/glass-card";
import { ToneBadge } from "../components/ui/tone-badge";
import { StatCard } from "../components/ui/stat-card";
import { Button } from "../components/ui/button";
import { formatBackendTime, pickRecordTitle } from "../lib/ui-helpers";
import { CenteredRecordCard, JsonPreviewCard, PrimitiveFieldGrid, SimpleRecordList, pickRecord, pickRecords, statusTone } from "./live-page-helpers";

export function AutomationPage({ data, recordId, onRun }) {
  const raw = data?.raw || {};
  const notifications = pickRecords(raw.notifications);
  const restartPlans = pickRecords(raw.restartPlans);
  const restartExecutions = pickRecords(raw.restartExecutions);
  const selected = pickRecord([restartExecutions, restartPlans, notifications], recordId);
  const opsState = raw.opsState?.data || raw.opsState || {};
  const reconcile = raw.reconcile?.data || raw.reconcile || {};

  const actions = (
    <Button variant="outline" onClick={() => onRun?.("runMonitoring")}>
      <RefreshCcw className="mr-2 h-4 w-4" /> Run Monitoring
    </Button>
  );

  return (
    <PageLayout title="Automation" subtitle="Scheduled runs, restart planning, notifications, and ops-state evidence" icon={Bot} rightActions={actions}>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Notifications" value={notifications.length} compact />
        <StatCard label="Restart Plans" value={restartPlans.length} compact />
        <StatCard label="Executions" value={restartExecutions.length} compact />
        <StatCard label="Ops State Fields" value={Object.keys(opsState).length} compact tone={Object.keys(opsState).length ? "healthy" : "locked"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <GlassCard title="Ops State Snapshot" right={<ToneBadge tone={Object.keys(opsState).length ? "healthy" : "locked"}>{Object.keys(opsState).length ? "live" : "empty"}</ToneBadge>}>
            <PrimitiveFieldGrid record={opsState} />
          </GlassCard>

          <SimpleRecordList
            title="Restart Executions"
            items={restartExecutions.slice(0, 8)}
            emptyTitle="No restart executions"
            emptyBody="The owner runtime execution endpoint returned no rows."
            right={<ToneBadge tone={restartExecutions.length ? "stable" : "locked"}>{restartExecutions.length} rows</ToneBadge>}
            renderItem={(item, index) => (
              <CenteredRecordCard
                key={item.id || index}
                title={pickRecordTitle(item, "Restart execution")}
                badge={<ToneBadge tone={statusTone(item.status || item.state)}>{item.status || item.state || "unknown"}</ToneBadge>}
                description={formatBackendTime(item.createdAt || item.startedAt || item.updatedAt)}
              />
            )}
          />

          <SimpleRecordList
            title="Notifications"
            items={notifications.slice(0, 8)}
            emptyTitle="No notifications"
            emptyBody="Notification events appear here when the backend emits owner alerts."
            right={<ToneBadge tone={notifications.length ? "warning" : "healthy"}>{notifications.length} alerts</ToneBadge>}
            renderItem={(item, index) => (
              <CenteredRecordCard
                key={item.id || index}
                title={pickRecordTitle(item, "Notification")}
                badge={<ToneBadge tone={statusTone(item.status || item.severity || "warning")}>{item.status || item.severity || "signal"}</ToneBadge>}
                description={item.message || item.body || item.description || "Owner notification row"}
              />
            )}
          />
        </div>

        <div className="space-y-4">
          <GlassCard title="Reconcile Snapshot" right={<ToneBadge tone={Object.keys(reconcile).length ? "stable" : "locked"}>{Object.keys(reconcile).length ? "live" : "empty"}</ToneBadge>}>
            <PrimitiveFieldGrid record={reconcile} />
          </GlassCard>
          <JsonPreviewCard title="Selected Automation Payload" value={selected || reconcile || opsState} />
        </div>
      </div>
    </PageLayout>
  );
}

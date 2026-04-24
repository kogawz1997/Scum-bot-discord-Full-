import React from "react";
import { ActivitySquare, RefreshCcw } from "lucide-react";
import { PageLayout } from "../components/layout/page-layout";
import { GlassCard } from "../components/ui/glass-card";
import { ToneBadge } from "../components/ui/tone-badge";
import { StatCard } from "../components/ui/stat-card";
import { Button } from "../components/ui/button";
import { formatBackendTime, pickRecordTitle } from "../lib/ui-helpers";
import { CenteredRecordCard, JsonPreviewCard, PrimitiveFieldGrid, SimpleRecordList, pickRecord, pickRecords, statusTone } from "./live-page-helpers";

export function FleetDiagnosticsPage({ data, recordId, onRun }) {
  const raw = data?.raw || {};
  const syncRuns = pickRecords(raw.syncRuns);
  const syncEvents = pickRecords(raw.syncEvents);
  const provisioning = pickRecords(raw.provisioning);
  const devices = pickRecords(raw.devices);
  const credentials = pickRecords(raw.credentials);
  const selected = pickRecord([syncRuns, syncEvents, provisioning, devices, credentials], recordId);

  const actions = (
    <Button variant="outline" onClick={() => onRun?.("refresh")}>
      <RefreshCcw className="mr-2 h-4 w-4" /> Refresh Fleet Diagnostics
    </Button>
  );

  return (
    <PageLayout title="Fleet Diagnostics" subtitle="Sync freshness, provisioning posture, devices, and credential evidence" icon={ActivitySquare} rightActions={actions}>
      <div className="grid gap-4 md:grid-cols-5">
        <StatCard label="Sync Runs" value={syncRuns.length} compact />
        <StatCard label="Sync Events" value={syncEvents.length} compact />
        <StatCard label="Provisioning" value={provisioning.length} compact />
        <StatCard label="Devices" value={devices.length} compact />
        <StatCard label="Credentials" value={credentials.length} compact />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <SimpleRecordList
            title="Recent Sync Runs"
            items={syncRuns.slice(0, 8)}
            emptyTitle="No sync runs"
            emptyBody="The sync-runs endpoint returned no fleet synchronization records."
            right={<ToneBadge tone={syncRuns.length ? "stable" : "locked"}>{syncRuns.length} rows</ToneBadge>}
            renderItem={(item, index) => (
              <CenteredRecordCard
                key={item.id || index}
                title={pickRecordTitle(item, "Sync run")}
                badge={<ToneBadge tone={statusTone(item.status || item.state)}>{item.status || item.state || "unknown"}</ToneBadge>}
                description={formatBackendTime(item.createdAt || item.updatedAt || item.startedAt)}
              />
            )}
          />

          <SimpleRecordList
            title="Provisioning & Device Binding"
            items={[...provisioning.slice(0, 4), ...devices.slice(0, 4)]}
            emptyTitle="No provisioning diagnostics"
            emptyBody="Provisioning tokens and device-binding rows appear here."
            right={<ToneBadge tone={provisioning.length || devices.length ? "warning" : "locked"}>{provisioning.length + devices.length} rows</ToneBadge>}
            renderItem={(item, index) => (
              <CenteredRecordCard
                key={item.id || index}
                title={pickRecordTitle(item, "Provisioning row")}
                badge={<ToneBadge tone={statusTone(item.status || item.state)}>{item.status || item.state || "unknown"}</ToneBadge>}
                description={item.runtimeId || item.deviceId || item.runtimeKey || "No runtime key"}
              />
            )}
          />
        </div>

        <div className="space-y-4">
          <GlassCard title="Selected Fleet Diagnostic" right={<ToneBadge tone={selected ? statusTone(selected.status || selected.state) : "locked"}>{selected ? "live row" : "no row"}</ToneBadge>}>
            <PrimitiveFieldGrid record={selected} />
          </GlassCard>
          <JsonPreviewCard title="Selected Diagnostic Payload" value={selected} />
        </div>
      </div>
    </PageLayout>
  );
}

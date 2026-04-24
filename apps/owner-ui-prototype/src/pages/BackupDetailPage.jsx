import React from "react";
import { HardDrive, RotateCcw } from "lucide-react";
import { PageLayout } from "../components/layout/page-layout";
import { GlassCard } from "../components/ui/glass-card";
import { ToneBadge } from "../components/ui/tone-badge";
import { StatCard } from "../components/ui/stat-card";
import { Button } from "../components/ui/button";
import { formatBackendTime, pickRecordTitle } from "../lib/ui-helpers";
import { CenteredRecordCard, DetailHeaderBadge, JsonPreviewCard, PrimitiveFieldGrid, SimpleRecordList, pickRecord, pickRecords, statusTone } from "./live-page-helpers";

export function BackupDetailPage({ data, recordId, onRun }) {
  const raw = data?.raw || {};
  const backupList = pickRecords(raw.backupList);
  const restoreHistory = pickRecords(raw.backupHistory);
  const selected = pickRecord([backupList, restoreHistory], recordId);
  const restoreStatus = raw.backupStatus?.data || raw.backupStatus || {};

  const backupName = selected?.file || selected?.name || selected?.id || "";
  const actions = backupName ? (
    <Button variant="outline" onClick={() => onRun?.("confirmRestore", { backup: backupName, confirmBackup: backupName })}>
      <RotateCcw className="mr-2 h-4 w-4" /> Restore This Backup
    </Button>
  ) : null;

  return (
    <PageLayout title="Backup Detail" subtitle="Selected backup payload, restore status, and recovery history" icon={HardDrive} rightActions={actions}>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Backups" value={backupList.length} compact />
        <StatCard label="Restore History" value={restoreHistory.length} compact />
        <StatCard label="Selected Backup" value={backupName || "—"} compact />
        <StatCard label="Status Fields" value={Object.keys(restoreStatus).length} compact tone={Object.keys(restoreStatus).length ? "healthy" : "locked"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <GlassCard title="Selected Backup Metadata" right={<DetailHeaderBadge record={selected} fallback="backup" />}>
            <PrimitiveFieldGrid record={selected} />
          </GlassCard>

          <SimpleRecordList
            title="Restore History"
            items={restoreHistory.slice(0, 8)}
            emptyTitle="No restore history"
            emptyBody="The restore-history endpoint returned no prior executions."
            right={<ToneBadge tone={restoreHistory.length ? "stable" : "locked"}>{restoreHistory.length} rows</ToneBadge>}
            renderItem={(row, index) => (
              <CenteredRecordCard
                key={row.id || index}
                title={pickRecordTitle(row, "Restore execution")}
                badge={<ToneBadge tone={statusTone(row.status || row.state)}>{row.status || row.state || "unknown"}</ToneBadge>}
                description={formatBackendTime(row.createdAt || row.updatedAt || row.startedAt)}
              />
            )}
          />
        </div>

        <div className="space-y-4">
          <GlassCard title="Restore Status" right={<ToneBadge tone={Object.keys(restoreStatus).length ? "healthy" : "locked"}>{Object.keys(restoreStatus).length ? "live" : "empty"}</ToneBadge>}>
            <PrimitiveFieldGrid record={restoreStatus} />
          </GlassCard>
          <JsonPreviewCard title="Raw Backup Payload" value={selected} />
        </div>
      </div>
    </PageLayout>
  );
}

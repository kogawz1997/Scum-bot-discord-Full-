import React from "react";
import { FileSearch, Download } from "lucide-react";
import { PageLayout } from "../components/layout/page-layout";
import { GlassCard } from "../components/ui/glass-card";
import { ToneBadge } from "../components/ui/tone-badge";
import { StatCard } from "../components/ui/stat-card";
import { Button } from "../components/ui/button";
import { MetricPair } from "../components/ui/metric-pair";
import { formatBackendTime, pickRecordTitle } from "../lib/ui-helpers";
import { CenteredRecordCard, JsonPreviewCard, SimpleRecordList, pickRecord, pickRecords, statusTone } from "./live-page-helpers";

export function DiagnosticsPage({ data, recordId, onRun }) {
  const raw = data?.raw || {};
  const requestErrors = pickRecords(raw.observabilityErrors);
  const deliveryRows = pickRecords(raw.deliveryLifecycle);
  const selected = pickRecord([requestErrors, deliveryRows], recordId);
  const deliverySummary = raw.deliveryLifecycle?.summary || {};
  const observability = raw.observability?.data || raw.observability || {};

  const actions = (
    <Button variant="outline" onClick={() => onRun?.("exportObservability")}>
      <Download className="mr-2 h-4 w-4" /> Export Diagnostics
    </Button>
  );

  return (
    <PageLayout title="Diagnostics & Evidence" subtitle="Request failures, delivery evidence, and export-ready backend context" icon={FileSearch} rightActions={actions}>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Request Errors" value={requestErrors.length} compact tone={requestErrors.length ? "warning" : "healthy"} />
        <StatCard label="Lifecycle Rows" value={deliveryRows.length} compact />
        <StatCard label="Failed Jobs" value={Number(deliverySummary.failed24h || deliverySummary.failed || 0)} compact tone="warning" />
        <StatCard label="Dead-Letter" value={Number(deliverySummary.deadLetter || deliverySummary.deadLetterJobs || 0)} compact tone="critical" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <SimpleRecordList
            title="Request Error Feed"
            items={requestErrors.slice(0, 8)}
            emptyTitle="No request errors"
            emptyBody="The observability error slice returned no failing requests."
            right={<ToneBadge tone={requestErrors.length ? "warning" : "healthy"}>{requestErrors.length} rows</ToneBadge>}
            renderItem={(row, index) => (
              <CenteredRecordCard
                key={row.id || index}
                title={pickRecordTitle(row, "Request error")}
                badge={<ToneBadge tone={statusTone(row.status || row.level || "warning")}>{row.status || row.level || "error"}</ToneBadge>}
                description={row.path || row.route || row.message || "Backend request failure"}
              />
            )}
          />

          <SimpleRecordList
            title="Delivery Lifecycle Evidence"
            items={deliveryRows.slice(0, 8)}
            emptyTitle="No delivery lifecycle rows"
            emptyBody="Delivery evidence appears here when the backend records lifecycle events."
            right={<ToneBadge tone={deliveryRows.length ? "stable" : "locked"}>{deliveryRows.length} rows</ToneBadge>}
            renderItem={(row, index) => (
              <CenteredRecordCard
                key={row.id || index}
                title={pickRecordTitle(row, "Delivery event")}
                badge={<ToneBadge tone={statusTone(row.status || row.state || row.phase)}>{row.status || row.state || row.phase || "event"}</ToneBadge>}
                description={formatBackendTime(row.createdAt || row.updatedAt || row.at)}
              />
            )}
          />
        </div>

        <div className="space-y-4">
          <GlassCard title="Observability Summary" right={<ToneBadge tone={Object.keys(observability).length ? "healthy" : "locked"}>{Object.keys(observability).length ? "live" : "empty"}</ToneBadge>}>
            <div className="space-y-2">
              {Object.entries(observability).slice(0, 8).map(([key, value]) => (
                <MetricPair key={key} label={key} value={typeof value === "object" ? JSON.stringify(value) : String(value)} tone="stable" />
              ))}
              {!Object.keys(observability).length && <div className="text-sm text-zinc-500">No summary fields were returned by the observability overview endpoint.</div>}
            </div>
          </GlassCard>
          <JsonPreviewCard title="Selected Evidence Payload" value={selected} />
        </div>
      </div>
    </PageLayout>
  );
}

import React from "react";
import { ShieldCheck, Download } from "lucide-react";
import { PageLayout } from "../components/layout/page-layout";
import { GlassCard } from "../components/ui/glass-card";
import { ToneBadge } from "../components/ui/tone-badge";
import { StatCard } from "../components/ui/stat-card";
import { Button } from "../components/ui/button";
import { formatBackendTime, pickRecordTitle } from "../lib/ui-helpers";
import { CenteredRecordCard, DetailHeaderBadge, JsonPreviewCard, PrimitiveFieldGrid, SimpleRecordList, pickRecord, pickRecords, statusTone } from "./live-page-helpers";

export function AccessPosturePage({ data, recordId, onRun }) {
  const raw = data?.raw || {};
  const users = pickRecords(raw.users);
  const sessions = pickRecords(raw.sessions);
  const securityEvents = pickRecords(raw.securityEvents);
  const selected = pickRecord([users, sessions, securityEvents], recordId);
  const roleMatrix = raw.roleMatrix?.summary || raw.roleMatrix || {};

  const actions = (
    <Button variant="outline" onClick={() => onRun?.("exportAudit")}>
      <Download className="mr-2 h-4 w-4" /> Export Audit
    </Button>
  );

  return (
    <PageLayout title="Access Posture" subtitle="Users, sessions, role posture, and recent access signals" icon={ShieldCheck} rightActions={actions}>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Users" value={users.length} compact />
        <StatCard label="Sessions" value={sessions.length} compact />
        <StatCard label="Security Events" value={securityEvents.length} compact tone={securityEvents.length ? "warning" : "healthy"} />
        <StatCard label="Role Entries" value={roleMatrix.roleCount || roleMatrix.roles || pickRecords(roleMatrix).length || 0} compact />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <SimpleRecordList
            title="Recent Sessions"
            items={sessions.slice(0, 8)}
            emptyTitle="No sessions"
            emptyBody="The owner auth sessions endpoint returned no rows."
            right={<ToneBadge tone={sessions.length ? "stable" : "locked"}>{sessions.length} rows</ToneBadge>}
            renderItem={(session, index) => (
              <CenteredRecordCard
                key={session.id || index}
                title={pickRecordTitle(session, "Owner session")}
                badge={<ToneBadge tone={statusTone(session.status || session.state)}>{session.status || session.state || "unknown"}</ToneBadge>}
                description={formatBackendTime(session.createdAt || session.updatedAt || session.lastSeenAt)}
              />
            )}
          />

          <SimpleRecordList
            title="Recent Security Events"
            items={securityEvents.slice(0, 8)}
            emptyTitle="No security events"
            emptyBody="The security-events endpoint returned no active entries."
            right={<ToneBadge tone={securityEvents.length ? "warning" : "healthy"}>{securityEvents.length} events</ToneBadge>}
            renderItem={(event, index) => (
              <CenteredRecordCard
                key={event.id || index}
                title={pickRecordTitle(event, "Security event")}
                badge={<ToneBadge tone={statusTone(event.severity || event.status || "warning")}>{event.severity || event.status || "signal"}</ToneBadge>}
                description={event.message || event.reason || event.detail || "Owner security signal from backend"}
              />
            )}
          />
        </div>

        <div className="space-y-4">
          <GlassCard title="Selected Access Record" right={<DetailHeaderBadge record={selected} fallback="live access" />}>
            <PrimitiveFieldGrid record={selected} />
          </GlassCard>
          <JsonPreviewCard title="Selected Raw Payload" value={selected} />
        </div>
      </div>
    </PageLayout>
  );
}

import React from "react";
import { Globe, Moon, Shield, UserCircle2 } from "lucide-react";
import { PageLayout } from "../components/layout/page-layout";
import { GlassCard } from "../components/ui/glass-card";
import { ToneBadge } from "../components/ui/tone-badge";
import { Field } from "../components/ui/field";
import { MetricPair } from "../components/ui/metric-pair";
import { Button } from "../components/ui/button";
import { extractItems } from "../lib/owner-adapters";
import { formatBackendTime } from "../lib/ui-helpers";

export function ProfilePage({ data, locale, theme, onToggleLocale, onToggleTheme }) {
  const raw = data?.raw || {};
  const session = raw.authSession?.data || raw.authSession || {};
  const settings = raw.controlPanelSettings?.data || raw.controlPanelSettings || {};
  const sessions = extractItems(raw.sessions);
  const users = extractItems(raw.users);

  const displayName =
    session.displayName ||
    session.name ||
    session.username ||
    session.email ||
    "Owner Operator";
  const role =
    session.role ||
    session.scope ||
    session.accountType ||
    "owner";

  const actions = (
    <>
      <Button variant="outline" onClick={onToggleLocale}>
        <Globe className="mr-2 h-4 w-4" /> {locale === "th" ? "Switch to EN" : "Switch to TH"}
      </Button>
      <Button variant="outline" onClick={onToggleTheme}>
        <Moon className="mr-2 h-4 w-4" /> {theme === "contrast" ? "Default Theme" : "Contrast Theme"}
      </Button>
    </>
  );

  return (
    <PageLayout
      title="Owner Profile"
      subtitle="Owner identity, scope, and active session."
      icon={UserCircle2}
      rightActions={actions}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <GlassCard title="Identity" right={<ToneBadge tone="healthy">{role}</ToneBadge>}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Display name" value={displayName} />
              <Field label="Email" value={session.email || "Not available"} />
              <Field label="Username" value={session.username || "Not available"} />
              <Field label="Session ID" value={session.sessionId || session.id || "Not available"} />
              <Field label="Last login" value={formatBackendTime(session.lastLoginAt || session.updatedAt)} />
              <Field label="Environment" value={settings.environment || settings.nodeEnv || "unknown"} />
            </div>
          </GlassCard>

          <GlassCard title="Workspace Preferences">
            <div className="space-y-3">
              <MetricPair label="Language" value={locale === "th" ? "Thai" : "English"} />
              <MetricPair label="Theme" value={theme === "contrast" ? "Contrast" : "Default"} />
              <MetricPair label="Owner API" value={settings.ownerBaseUrl || settings.publicEndpoint || "/owner/api"} />
            </div>
          </GlassCard>
        </div>

        <div className="space-y-4">
          <GlassCard title="Access Posture" right={<Shield className="h-4 w-4 text-zinc-500" />}>
            <div className="space-y-3">
              <MetricPair label="Known admin users" value={users.length} />
              <MetricPair label="Visible sessions" value={sessions.length} />
              <MetricPair label="Scope" value={role} tone="healthy" />
            </div>
          </GlassCard>
        </div>
      </div>
    </PageLayout>
  );
}

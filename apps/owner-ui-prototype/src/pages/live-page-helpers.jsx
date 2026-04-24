import React from "react";
import { GlassCard } from "../components/ui/glass-card";
import { ToneBadge } from "../components/ui/tone-badge";
import { Field } from "../components/ui/field";
import { DataEmptyState } from "../components/ui/data-empty-state";
import { extractItems } from "../lib/owner-adapters";
import { formatBackendTime } from "../lib/ui-helpers";

export function statusTone(status) {
  const normalized = String(status || "").toLowerCase();
  if (
    normalized.includes("healthy")
    || normalized.includes("active")
    || normalized.includes("online")
    || normalized.includes("success")
    || normalized.includes("paid")
    || normalized.includes("connected")
    || normalized.includes("complete")
    || normalized.includes("fresh")
  ) return "healthy";
  if (
    normalized.includes("warning")
    || normalized.includes("pending")
    || normalized.includes("trial")
    || normalized.includes("stale")
    || normalized.includes("preview")
  ) return "warning";
  if (
    normalized.includes("failed")
    || normalized.includes("critical")
    || normalized.includes("offline")
    || normalized.includes("past_due")
    || normalized.includes("canceled")
    || normalized.includes("cancelled")
    || normalized.includes("error")
  ) return "critical";
  if (normalized.includes("locked")) return "locked";
  return "neutral";
}

function stringValue(value) {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return Number.isFinite(value) ? value.toLocaleString() : "—";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function looksLikeDateKey(key) {
  return /at$|date$|time$|created|updated|issued|renew|expire|heartbeat|seen|synced/i.test(String(key || ""));
}

export function formatFieldValue(key, value) {
  if (value === undefined || value === null || value === "") return "—";
  if (looksLikeDateKey(key) && typeof value === "string") return formatBackendTime(value);
  return stringValue(value);
}

function candidateValues(record = {}) {
  return [
    record.id,
    record.invoiceId,
    record.invoice,
    record.paymentAttemptId,
    record.subscriptionId,
    record.packageId,
    record.packageName,
    record.sku,
    record.runtimeId,
    record.runtimeKey,
    record.tenantId,
    record.slug,
    record.serverId,
    record.key,
    record.name,
  ]
    .filter(Boolean)
    .map((value) => String(value));
}

export function recordMatchesId(record = {}, recordId = "") {
  if (!recordId) return false;
  return candidateValues(record).includes(String(recordId));
}

export function pickRecord(sources = [], recordId = "") {
  const records = sources.flatMap((source) => extractItems(source));
  if (!records.length) return null;
  if (!recordId) return records[0];
  return records.find((record) => recordMatchesId(record, recordId)) || records[0];
}

export function pickRecords(source) {
  return extractItems(source);
}

export function primitiveEntries(record = {}, options = {}) {
  const limit = Number.isFinite(options.limit) ? options.limit : 12;
  const exclude = new Set(options.exclude || []);
  return Object.entries(record || {})
    .filter(([key, value]) => !exclude.has(key) && ["string", "number", "boolean"].includes(typeof value))
    .slice(0, limit);
}

export function DetailHeaderBadge({ record, fallback = "live record" }) {
  const status = record?.status || record?.state || record?.health || record?.severity || fallback;
  return <ToneBadge tone={statusTone(status)}>{String(status || fallback)}</ToneBadge>;
}

export function PrimitiveFieldGrid({ record, entries }) {
  const pairs = entries || primitiveEntries(record);
  if (!pairs.length) {
    return <DataEmptyState title="No primitive fields" body="The backend record exists but has no simple scalar fields to present here." />;
  }
  return (
    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
      {pairs.map(([key, value]) => (
        <Field key={key} label={key} value={formatFieldValue(key, value)} />
      ))}
    </div>
  );
}

export function JsonPreviewCard({ title = "Raw backend record", value }) {
  return (
    <GlassCard title={title}>
      {value ? (
        <pre className="max-h-[420px] overflow-auto rounded-xl border border-white/5 bg-black/30 p-4 text-xs leading-6 text-zinc-300">
          {JSON.stringify(value, null, 2)}
        </pre>
      ) : (
        <DataEmptyState title="No raw record" body="The selected record did not include a raw payload." />
      )}
    </GlassCard>
  );
}

export function SimpleRecordList({
  title,
  items = [],
  emptyTitle,
  emptyBody,
  renderItem,
  right,
}) {
  return (
    <GlassCard title={title} right={right}>
      {items.length ? (
        <div className="space-y-2">
          {items.map((item, index) => renderItem(item, index))}
        </div>
      ) : (
        <DataEmptyState title={emptyTitle} body={emptyBody} />
      )}
    </GlassCard>
  );
}

export function CenteredRecordCard({ title, badge, description, meta }) {
  const metaLines = Array.isArray(meta) ? meta.filter(Boolean) : meta ? [meta] : [];
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-3.5">
      <div className="flex flex-col items-start gap-2">
        <div className="text-sm font-semibold leading-6 text-white">{title}</div>
        {badge ? <div>{badge}</div> : null}
      </div>
      {description ? <div className="mt-2 text-xs leading-5 text-zinc-400">{description}</div> : null}
      {metaLines.length ? (
        <div className="mt-2 flex flex-col gap-1 text-[11px] leading-5 text-zinc-500">
          {metaLines.map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

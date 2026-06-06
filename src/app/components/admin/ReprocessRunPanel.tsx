import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import {
  getReprocessRun,
  listReprocessRuns,
  type ReprocessDriftWarning,
  type ReprocessLabValuesOutcome,
  type ReprocessRun,
  type ReprocessStageOutcome,
} from "../../../api/client";

interface ReprocessRunPanelProps {
  documentId: string;
  /** If set, panel will poll this run until terminal. */
  activeRunId?: string;
  /** Bump to force a re-fetch of the latest runs list. */
  refreshToken?: number;
  /** Called once the active run leaves the running state. */
  onRunFinished?: (run: ReprocessRun) => void;
}

const POLL_INTERVAL_MS = 1500;

export default function ReprocessRunPanel({
  documentId,
  activeRunId,
  refreshToken,
  onRunFinished,
}: ReprocessRunPanelProps) {
  const [runs, setRuns] = useState<ReprocessRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    listReprocessRuns(documentId, 10)
      .then((res) => {
        if (!cancelled) setRuns(res.items);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load reprocess history");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [documentId, refreshToken]);

  useEffect(() => {
    if (!activeRunId) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const run = await getReprocessRun(documentId, activeRunId);
        if (cancelled) return;
        setRuns((prev) => {
          const idx = prev.findIndex((r) => r.id === run.id);
          if (idx === -1) return [run, ...prev];
          const next = [...prev];
          next[idx] = run;
          return next;
        });
        if (run.status !== "running") {
          onRunFinished?.(run);
          return;
        }
        setTimeout(tick, POLL_INTERVAL_MS);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to poll run");
      }
    };
    tick();

    return () => {
      cancelled = true;
    };
  }, [activeRunId, documentId, onRunFinished]);

  if (loading && runs.length === 0) {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500">
        Loading reprocess history…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
        No reprocess runs yet for this document.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {runs.map((run) => (
        <RunCard key={run.id} run={run} />
      ))}
    </div>
  );
}

function RunCard({ run }: { run: ReprocessRun }) {
  const stageOutcomes = run.outcomes?.stages ?? [];
  const labOutcome = run.outcomes?.lab_values ?? null;
  const drift = run.drift_warnings ?? [];
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <StatusIcon status={run.status} />
          <span className="font-medium text-slate-900">{describeScope(run)}</span>
          <span className="text-xs text-slate-500">by {run.requested_by_email || "—"}</span>
        </div>
        <div className="text-xs text-slate-500">{formatTs(run.started_at)}</div>
      </div>

      {run.error ? (
        <p className="mt-2 text-xs text-rose-700">
          Failed{run.failed_stage ? ` at ${run.failed_stage}` : ""}: {run.error}
        </p>
      ) : null}

      {stageOutcomes.length > 0 ? (
        <ul className="mt-2 divide-y divide-slate-100 text-xs">
          {stageOutcomes.map((outcome, idx) => (
            <li key={`${outcome.stage}-${idx}`} className="py-1.5">
              <StageRow outcome={outcome} />
            </li>
          ))}
        </ul>
      ) : null}

      {labOutcome ? (
        <div className="mt-2 rounded-md border border-slate-100 bg-slate-50 p-2 text-xs">
          <LabValuesRow outcome={labOutcome} />
        </div>
      ) : null}

      {drift.length > 0 ? (
        <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
          <div className="flex items-center gap-1 font-medium">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            Drift detected — the confirmed record is now marked Reprocess Required.
          </div>
          <ul className="mt-1 ml-5 list-disc">
            {drift.map((w, idx) => (
              <li key={idx}>{describeDrift(w)}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function StageRow({ outcome }: { outcome: ReprocessStageOutcome }) {
  const changed = outcome.changed_fields ?? [];
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <span className="font-medium text-slate-900">{outcome.stage}</span>
        <span className="ml-2 text-slate-500">{outcome.status}</span>
        {outcome.detail || outcome.reason ? (
          <span className="ml-2 text-slate-500">— {outcome.detail || outcome.reason}</span>
        ) : null}
      </div>
      <div className="flex flex-shrink-0 items-center gap-2 text-slate-500">
        {outcome.duration_ms != null ? <span>{outcome.duration_ms}ms</span> : null}
        {changed.length > 0 ? (
          <span title={changed.join(", ")}>{changed.length} field(s)</span>
        ) : null}
      </div>
    </div>
  );
}

function LabValuesRow({ outcome }: { outcome: ReprocessLabValuesOutcome }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <span className="font-medium text-slate-900">lab_values</span>
        <span className="ml-2 text-slate-500">{outcome.status}</span>
        {outcome.reason ? <span className="ml-2 text-slate-500">— {outcome.reason}</span> : null}
        {outcome.error ? <span className="ml-2 text-rose-700">— {outcome.error}</span> : null}
      </div>
      <div className="text-slate-500">
        {outcome.tests_count != null ? <span>{outcome.tests_count} tests</span> : null}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: ReprocessRun["status"] }) {
  switch (status) {
    case "running":
      return <Loader2 className="h-4 w-4 animate-spin text-sky-600" aria-hidden="true" />;
    case "succeeded":
      return <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />;
    case "partial":
      return <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-rose-600" aria-hidden="true" />;
  }
}

function describeScope(run: ReprocessRun): string {
  if (run.scope === "full") return "Full reprocess";
  if (run.scope === "reuse_ocr") return "Reuse OCR";
  const stages = run.requested_stages?.length ? run.requested_stages.join(", ") : "no stages";
  return `Targeted: ${stages}`;
}

function describeDrift(w: ReprocessDriftWarning): string {
  if (w.kind === "document_type_drift") {
    return `Document type changed (${w.before} → ${w.after})`;
  }
  if (w.kind === "profile_id_drift") {
    return `Profile linkage changed (${(w.before || "").slice(0, 8)}… → ${(w.after || "").slice(0, 8)}…)`;
  }
  return JSON.stringify(w);
}

function formatTs(ts?: string | null): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

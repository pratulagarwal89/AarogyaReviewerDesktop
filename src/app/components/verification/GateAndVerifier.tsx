import type { CaseDetail } from '../../../api/verification';

const GATE_LABELS: Record<string, string> = {
  threshold_target: 'Threshold/target legend suspected',
  interpretation_matrix: 'Interpretation matrix suspected',
  contradictory_analyte: 'Contradictory analyte value',
};

/** Explains WHY the deterministic gate selected this page for verification. */
export function GatePanel({ detail }: { detail: CaseDetail }) {
  const reasons = detail.case.gate_reasons ?? [];
  const signals = (detail.case.gate_signals ?? {}) as Record<string, unknown>;
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <header className="border-b border-slate-200 px-4 py-2.5">
        <h3 className="text-sm font-semibold text-slate-900">Why this was flagged</h3>
      </header>
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap gap-1.5">
          {reasons.length === 0 ? (
            <span className="text-xs text-slate-500">No gate reasons recorded.</span>
          ) : (
            reasons.map((r) => (
              <span key={r} className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
                {GATE_LABELS[r] ?? r}
              </span>
            ))
          )}
        </div>
        {Object.keys(signals).length > 0 ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {Object.entries(signals).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2 border-b border-slate-100 py-1">
                <dt className="text-slate-500">{k}</dt>
                <dd className="font-mono text-slate-800">{String(v)}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        <div className="text-xs text-slate-500">
          Gate <span className="font-mono">{detail.case.gate_version}</span> · category{' '}
          <span className="font-medium text-slate-700">{detail.case.category}</span>
          {detail.case.exemptions_applied && detail.case.exemptions_applied.length > 0 ? (
            <> · exemptions: {detail.case.exemptions_applied.join(', ')}</>
          ) : null}
        </div>
      </div>
    </section>
  );
}

interface RowDecision {
  source_row_id?: string;
  decision?: string;
  reason?: string;
}

/** Shows the verifier's assessment: per-attempt runs, page verdict, row decisions. */
export function VerifierAssessment({ detail }: { detail: CaseDetail }) {
  const runs = detail.runs;
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <header className="border-b border-slate-200 px-4 py-2.5">
        <h3 className="text-sm font-semibold text-slate-900">Verifier assessment</h3>
      </header>
      <div className="p-4">
        {runs.length === 0 ? (
          <p className="text-sm text-slate-500">No verifier runs yet.</p>
        ) : (
          <ol className="space-y-3">
            {runs.map((run) => {
              const decisions = Array.isArray(run.row_decisions)
                ? (run.row_decisions as RowDecision[])
                : [];
              return (
                <li key={run.id} className="rounded-md border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-slate-800">
                      Attempt {run.attempt} · {run.model}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 font-medium ${
                        run.status === 'succeeded'
                          ? 'bg-emerald-100 text-emerald-700'
                          : run.status === 'failed'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {run.status}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Page verdict: <span className="font-medium text-slate-700">{run.page_verdict ?? '—'}</span>
                    {run.cost_usd != null ? <> · ${run.cost_usd.toFixed(3)}</> : null}
                    {run.latency_ms != null ? <> · {(run.latency_ms / 1000).toFixed(1)}s</> : null}
                  </div>
                  {decisions.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-xs">
                      {decisions.map((d, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span
                            className={`mt-0.5 rounded px-1 py-0.5 font-medium ${
                              d.decision === 'drop'
                                ? 'bg-rose-50 text-rose-600'
                                : 'bg-emerald-50 text-emerald-600'
                            }`}
                          >
                            {d.decision ?? '?'}
                          </span>
                          <span className="text-slate-600">
                            <span className="font-mono">{d.source_row_id ?? '—'}</span>
                            {d.reason ? ` — ${d.reason}` : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

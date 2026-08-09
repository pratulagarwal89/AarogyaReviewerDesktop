import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { CaseDetail } from '../../../api/verification';

type SignalMeta = { label: string; blurb: string; trigger?: number };

// The three checks that can actually flag a page. Each value is the SHARE of
// rows on the page that matched; a page is flagged when any share crosses its
// trigger line. Default trigger values mirror gate-2026.07-a — the live value
// is read from gate_reasons when present, so this display can't silently drift.
const TRIGGER_META: Record<string, SignalMeta> = {
  threshold_target: {
    label: 'Reads like a threshold / target legend',
    blurb: 'Values that equal their own reference range and look like a cut-off (e.g. “<10”) instead of a measured result.',
    trigger: 0.6,
  },
  interpretation_matrix: {
    label: 'Reads like an interpretation key',
    blurb: 'Values that are only words such as normal / high / low — with no number, no unit and no range.',
    trigger: 0.5,
  },
  contradictory_analyte: {
    label: 'Same test, conflicting values',
    blurb: 'One test appears more than once with results that clash, and units, panels or dates don’t explain the difference.',
    trigger: 0.6,
  },
};

// Supporting signals: shown for context, but they never flag a page on their own.
const SUPPORTING_META: Record<string, SignalMeta> = {
  frac_threshold: {
    label: 'Values written as a cut-off',
    blurb: 'How many values use <, >, ≤ or ≥.',
  },
  frac_no_unit: {
    label: 'Values with no unit',
    blurb: 'How many values have no measurement unit.',
  },
};

// Plain-English fragment for the headline, per triggered check.
const FIRED_SUMMARY: Record<string, string> = {
  threshold_target: 'most values match their own reference range and look like threshold cut-offs rather than real measurements',
  interpretation_matrix: 'the page reads like an interpretation key (normal / high / low) instead of actual results',
  contradictory_analyte: 'the same test shows up with conflicting values that units, panels or dates don’t explain',
};

// Checks the gate considered but decided did NOT count as suspicious.
const EXEMPTION_LABELS: Record<string, string> = {
  qualitative_result_eq_ref: 'a qualitative result matching its reference (e.g. “Negative”)',
  different_units: 'repeats that legitimately use different units',
  count_vs_morphology: 'a count paired with a morphology description',
  different_panels_or_methods_or_dates: 'different panels, methods or dates',
  numeric_variants: 'ordinary numeric variation',
};

const asPct = (v: number) => `${Math.round(v * 100)}%`;
const asNum = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** One check rendered as a labelled bar showing its share vs. its trigger line. */
function SignalBar({
  meta,
  value,
  fired,
  trigger,
}: {
  meta: SignalMeta;
  value: number;
  fired: boolean;
  trigger: number | null;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const triggerPct = trigger != null ? Math.max(0, Math.min(1, trigger)) * 100 : null;
  return (
    <li>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-slate-800">{meta.label}</span>
        <span className={`text-xs font-semibold ${fired ? 'text-amber-700' : 'text-slate-500'}`}>
          {asPct(value)}
        </span>
      </div>
      <div className="relative mt-1 h-2 rounded-full bg-slate-100" title={triggerPct != null ? `Flags at ${asPct(trigger ?? 0)} of rows` : undefined}>
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${fired ? 'bg-amber-400' : 'bg-sky-400'}`}
          style={{ width: `${pct}%` }}
        />
        {triggerPct != null ? (
          <div
            className="absolute inset-y-[-2px] w-0.5 bg-slate-400"
            style={{ left: `${triggerPct}%` }}
            aria-hidden="true"
          />
        ) : null}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {fired ? <span className="font-medium text-amber-700">Triggered · </span> : null}
        {meta.blurb}
        {triggerPct != null ? ` Flags at ${asPct(trigger ?? 0)}+.` : ''}
      </p>
    </li>
  );
}

/** Explains WHY the deterministic gate selected this page for verification. */
export function GatePanel({ detail }: { detail: CaseDetail }) {
  const reasons = detail.case.gate_reasons ?? [];
  const signals = (detail.case.gate_signals ?? {}) as Record<string, unknown>;
  const exemptions = detail.case.exemptions_applied ?? [];

  // A reason is either a bare signal name ("interpretation_matrix") or carries
  // its live threshold ("interpretation_matrix>=0.5"). Capture both.
  const firedTriggers = new Map<string, number | null>();
  for (const raw of reasons) {
    const m = /^\s*([a-z_]+)\s*>=\s*([\d.]+)/i.exec(raw);
    if (m) firedTriggers.set(m[1], Number(m[2]));
    else firedTriggers.set(raw.trim(), null);
  }

  const summaryFragments = [...firedTriggers.keys()]
    .map((k) => FIRED_SUMMARY[k])
    .filter(Boolean);

  // Render the two known supporting signals when present, then any unmapped
  // extras so no gate output is ever silently hidden.
  const supportingKeys = Object.keys(signals).filter((k) => k in SUPPORTING_META);
  const extraKeys = Object.keys(signals).filter(
    (k) => !(k in TRIGGER_META) && !(k in SUPPORTING_META),
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <header className="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5">
        <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-slate-900">Why this was flagged</h3>
      </header>
      <div className="space-y-4 p-4">
        {/* Plain-English headline. */}
        {summaryFragments.length > 0 ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
            This page was sent for a second look because{' '}
            {summaryFragments.map((f, i) => (
              <span key={i}>
                {i > 0 ? (i === summaryFragments.length - 1 ? ', and ' : ', ') : ''}
                {f}
              </span>
            ))}
            . Confirm the values shown are real patient results.
          </div>
        ) : (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            No specific trigger was recorded for this page.
          </div>
        )}

        {/* The three trigger checks, each as a share-vs-trigger bar. */}
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Checks that can flag a page
          </h4>
          <ul className="space-y-3">
            {Object.entries(TRIGGER_META).map(([key, meta]) => {
              const fired = firedTriggers.has(key);
              const trigger = (fired ? firedTriggers.get(key) : undefined) ?? meta.trigger ?? null;
              return (
                <SignalBar
                  key={key}
                  meta={meta}
                  value={asNum(signals[key])}
                  fired={fired}
                  trigger={trigger}
                />
              );
            })}
          </ul>
        </div>

        {/* Supporting context — never flags on its own. */}
        {supportingKeys.length > 0 || extraKeys.length > 0 ? (
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Background context
            </h4>
            <p className="mb-2 text-xs text-slate-400">Never flags a page on its own.</p>
            <dl className="space-y-1 text-xs">
              {supportingKeys.map((k) => (
                <div key={k} className="flex items-baseline justify-between gap-2">
                  <dt className="text-slate-600">{SUPPORTING_META[k].label}</dt>
                  <dd className="font-semibold text-slate-700">{asPct(asNum(signals[k]))}</dd>
                </div>
              ))}
              {extraKeys.map((k) => (
                <div key={k} className="flex items-baseline justify-between gap-2">
                  <dt className="font-mono text-slate-500">{k}</dt>
                  <dd className="font-mono text-slate-700">{String(signals[k])}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        {/* Checks the gate ruled out. */}
        {exemptions.length > 0 ? (
          <div className="flex items-start gap-2 rounded-md bg-emerald-50 p-3 text-xs text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
            <p>
              <span className="font-medium">Ruled out:</span>{' '}
              {exemptions.map((e, i) => (
                <span key={e}>
                  {i > 0 ? '; ' : ''}
                  {EXEMPTION_LABELS[e] ?? e}
                </span>
              ))}
              .
            </p>
          </div>
        ) : null}

        {/* Audit trail — kept small. */}
        <p className="text-xs text-slate-400">
          Rule set <span className="font-mono">{detail.case.gate_version}</span>
        </p>
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

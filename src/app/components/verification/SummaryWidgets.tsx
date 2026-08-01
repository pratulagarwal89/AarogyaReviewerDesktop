import { useNavigate } from 'react-router-dom';
import type { DashboardSummary } from '../../../api/verification';

type Tone = 'action' | 'warn' | 'danger' | 'active' | 'muted' | 'ok';

const toneClass: Record<Tone, string> = {
  action: 'border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-800',
  warn: 'border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800',
  danger: 'border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800',
  active: 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-800',
  muted: 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700',
  ok: 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800',
};

interface WidgetSpec {
  key: keyof DashboardSummary;
  label: string;
  hint: string;
  tone: Tone;
  /** Queue query string this widget drills into (empty = pending-primary panel). */
  query: string;
}

const WIDGETS: WidgetSpec[] = [
  {
    key: 'proposals_ready',
    label: 'Proposals ready',
    hint: 'Verifier filtered rows — awaiting your decision',
    tone: 'action',
    query: 'review_status=pending&has_proposal=true&superseded=false',
  },
  {
    key: 'mixed_or_uncertain',
    label: 'Mixed / uncertain',
    hint: 'Verified but produced no proposal',
    tone: 'warn',
    query: 'review_status=pending&has_proposal=false&verification_status=succeeded',
  },
  {
    key: 'failed',
    label: 'Verification failed',
    hint: 'Verifier run errored — retry or keep',
    tone: 'danger',
    query: 'verification_status=failed',
  },
  {
    key: 'queued_or_running',
    label: 'Queued / running',
    hint: 'In the verifier queue right now',
    tone: 'active',
    query: 'verification_status=queued',
  },
  {
    key: 'superseded',
    label: 'Superseded',
    hint: 'A newer primary landed — reinspect',
    tone: 'muted',
    query: 'superseded=true&review_status=pending',
  },
  {
    key: 'resolved_recent',
    label: 'Resolved (7d)',
    hint: 'Recently closed by a reviewer',
    tone: 'ok',
    query: 'review_status=resolved',
  },
];

export default function SummaryWidgets({
  summary,
  onOpenPendingPrimary,
}: {
  summary: DashboardSummary;
  onOpenPendingPrimary: () => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {WIDGETS.map((w) => {
        const count = summary[w.key] as number;
        const empty = count === 0;
        return (
          <button
            key={w.key}
            type="button"
            onClick={() => navigate('/admin/verification?' + w.query)}
            className={`flex flex-col items-start rounded-lg border p-4 text-left transition ${toneClass[w.tone]} ${
              empty ? 'opacity-70' : ''
            }`}
            aria-label={`${w.label}: ${count}`}
          >
            <span className="text-3xl font-bold tabular-nums">{count}</span>
            <span className="mt-1 text-sm font-semibold">{w.label}</span>
            <span className="mt-0.5 text-xs opacity-80">{empty ? 'Nothing here — all clear' : w.hint}</span>
          </button>
        );
      })}

      {/* Pending-primary reports: reports awaiting a fresh primary activation. */}
      <button
        type="button"
        onClick={onOpenPendingPrimary}
        className={`flex flex-col items-start rounded-lg border p-4 text-left transition ${toneClass.warn} ${
          summary.pending_primary_reports === 0 ? 'opacity-70' : ''
        }`}
        aria-label={`Pending primary reports: ${summary.pending_primary_reports}`}
      >
        <span className="text-3xl font-bold tabular-nums">{summary.pending_primary_reports}</span>
        <span className="mt-1 text-sm font-semibold">Pending primary</span>
        <span className="mt-0.5 text-xs opacity-80">
          {summary.pending_primary_reports === 0
            ? 'No re-extractions waiting'
            : 'New primary awaiting activation'}
        </span>
      </button>

      {/* Oldest open — context, not a queue filter. */}
      <div className="flex flex-col items-start rounded-lg border border-slate-200 bg-white p-4 text-left">
        <span className="text-sm font-semibold text-slate-700">Oldest open</span>
        <span className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
          {summary.oldest_open_created_at
            ? new Date(summary.oldest_open_created_at).toLocaleDateString()
            : '—'}
        </span>
        <span className="mt-0.5 text-xs text-slate-500">
          {summary.oldest_open_created_at ? 'Longest-waiting pending case' : 'No open cases'}
        </span>
      </div>
    </div>
  );
}

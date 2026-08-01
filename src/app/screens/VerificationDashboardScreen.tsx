import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, RefreshCw, X } from 'lucide-react';
import AdminLayout from '../components/admin/AdminLayout';
import SummaryWidgets from '../components/verification/SummaryWidgets';
import CaseQueue from '../components/verification/CaseQueue';
import {
  getDashboardSummary,
  listPendingPrimaryReports,
  type DashboardSummary,
  type PendingPrimaryReport,
} from '../../api/verification';

/**
 * Selective-verification audit dashboard. Intentionally does NOT enumerate every
 * lab report — it surfaces only the small set of cases the deterministic gate
 * flagged for verification, plus reports with a pending primary re-extraction.
 */
export default function VerificationDashboardScreen() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPending, setShowPending] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await getDashboardSummary();
      setSummary(s);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load summary');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Poll every 10s only while there is active verifier work (queued/running > 0).
  const activeCount = summary?.queued_or_running ?? 0;
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    if (activeCount <= 0) return;
    const id = setInterval(() => loadRef.current(), 10_000);
    return () => clearInterval(id);
  }, [activeCount]);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Verification audit</h1>
          <p className="text-sm text-slate-500">
            Cases the deterministic gate flagged — not every report. Publication is always explicit.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Loading dashboard…
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4" aria-hidden="true" /> {error}
          <button type="button" onClick={load} className="ml-2 underline">
            Retry
          </button>
        </div>
      ) : summary ? (
        <>
          {activeCount > 0 ? (
            <div className="flex items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs text-indigo-700">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              {activeCount} verification{activeCount === 1 ? '' : 's'} in flight — auto-refreshing every 10s
            </div>
          ) : null}
          <SummaryWidgets summary={summary} onOpenPendingPrimary={() => setShowPending(true)} />
        </>
      ) : null}

      <CaseQueue />

      {showPending ? (
        <PendingPrimaryDrawer
          onClose={() => setShowPending(false)}
          onOpenDocument={(docId) => navigate('/admin/reports/' + docId)}
        />
      ) : null}
    </AdminLayout>
  );
}

function PendingPrimaryDrawer({
  onClose,
  onOpenDocument,
}: {
  onClose: () => void;
  onOpenDocument: (documentId: string) => void;
}) {
  const [reports, setReports] = useState<PendingPrimaryReport[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    listPendingPrimaryReports({ limit: 100 })
      .then((r) => setReports(r.reports))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-md flex-col bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Pending primary reports"
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Reports pending a new primary</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-auto p-3">
          {error ? (
            <p className="text-sm text-rose-600">{error}</p>
          ) : !reports ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : reports.length === 0 ? (
            <p className="text-sm text-slate-500">No reports have a pending primary re-extraction.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {reports.map((r) => (
                <li key={r.report_id} className="rounded-md border border-slate-200 p-3">
                  <div className="font-medium text-slate-900">{r.profile_name ?? '—'}</div>
                  <div className="truncate text-xs text-slate-500">{r.filename ?? r.report_id}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Active: <span className="font-mono">{r.active_kind ?? '—'}</span> · rev{' '}
                    {r.publication_revision}
                  </div>
                  {r.document_id ? (
                    <button
                      type="button"
                      onClick={() => onOpenDocument(r.document_id!)}
                      className="mt-2 text-xs font-medium text-sky-700 hover:underline"
                    >
                      Open document review →
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

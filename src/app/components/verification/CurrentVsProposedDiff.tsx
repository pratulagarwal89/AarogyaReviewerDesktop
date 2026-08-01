import { useEffect, useMemo, useState } from 'react';
import { getReportVersion } from '../../../api/verification';
import { diffRows, normalizeTests, summarizeDiff, type DiffRow, type DiffTestRow } from './diffRows';

const STATUS_STYLE: Record<DiffRow['status'], { row: string; tag: string; label: string }> = {
  removed: { row: 'bg-rose-50', tag: 'bg-rose-100 text-rose-700', label: 'Removed' },
  added: { row: 'bg-emerald-50', tag: 'bg-emerald-100 text-emerald-700', label: 'Added' },
  changed: { row: 'bg-amber-50', tag: 'bg-amber-100 text-amber-700', label: 'Changed' },
  unchanged: { row: '', tag: 'bg-slate-100 text-slate-500', label: 'Unchanged' },
};

function cell(cur?: DiffTestRow, prop?: DiffTestRow, field: keyof DiffTestRow = 'value') {
  const a = cur?.[field];
  const b = prop?.[field];
  const changed = cur && prop && a !== b;
  return (
    <div className="flex flex-col">
      <span className={changed ? 'text-rose-600 line-through' : 'text-slate-800'}>{String(a ?? '—') || '—'}</span>
      {changed ? <span className="text-emerald-700">{String(b ?? '—') || '—'}</span> : null}
    </div>
  );
}

/**
 * Current (active) vs proposed extraction, diffed by source_row_id. In the common
 * verifier_filtered case this shows exactly which rows the proposal drops. Rows
 * are matched by lineage id so the view is a true diff, not two re-renders.
 */
export default function CurrentVsProposedDiff({
  reportId,
  currentVersionId,
  proposedVersionId,
  showUnchanged = false,
}: {
  reportId: string;
  currentVersionId: string;
  proposedVersionId: string;
  showUnchanged?: boolean;
}) {
  const [current, setCurrent] = useState<DiffTestRow[] | null>(null);
  const [proposed, setProposed] = useState<DiffTestRow[] | null>(null);
  const [error, setError] = useState('');
  const [showAll, setShowAll] = useState(showUnchanged);

  useEffect(() => {
    let cancelled = false;
    setError('');
    setCurrent(null);
    setProposed(null);
    Promise.all([
      getReportVersion(reportId, currentVersionId),
      getReportVersion(reportId, proposedVersionId),
    ])
      .then(([cur, prop]) => {
        if (cancelled) return;
        setCurrent(normalizeTests(cur.version.payload));
        setProposed(normalizeTests(prop.version.payload));
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load diff');
      });
    return () => {
      cancelled = true;
    };
  }, [reportId, currentVersionId, proposedVersionId]);

  const rows = useMemo(() => {
    if (!current || !proposed) return [];
    return diffRows(current, proposed);
  }, [current, proposed]);

  const summary = useMemo(() => summarizeDiff(rows), [rows]);
  const visible = showAll ? rows : rows.filter((r) => r.status !== 'unchanged');

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5">
        <h3 className="text-sm font-semibold text-slate-900">Current vs proposed</h3>
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-rose-700">{summary.removed} removed</span>
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700">{summary.changed} changed</span>
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700">{summary.added} added</span>
          <label className="ml-2 flex items-center gap-1 text-slate-500">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
            Show unchanged ({summary.unchanged})
          </label>
        </div>
      </header>
      <div className="p-3">
        {error ? (
          <p className="text-sm text-rose-600">{error}</p>
        ) : !current || !proposed ? (
          <p className="py-6 text-center text-sm text-slate-500">Loading diff…</p>
        ) : visible.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            The proposal makes no changes to the current extraction.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-1.5">Change</th>
                  <th className="px-2 py-1.5">Test</th>
                  <th className="px-2 py-1.5">Value</th>
                  <th className="px-2 py-1.5">Unit</th>
                  <th className="px-2 py-1.5">Reference</th>
                  <th className="px-2 py-1.5">Row id</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => {
                  const style = STATUS_STYLE[r.status];
                  const ref = r.current ?? r.proposed;
                  return (
                    <tr key={r.key} className={`border-b border-slate-100 ${style.row}`}>
                      <td className="px-2 py-1.5">
                        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${style.tag}`}>{style.label}</span>
                      </td>
                      <td className="px-2 py-1.5 text-slate-800">{cell(r.current, r.proposed, 'testName')}</td>
                      <td className="px-2 py-1.5">{cell(r.current, r.proposed, 'value')}</td>
                      <td className="px-2 py-1.5">{cell(r.current, r.proposed, 'unit')}</td>
                      <td className="px-2 py-1.5">{cell(r.current, r.proposed, 'referenceRange')}</td>
                      <td className="px-2 py-1.5 font-mono text-xs text-slate-400">{ref?.sourceRowId ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

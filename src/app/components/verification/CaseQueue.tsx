import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ImageOff, Image as ImageIcon, Search } from 'lucide-react';
import {
  listVerificationCases,
  type CaseListParams,
  type VerificationCaseRow,
} from '../../../api/verification';

const PAGE_SIZE = 25;

const STATUS_OPTIONS = ['', 'queued', 'running', 'succeeded', 'failed', 'superseded'];
const REVIEW_OPTIONS = ['', 'pending', 'resolved'];

function money(v: number | null): string {
  return v === null || v === undefined ? '—' : '$' + v.toFixed(3);
}
function ms(v: number | null): string {
  return v === null || v === undefined ? '—' : (v / 1000).toFixed(1) + 's';
}

/**
 * Cross-report verification case queue. Filters live in the URL so a widget can
 * deep-link into a pre-filtered view and the browser back button works. Default
 * order is oldest-open-first (backend default). We never presign a thumbnail per
 * row — only the boolean masked-availability flag is shown.
 */
export default function CaseQueue() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [data, setData] = useState<{ count: number; cases: VerificationCaseRow[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState(searchParams.get('q') ?? '');

  const offset = Number(searchParams.get('offset') ?? '0') || 0;

  const params = useMemo<CaseListParams>(() => {
    const p: CaseListParams = { limit: PAGE_SIZE, offset };
    const vs = searchParams.get('verification_status');
    const rs = searchParams.get('review_status');
    const res = searchParams.get('resolution');
    const cat = searchParams.get('category');
    const hp = searchParams.get('has_proposal');
    const sup = searchParams.get('superseded');
    const q = searchParams.get('q');
    const sort = searchParams.get('sort');
    if (vs) p.verification_status = vs;
    if (rs) p.review_status = rs;
    if (res) p.resolution = res;
    if (cat) p.category = cat;
    if (hp === 'true') p.has_proposal = true;
    if (hp === 'false') p.has_proposal = false;
    if (sup === 'true') p.superseded = true;
    if (sup === 'false') p.superseded = false;
    if (q) p.q = q;
    if (sort === 'newest' || sort === 'cost' || sort === 'latency') p.sort = sort;
    return p;
  }, [searchParams, offset]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    listVerificationCases(params)
      .then((res) => {
        if (!cancelled) setData({ count: res.count, cases: res.cases });
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load cases');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params]);

  // Keep the search box in sync when filters are cleared/deep-linked externally.
  useEffect(() => {
    setSearchText(searchParams.get('q') ?? '');
  }, [searchParams]);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('offset'); // any filter change resets pagination
    setSearchParams(next, { replace: true });
  };

  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onSearchChange = (v: string) => {
    setSearchText(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setParam('q', v.trim()), 350);
  };

  const goOffset = (next: number) => {
    const p = new URLSearchParams(searchParams);
    if (next <= 0) p.delete('offset');
    else p.set('offset', String(next));
    setSearchParams(p, { replace: true });
  };

  const hasActiveFilters = ['verification_status', 'review_status', 'resolution', 'category', 'has_proposal', 'superseded', 'q'].some(
    (k) => searchParams.get(k),
  );

  const total = data?.count ?? 0;
  const rows = data?.cases ?? [];

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
          <input
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search profile, filename, report or document id"
            aria-label="Search cases"
            className="w-full rounded-md border border-slate-300 py-2 pl-8 pr-3 text-sm outline-none focus:border-sky-400"
          />
        </div>
        <select
          aria-label="Verification status"
          value={searchParams.get('verification_status') ?? ''}
          onChange={(e) => setParam('verification_status', e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === '' ? 'Any status' : s}
            </option>
          ))}
        </select>
        <select
          aria-label="Review status"
          value={searchParams.get('review_status') ?? ''}
          onChange={(e) => setParam('review_status', e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-2 text-sm"
        >
          {REVIEW_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === '' ? 'Any review' : s}
            </option>
          ))}
        </select>
        <select
          aria-label="Proposal"
          value={searchParams.get('has_proposal') ?? ''}
          onChange={(e) => setParam('has_proposal', e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-2 text-sm"
        >
          <option value="">Any proposal</option>
          <option value="true">Has proposal</option>
          <option value="false">No proposal</option>
        </select>
        <select
          aria-label="Sort"
          value={searchParams.get('sort') ?? ''}
          onChange={(e) => setParam('sort', e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-2 text-sm"
        >
          <option value="">Oldest open</option>
          <option value="newest">Newest</option>
          <option value="cost">Cost</option>
          <option value="latency">Latency</option>
        </select>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={() => setSearchParams(new URLSearchParams(), { replace: true })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Clear
          </button>
        ) : null}
      </div>

      {/* Body */}
      {loading ? (
        <div className="p-8 text-center text-sm text-slate-500">Loading cases…</div>
      ) : error ? (
        <div className="m-3 flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4" aria-hidden="true" /> {error}
        </div>
      ) : rows.length === 0 ? (
        <div className="p-10 text-center">
          <p className="text-sm font-medium text-slate-700">No cases match this view.</p>
          <p className="mt-1 text-xs text-slate-500">
            {hasActiveFilters ? 'Try clearing filters.' : 'The verification queue is empty.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2 font-semibold">Profile / file</th>
                <th className="px-3 py-2 font-semibold">Page</th>
                <th className="px-3 py-2 font-semibold">Category</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Proposal</th>
                <th className="px-3 py-2 font-semibold">Evidence</th>
                <th className="px-3 py-2 font-semibold">Cost / lat</th>
                <th className="px-3 py-2 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr
                  key={c.case_id}
                  onClick={() => navigate('/admin/verification/' + c.case_id)}
                  className="cursor-pointer border-b border-slate-100 hover:bg-sky-50/50"
                >
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-900">{c.profile_name ?? '—'}</div>
                    <div className="truncate text-xs text-slate-500">{c.filename ?? c.lab_report_id}</div>
                  </td>
                  <td className="px-3 py-2 tabular-nums text-slate-700">{c.page_index}</td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">{c.category}</span>
                  </td>
                  <td className="px-3 py-2">
                    <StatusPill status={c.verification_status} review={c.review_status} superseded={c.is_superseded} />
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {c.has_proposal ? (
                      <span className="font-medium text-sky-700">Proposed</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {c.masked_image_available ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700" title="Masked crop available">
                        <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" /> Masked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400" title="No masked crop">
                        <ImageOff className="h-3.5 w-3.5" aria-hidden="true" /> None
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs tabular-nums text-slate-600">
                    {money(c.latest_cost)} · {ms(c.latest_latency)}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && total > 0 ? (
        <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2 text-xs text-slate-600">
          <span>
            {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={offset <= 0}
              onClick={() => goOffset(offset - PAGE_SIZE)}
              className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => goOffset(offset + PAGE_SIZE)}
              className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function StatusPill({
  status,
  review,
  superseded,
}: {
  status: string;
  review: string;
  superseded: boolean;
}) {
  const label = superseded ? 'superseded' : status;
  const tone =
    label === 'failed'
      ? 'bg-rose-100 text-rose-700'
      : label === 'succeeded'
        ? 'bg-emerald-100 text-emerald-700'
        : label === 'queued' || label === 'running'
          ? 'bg-indigo-100 text-indigo-700'
          : 'bg-slate-100 text-slate-600';
  return (
    <span className="inline-flex flex-col gap-0.5">
      <span className={`w-fit rounded px-1.5 py-0.5 text-xs font-medium ${tone}`}>{label}</span>
      {review === 'resolved' ? <span className="text-[10px] text-slate-400">resolved</span> : null}
    </span>
  );
}

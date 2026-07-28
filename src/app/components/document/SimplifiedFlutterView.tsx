import { useEffect, useMemo, useState } from 'react';
import { Minimize2, Search, Smartphone } from 'lucide-react';
import { getSimplifiedValues } from '../../../api/client';
import {
  isOutsideLabRange,
  parseSimplifiedReport,
  pillStyle,
  summarize,
  type ResultStatus,
  type SimplifiedReportData,
  type SimplifiedResult,
} from '../../utils/simplifiedReport';
import CollapsibleStrip from '../admin/CollapsibleStrip';

interface SimplifiedFlutterViewProps {
  documentId: string;
  filename?: string;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

/** iOS-native minimal palette — mirrors AarogyaFace's simplified lab screen. */
const PALETTE = {
  canvas: '#F2F2F7',
  textPrimary: '#111111',
  textSecondary: '#8C8C91',
  placeholder: '#8F8F94',
  hairline: '#E5E5E7',
  cardBorder: '#E4E4E7',
  red: '#D92429',
  green: '#16A64D',
  searchFill: '#E5E5EB',
};

/**
 * Renders `/imported-files/:id/simplified-values` exactly as the AarogyaFace
 * (Flutter) simplified lab screen would — same parsing, same status resolution,
 * same grouping and pill colors — so pipeline output can be reviewed as an
 * end user sees it, without a phone. This is the "End-user (Flutter) view".
 */
export default function SimplifiedFlutterView({
  documentId,
  filename,
  collapsed = false,
  onToggleCollapsed,
}: SimplifiedFlutterViewProps) {
  const [data, setData] = useState<SimplifiedReportData | undefined>();
  const [available, setAvailable] = useState<boolean | undefined>();
  const [source, setSource] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);

  const summary = data ? summarize(data) : undefined;
  const sections = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.sections;
    return data.sections.filter((section) => {
      if (section.name.toLowerCase().includes(q)) return true;
      return section.results.some((r) => r.testName.toLowerCase().includes(q));
    });
  }, [data, query]);

  useEffect(() => {
    let cancelled = false;
    if (collapsed) {
      return () => {
        cancelled = true;
      };
    }
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      setError('');
    });
    getSimplifiedValues(documentId)
      .then((resp) => {
        if (cancelled) return;
        setAvailable(resp.available);
        setSource(resp.source);
        setData(parseSimplifiedReport({ ...resp, tests: resp.tests }, filename));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load simplified values');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [collapsed, documentId, filename]);

  if (collapsed && onToggleCollapsed) {
    return <CollapsibleStrip label="End-user (Flutter) view" edge="trailing" onExpand={onToggleCollapsed} />;
  }

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col rounded-md border border-slate-200 bg-white">
      <header className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            <Smartphone className="h-4 w-4 text-sky-600" aria-hidden="true" />
            End-user (Flutter) view
          </h3>
          <p className="font-mono text-xs text-slate-500">
            /imported-files/:id/simplified-values{source ? ` · ${source}` : ''}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
            As shown in app
          </span>
          {onToggleCollapsed ? (
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-expanded
              title="Collapse End-user view"
              className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
            >
              <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">Collapse</span>
            </button>
          ) : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto" style={{ backgroundColor: PALETTE.canvas }}>
        {loading ? (
          <div className="p-6 text-sm text-slate-600">Loading simplified view…</div>
        ) : error ? (
          <div className="m-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
        ) : !available || !data || data.sections.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-600">
            No simplified lab view for this document.
            <div className="mt-1 text-xs text-slate-500">
              The end user sees a simplified screen only when a lab report has been extracted
              (status <span className="font-mono">Processed</span> with non-empty values). Non-lab
              documents and failed/empty extractions show nothing here — by design.
            </div>
          </div>
        ) : (
          <div className="p-5">
            {/* Title / identity */}
            <div className="mb-3.5 pt-1">
              <div className="text-[26px] font-bold leading-tight" style={{ color: PALETTE.textPrimary }}>
                {data.title && data.title.trim() ? data.title : 'Lab report'}
              </div>
              {data.patientName || data.reportInfoLine ? (
                <div className="mt-1 text-[13px]" style={{ color: PALETTE.textSecondary }}>
                  {[data.patientName, data.reportInfoLine].filter(Boolean).join(' · ')}
                </div>
              ) : null}
            </div>

            {/* Insight card — bright split-screen layout */}
            {summary ? (
              <div
                className="flex items-center gap-4 rounded-2xl bg-white p-4"
                style={{ border: `1px solid ${PALETTE.cardBorder}`, boxShadow: '0px 4px 6px rgba(0,0,0,0.05)' }}
              >
                <div className="flex w-24 flex-shrink-0 flex-col items-center text-center">
                  <span className="text-[38px] font-bold leading-none" style={{ color: PALETTE.textPrimary }}>
                    {summary.total}
                  </span>
                  <span className="mt-1 text-[11px] leading-[1.3]" style={{ color: PALETTE.textSecondary }}>
                    results analyzed
                  </span>
                </div>
                <div className="h-16 w-px flex-shrink-0" style={{ backgroundColor: PALETTE.hairline }} />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <StatRow dotColor={PALETTE.red} label="Out of range" value={summary.outside} />
                  <StatRow dotColor={PALETTE.green} label="Within range" value={summary.within} />
                  <StatRow dotColor={PALETTE.textSecondary} label="No comparison" value={summary.noComparison} />
                </div>
              </div>
            ) : null}

            {/* Search */}
            <div
              className="mt-4 flex items-center gap-2 rounded-xl px-3"
              style={{ backgroundColor: PALETTE.searchFill }}
            >
              <Search className="h-[18px] w-[18px] flex-shrink-0" style={{ color: PALETTE.placeholder }} aria-hidden="true" />
              <label className="sr-only" htmlFor="simplified-search">
                Search
              </label>
              <input
                id="simplified-search"
                value={query}
                onChange={(e) => {
                  const next = e.target.value;
                  setQuery(next);
                  if (expandedSectionId) {
                    const q = next.trim().toLowerCase();
                    if (
                      q &&
                      data.sections.every(
                        (s) =>
                          s.id !== expandedSectionId ||
                          (!s.name.toLowerCase().includes(q) && !s.results.some((r) => r.testName.toLowerCase().includes(q))),
                      )
                    ) {
                      setExpandedSectionId(null);
                    }
                  }
                }}
                placeholder="Search a test or section"
                className="w-full bg-transparent py-3.5 text-[15px] outline-none"
                style={{ color: PALETTE.textPrimary }}
              />
            </div>

            <div
              className="mt-5 text-xs font-semibold tracking-wide"
              style={{ color: PALETTE.textSecondary }}
            >
              SECTIONS
            </div>
            <div className="mt-2">
              {sections.length === 0 ? (
                <div className="py-3 text-sm" style={{ color: PALETTE.textSecondary }}>
                  No sections match your search.
                </div>
              ) : (
                <div
                  className="overflow-hidden rounded-[20px] bg-white"
                  style={{ border: `1px solid ${PALETTE.hairline}`, boxShadow: '0px 2px 8px rgba(0,0,0,0.04)' }}
                >
                  {sections.map((section, idx) => (
                    <div key={section.id}>
                      <SectionAccordionRow
                        section={section}
                        query={query}
                        expanded={expandedSectionId === section.id}
                        onToggle={() =>
                          setExpandedSectionId((cur) => (cur === section.id ? null : section.id))
                        }
                      />
                      {idx !== sections.length - 1 ? (
                        <div className="mx-4 h-px" style={{ backgroundColor: PALETTE.hairline }} />
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function StatRow({ dotColor, label, value }: { dotColor: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
      <span className="flex-1 truncate text-xs" style={{ color: PALETTE.textSecondary }}>
        {label}
      </span>
      <span className="text-xs font-bold" style={{ color: PALETTE.textPrimary }}>
        {value}
      </span>
    </div>
  );
}

function StatusPill({ status }: { status: ResultStatus }) {
  const style = pillStyle(status.type);
  const label = style.prefix ? `${style.prefix} ${status.label}` : status.label;
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold"
      style={{ backgroundColor: style.bg, color: style.fg }}
    >
      {label}
    </span>
  );
}

/** Nuanced statuses (borderline / lab-band) carry a specific label that a plain
 * color can't convey, so they keep a compact pill. Plain high/low/outside/
 * within/no-comparison statuses are conveyed via value color + the left-border
 * dot marker drawn by the parent, matching the Figma spec. */
function needsPill(result: SimplifiedResult): boolean {
  return result.status.type === 'borderline' || result.status.type === 'labBand';
}

function ResultRow({ result }: { result: SimplifiedResult }) {
  const outside = isOutsideLabRange(result.status);
  return (
    <div className="py-0.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 text-[14px] font-medium leading-[1.5]" style={{ color: PALETTE.textPrimary }}>
          {result.testName}
        </div>
        <div className="flex-shrink-0 whitespace-nowrap leading-[1.5]">
          <span className="text-[15px] font-semibold" style={{ color: outside ? PALETTE.red : PALETTE.textPrimary }}>
            {result.result}
          </span>
          {result.unit && result.unit.trim() ? (
            <span className="ml-1 text-xs" style={{ color: PALETTE.textSecondary }}>
              {result.unit.trim()}
            </span>
          ) : null}
        </div>
      </div>

      {needsPill(result) ? (
        <div className="mt-1 flex justify-end">
          <StatusPill status={result.status} />
        </div>
      ) : null}

      {result.referenceText ? (
        <div className="mt-0.5 text-xs" style={{ color: PALETTE.textSecondary }}>
          Ref: {result.referenceText}
        </div>
      ) : null}

      {result.note && result.note.trim() ? (
        <div className="mt-1 text-[11px] text-slate-500">{result.note}</div>
      ) : null}

      {result.referenceBands.length > 0 ? (
        <div className="mt-2.5">
          <div className="text-[13px] text-slate-500">Reference bands printed by the lab</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {result.referenceBands.map((band, i) => {
              const hit = band.containsValue;
              return (
                <span
                  key={`${band.label}-${i}`}
                  className="rounded-md border px-2 py-0.5 text-xs"
                  style={
                    hit
                      ? { backgroundColor: '#FFF7E0', borderColor: '#E7C97A', color: '#B86E05', fontWeight: 600 }
                      : { backgroundColor: '#F7F8FA', borderColor: '#E2E6ED', color: '#3B4657' }
                  }
                >
                  {band.label}
                  {band.rangeText ? `: ${band.rangeText}` : ''}
                  {hit ? ' ◄' : ''}
                </span>
              );
            })}
          </div>
        </div>
      ) : null}

      {result.usedReferenceDescription ? (
        <div className="mt-2 text-[13px] text-slate-500">Reference used: {result.usedReferenceDescription}</div>
      ) : null}

      {result.demographicRanges.length > 0 ? (
        <div className="mt-2">
          {!result.usedReferenceDescription ? (
            <div className="text-[13px] text-slate-500">
              {result.usedReferenceSelectedConfidently
                ? 'Reference used from printed ranges'
                : 'Could not confidently pick one range. Showing all printed ranges.'}
            </div>
          ) : null}
          <div className="mt-1.5 text-[13px] font-semibold text-slate-800">All ranges printed by the lab</div>
          <ul className="mt-1 space-y-0.5">
            {result.demographicRanges.map((range, i) => (
              <li
                key={`${range.label}-${i}`}
                className="text-[13px]"
                style={range.isUsed ? { color: '#141C29', fontWeight: 600 } : { color: '#616E80' }}
              >
                {range.isUsed ? '✓ ' : '• '}
                {range.label}
                {range.rangeText ? `: ${range.rangeText}` : ''}
                {range.isUsed && !range.isConfident ? ' (uncertain)' : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function SectionAccordionRow({
  section,
  expanded,
  onToggle,
  query,
}: {
  section: { id: string; name: string; results: SimplifiedResult[] };
  expanded: boolean;
  onToggle: () => void;
  query: string;
}) {
  const q = query.trim().toLowerCase();
  const sectionMatches = q ? section.name.toLowerCase().includes(q) : false;
  const visibleResults = q && !sectionMatches ? section.results.filter((r) => r.testName.toLowerCase().includes(q)) : section.results;
  const outside = visibleResults.filter((r) => isOutsideLabRange(r.status)).length;
  const subtitle =
    outside > 0
      ? `${visibleResults.length} results · ${outside} outside range`
      : `${visibleResults.length} results · All within range`;
  return (
    <div>
      <button type="button" onClick={onToggle} className="w-full px-5 py-4 text-left" aria-expanded={expanded}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-[16px] font-semibold" style={{ color: PALETTE.textPrimary }}>
              {section.name}
            </div>
            <div
              className="mt-0.5 text-[13px]"
              style={{ color: outside > 0 ? PALETTE.red : PALETTE.textSecondary }}
            >
              {subtitle}
            </div>
          </div>
          <svg
            className="h-5 w-5 flex-shrink-0 transition-transform"
            style={{ color: PALETTE.textSecondary, transform: expanded ? 'rotate(180deg)' : undefined }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>
      {expanded ? (
        <div className="px-5 pb-5">
          <div className="flex flex-col gap-4 border-l-2 pl-4" style={{ borderColor: PALETTE.hairline }}>
            {visibleResults.map((r) => (
              <div key={r.id} className="relative">
                {isOutsideLabRange(r.status) ? (
                  <span
                    className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full"
                    style={{ backgroundColor: PALETTE.red }}
                    aria-hidden="true"
                  />
                ) : null}
                <ResultRow result={r} />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

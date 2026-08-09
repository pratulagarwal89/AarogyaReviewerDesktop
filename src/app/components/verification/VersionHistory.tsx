import { useEffect, useState } from 'react';
import { History, RotateCcw } from 'lucide-react';
import {
  getReportVersions,
  type ReportVersionsResponse,
  type VersionKind,
  type VersionSummary,
} from '../../../api/verification';

const KIND_STYLE: Record<VersionKind, string> = {
  primary: 'bg-slate-100 text-slate-700',
  verifier_filtered: 'bg-sky-100 text-sky-700',
  reviewer_corrected: 'bg-violet-100 text-violet-700',
};

/**
 * Immutable version timeline + activation audit. Offers rollback ONLY to prior
 * versions (version_number below the active one). The currently-active version
 * shows "current"; a version NEWER than the active one is an un-activated
 * proposal shown as "awaiting activation" — it must be activated from the case
 * actions (which also resolves the verification case), never rolled back "to"
 * (the raw /rollback path would publish it while leaving the case unresolved).
 * Rollback to a verifier_filtered version is disabled here when its masked
 * evidence is known to be unavailable (the backend enforces the same gate).
 */
export default function VersionHistory({
  reportId,
  reloadToken,
  evidenceUnavailableVersionIds,
  onRequestRollback,
}: {
  reportId: string;
  reloadToken: number;
  evidenceUnavailableVersionIds?: Set<string>;
  onRequestRollback: (version: VersionSummary) => void;
}) {
  const [data, setData] = useState<ReportVersionsResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getReportVersions(reportId)
      .then((r) => {
        if (!cancelled) setData(r);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load versions');
      });
    return () => {
      cancelled = true;
    };
  }, [reportId, reloadToken]);

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <header className="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5">
        <History className="h-4 w-4 text-slate-500" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-slate-900">Version history</h3>
        {data ? <span className="text-xs text-slate-400">rev {data.publication_revision}</span> : null}
      </header>
      <div className="p-3">
        {error ? (
          <p className="text-sm text-rose-600">{error}</p>
        ) : !data ? (
          <p className="py-4 text-center text-sm text-slate-500">Loading versions…</p>
        ) : (
          <>
            <ul className="space-y-2">
              {(() => {
                const activeVersion = data.versions.find((v) => v.id === data.active_version_id);
                const activeVersionNumber = activeVersion?.version_number;
                return data.versions.map((v) => {
                const isActive = v.id === data.active_version_id;
                // A version newer than the active one is a forward proposal
                // awaiting activation — not a rollback target. Activation happens
                // from the case actions and also resolves the case; a raw rollback
                // "to" it would publish the version but leave the case unresolved.
                const isForwardProposal =
                  !isActive &&
                  activeVersionNumber !== undefined &&
                  v.version_number > activeVersionNumber;
                const evidenceBlocked =
                  v.kind === 'verifier_filtered' && evidenceUnavailableVersionIds?.has(v.id);
                return (
                  <li
                    key={v.id}
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-md border p-2.5 ${
                      isActive ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${KIND_STYLE[v.kind]}`}>
                          {v.kind}
                        </span>
                        <span className="text-xs font-medium text-slate-700">v{v.version_number}</span>
                        {isActive ? (
                          <span className="text-xs font-semibold text-emerald-700">active</span>
                        ) : null}
                        {v.is_pending_primary ? (
                          <span className="text-xs font-semibold text-amber-700">pending primary</span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {v.actor_type}
                        {v.actor_email ? ` · ${v.actor_email}` : ''} · {new Date(v.created_at).toLocaleString()}
                      </div>
                    </div>
                    {isActive ? (
                      <span className="text-xs text-slate-400">current</span>
                    ) : isForwardProposal ? (
                      <span
                        className="text-xs text-slate-400"
                        title="Proposed version — activate it from the case actions above. Rollback is only for prior versions."
                      >
                        awaiting activation
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={evidenceBlocked}
                        title={
                          evidenceBlocked
                            ? 'Masked evidence unavailable — cannot roll back to this verifier-filtered version'
                            : 'Roll back to this version'
                        }
                        onClick={() => onRequestRollback(v)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Roll back
                      </button>
                    )}
                  </li>
                );
                });
              })()}
            </ul>

            <h4 className="mt-4 mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Activation log</h4>
            <ul className="space-y-1">
              {data.activations.length === 0 ? (
                <li className="text-xs text-slate-500">No activations recorded.</li>
              ) : (
                data.activations.map((a, i) => (
                  <li key={i} className="flex flex-wrap items-baseline gap-x-2 text-xs text-slate-600">
                    <span className="font-medium text-slate-800">{a.action}</span>
                    <span className="text-slate-400">rev {a.publication_revision}</span>
                    {a.actor_email ? <span>· {a.actor_email}</span> : null}
                    <span className="text-slate-400">· {new Date(a.created_at).toLocaleString()}</span>
                    {a.reason ? <span className="italic text-slate-500">— {a.reason}</span> : null}
                  </li>
                ))
              )}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import AdminLayout from '../components/admin/AdminLayout';
import MaskedEvidence from '../components/verification/MaskedEvidence';
import { GatePanel, VerifierAssessment } from '../components/verification/GateAndVerifier';
import CurrentVsProposedDiff from '../components/verification/CurrentVsProposedDiff';
import VersionHistory from '../components/verification/VersionHistory';
import ReasonActionDialog from '../components/verification/ReasonActionDialog';
import SimplifiedFlutterView from '../components/document/SimplifiedFlutterView';
import {
  VerificationApiError,
  getVerificationCase,
  resolveCase,
  retryCase,
  rollbackVersion,
  type CaseDetail,
  type VersionSummary,
} from '../../api/verification';

const MAX_ATTEMPTS = 5;

type DialogState =
  | { kind: 'activate' }
  | { kind: 'keep_as_is' }
  | { kind: 'dismiss' }
  | { kind: 'retry' }
  | { kind: 'rollback'; version: VersionSummary }
  | null;

export default function VerificationCaseScreen() {
  const { caseId } = useParams<{ caseId: string }>();
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [maskedAvailable, setMaskedAvailable] = useState<boolean | undefined>(undefined);

  const [dialog, setDialog] = useState<DialogState>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!caseId) return;
    try {
      const d = await getVerificationCase(caseId);
      setDetail(d);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load case');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll while the verifier is actively working this case (after a retry).
  const vStatus = detail?.case.verification_status;
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    if (vStatus !== 'queued' && vStatus !== 'running') return;
    const id = setInterval(() => loadRef.current(), 10_000);
    return () => clearInterval(id);
  }, [vStatus]);

  const onMaskedAvailability = useCallback((a: boolean) => setMaskedAvailable(a), []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Loading case…
        </div>
      </AdminLayout>
    );
  }
  if (error || !detail) {
    return (
      <AdminLayout>
        <BackLink />
        <div className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4" aria-hidden="true" /> {error || 'Case not found'}
          <button type="button" onClick={load} className="ml-2 underline">
            Retry
          </button>
        </div>
      </AdminLayout>
    );
  }

  const cs = detail.case;
  const reportId = cs.lab_report_id;
  const proposedVersionId = cs.proposed_version_id;
  const proposalKind = detail.proposed_version?.kind;
  const activeVersionId = detail.publication_state.active_version_id;
  const publicationRevision = detail.publication_state.publication_revision;
  const resolved = cs.review_status === 'resolved';
  const superseded = cs.verification_status === 'superseded';
  const attempts = detail.runs.length;
  const running = cs.verification_status === 'queued' || cs.verification_status === 'running';

  const isVerifierFiltered = proposalKind === 'verifier_filtered';
  // UI evidence gate: block activating/rolling-back-to a verifier_filtered proposal
  // when the authoritative masked-image check says the crop is unavailable. The
  // backend enforces the same rule (409 masked_evidence_unavailable) regardless.
  const evidenceBlocksActivate = isVerifierFiltered && maskedAvailable === false;
  const canActivate = !!proposedVersionId && !resolved && !superseded && !evidenceBlocksActivate;
  const canRetry = !running && !superseded && attempts < MAX_ATTEMPTS;

  const evidenceUnavailableVersionIds = new Set<string>();
  if (proposedVersionId && evidenceBlocksActivate) evidenceUnavailableVersionIds.add(proposedVersionId);

  function afterAction(message: string) {
    setDialog(null);
    setActionError('');
    setNotice(message);
    setReloadToken((t) => t + 1);
    load();
  }

  function handleApiError(e: unknown) {
    if (e instanceof VerificationApiError) {
      if (e.code === 'stale_publication_revision') {
        setActionError(
          `A newer publication landed (now rev ${e.actual ?? '?'}). This case was reinspected — review the current state and try again.`,
        );
        load(); // refresh publication_revision; never auto-retry the write
        return;
      }
      if (e.code === 'masked_evidence_unavailable') {
        setActionError('Masked evidence is unavailable — the backend blocked this publication.');
        setMaskedAvailable(false);
        return;
      }
      if (e.code === 'stale_case' || e.code === 'case_superseded') {
        setActionError('A newer primary exists; this case is stale. Reinspect from the dashboard.');
        load();
        return;
      }
      setActionError(e.message);
      return;
    }
    setActionError(e instanceof Error ? e.message : 'Action failed');
  }

  async function runAction(reason: string) {
    if (!caseId || !dialog) return;
    setActionBusy(true);
    setActionError('');
    try {
      switch (dialog.kind) {
        case 'activate':
          await resolveCase(caseId, 'activate_proposal', reason, publicationRevision);
          afterAction('Proposal activated. Simplified view refreshed.');
          break;
        case 'keep_as_is':
          await resolveCase(caseId, 'keep_as_is', reason);
          afterAction('Case kept as-is and resolved.');
          break;
        case 'dismiss':
          await resolveCase(caseId, 'dismiss', reason);
          afterAction('Case dismissed.');
          break;
        case 'retry':
          await retryCase(caseId, reason);
          afterAction('Re-verification queued.');
          break;
        case 'rollback':
          await rollbackVersion(reportId, dialog.version.id, publicationRevision, reason);
          afterAction('Rolled back. Simplified view refreshed.');
          break;
      }
    } catch (e) {
      handleApiError(e);
    } finally {
      setActionBusy(false);
    }
  }

  const dialogProps = dialogConfig(dialog, detail);

  return (
    <AdminLayout>
      <BackLink />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Verification case</h1>
          <p className="text-sm text-slate-500">
            Page {cs.page_index} · <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{cs.category}</span> ·
            report <span className="font-mono text-xs">{reportId.slice(0, 8)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded bg-slate-100 px-2 py-1 text-slate-600">
            {superseded ? 'superseded' : cs.verification_status}
          </span>
          {resolved ? (
            <span className="rounded bg-emerald-100 px-2 py-1 text-emerald-700">resolved: {cs.resolution}</span>
          ) : (
            <span className="rounded bg-amber-100 px-2 py-1 text-amber-700">pending review</span>
          )}
        </div>
      </div>

      {notice ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {notice}
        </div>
      ) : null}
      {superseded ? (
        <div className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          A newer primary extraction superseded this case. Its proposal can no longer be activated —
          reinspect the report.
        </div>
      ) : null}

      {/* Actions */}
      {!resolved ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!canActivate}
            title={
              !proposedVersionId
                ? 'No proposal to activate'
                : evidenceBlocksActivate
                  ? 'Masked evidence unavailable — activation blocked'
                  : superseded
                    ? 'Case superseded'
                    : 'Activate the proposed version'
            }
            onClick={() => setDialog({ kind: 'activate' })}
            className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-40"
          >
            Activate proposal
          </button>
          <button
            type="button"
            onClick={() => setDialog({ kind: 'keep_as_is' })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Keep as-is
          </button>
          <button
            type="button"
            onClick={() => setDialog({ kind: 'dismiss' })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Dismiss
          </button>
          <button
            type="button"
            disabled={!canRetry}
            title={
              running
                ? 'Verification is already running'
                : superseded
                  ? 'Case superseded'
                  : attempts >= MAX_ATTEMPTS
                    ? 'Retry attempts exhausted'
                    : 'Re-run verification'
            }
            onClick={() => setDialog({ kind: 'retry' })}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            <RefreshCw className={`h-4 w-4 ${running ? 'animate-spin' : ''}`} aria-hidden="true" /> Retry
            <span className="text-xs text-slate-400">
              ({attempts}/{MAX_ATTEMPTS})
            </span>
          </button>
          {evidenceBlocksActivate ? (
            <span className="text-xs text-amber-700">Activation blocked: masked evidence unavailable.</span>
          ) : null}
        </div>
      ) : null}

      {/* Two-column layout: evidence + assessment | diff + versions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          {caseId ? <MaskedEvidence caseId={caseId} onAvailabilityChange={onMaskedAvailability} /> : null}
          <GatePanel detail={detail} />
          <VerifierAssessment detail={detail} />
        </div>
        <div className="flex flex-col gap-4">
          {proposedVersionId && activeVersionId ? (
            <CurrentVsProposedDiff
              reportId={reportId}
              currentVersionId={activeVersionId}
              proposedVersionId={proposedVersionId}
            />
          ) : (
            <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
              No proposed version for this case — nothing to compare. The verifier produced no
              filtered extraction (mixed/uncertain).
            </section>
          )}
          <VersionHistory
            reportId={reportId}
            reloadToken={reloadToken}
            evidenceUnavailableVersionIds={evidenceUnavailableVersionIds}
            onRequestRollback={(version) => setDialog({ kind: 'rollback', version })}
          />
        </div>
      </div>

      {/* End-user (Flutter) view — refreshes after activation/rollback via key. */}
      {cs.document_id ? (
        <div className="h-[520px]">
          <SimplifiedFlutterView key={`simplified-${reloadToken}`} documentId={cs.document_id} />
        </div>
      ) : null}

      {dialog ? (
        <ReasonActionDialog
          title={dialogProps.title}
          description={dialogProps.description}
          confirmLabel={dialogProps.confirmLabel}
          tone={dialogProps.tone}
          busy={actionBusy}
          error={actionError}
          onConfirm={runAction}
          onClose={() => {
            setDialog(null);
            setActionError('');
          }}
        />
      ) : null}
    </AdminLayout>
  );
}

function BackLink() {
  return (
    <Link to="/admin/verification" className="inline-flex items-center gap-1 text-sm text-sky-700 hover:underline">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to dashboard
    </Link>
  );
}

function dialogConfig(
  dialog: DialogState,
  detail: CaseDetail,
): { title: string; description?: string; confirmLabel: string; tone: 'primary' | 'danger' } {
  const rev = detail.publication_state.publication_revision;
  switch (dialog?.kind) {
    case 'activate':
      return {
        title: 'Activate proposal',
        description: `Publish the verifier's proposed extraction as the active version (expected rev ${rev}). This changes what the end user sees.`,
        confirmLabel: 'Activate',
        tone: 'primary',
      };
    case 'keep_as_is':
      return {
        title: 'Keep as-is',
        description: 'Resolve this case without changing the extraction. No publication occurs.',
        confirmLabel: 'Keep as-is',
        tone: 'primary',
      };
    case 'dismiss':
      return {
        title: 'Dismiss case',
        description: 'Mark this verification case as dismissed. No publication occurs.',
        confirmLabel: 'Dismiss',
        tone: 'danger',
      };
    case 'retry':
      return {
        title: 'Retry verification',
        description: 'Enqueue this case for another verifier run. This does not publish anything.',
        confirmLabel: 'Queue retry',
        tone: 'primary',
      };
    case 'rollback':
      return {
        title: `Roll back to ${dialog.version.kind} v${dialog.version.version_number}`,
        description: `Make this version the active one (expected rev ${rev}). Rolling back to the original primary is always permitted; rolling back to a verifier_filtered version requires available masked evidence.`,
        confirmLabel: 'Roll back',
        tone: 'danger',
      };
    default:
      return { title: '', confirmLabel: 'Confirm', tone: 'primary' };
  }
}

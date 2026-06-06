import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, ChevronLeft, RefreshCw } from "lucide-react";
import {
  getDocument,
  reprocessReport,
  verifyReport,
  type DocumentDetail,
  type ReprocessRequest,
} from "../../api/client";
import AdminLayout from "../components/admin/AdminLayout";
import StatusBadge from "../components/admin/StatusBadge";
import StructuredDataForm from "../components/admin/StructuredDataForm";
import AdminLabValuesTable from "../components/admin/AdminLabValuesTable";
import ReprocessModal from "../components/admin/ReprocessModal";
import ReprocessRunPanel from "../components/admin/ReprocessRunPanel";
import ConfirmDialog from "../components/admin/ConfirmDialog";
import ReportPreview from "../components/admin/ReportPreview";
import Button from "../components/common/Button";
import { useToast } from "../components/admin/useToast";
import { deriveStatusFromDocumentDetail } from "../utils/reportStatus";
import { formatDate } from "../../utils/dateUtils";

function ReportReviewBody() {
  const { documentId } = useParams<{ documentId: string }>();
  const { toast } = useToast();
  const [document, setDocument] = useState<DocumentDetail | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [reprocessOpen, setReprocessOpen] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | undefined>(undefined);
  const [runsRefreshToken, setRunsRefreshToken] = useState(0);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const [intakeCollapsed, setIntakeCollapsed] = useState(false);
  const [labsCollapsed, setLabsCollapsed] = useState(false);

  useEffect(() => {
    if (!documentId) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    getDocument(documentId, false)
      .then((doc) => {
        if (!cancelled) setDocument(doc);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load document");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [documentId, reloadKey]);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  const handleReprocessConfirm = useCallback(
    async (payload: ReprocessRequest) => {
      if (!documentId) return;
      try {
        const queued = await reprocessReport(documentId, payload);
        toast("success", "Reprocess started. Watching the run below.");
        setActiveRunId(queued.run_id);
        setRunsRefreshToken((t) => t + 1);
        setReprocessOpen(false);
      } catch (err) {
        toast("error", err instanceof Error ? err.message : "Failed to start reprocess.");
        throw err;
      }
    },
    [documentId, toast],
  );

  const handleRunFinished = useCallback(() => {
    setActiveRunId(undefined);
    setRunsRefreshToken((t) => t + 1);
    refresh();
  }, [refresh]);

  const handleVerifyConfirm = useCallback(async () => {
    if (!documentId) return;
    setVerifying(true);
    try {
      await verifyReport(documentId);
      toast("success", "Report marked as verified.");
      setVerifyOpen(false);
      refresh();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Failed to mark as verified.");
    } finally {
      setVerifying(false);
    }
  }, [documentId, refresh, toast]);

  if (error) {
    return (
      <>
        <BackBreadcrumb />
        <div className="flex items-start justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <div className="flex gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          <Button onClick={refresh} className="!py-1 !px-3 text-xs">
            Retry
          </Button>
        </div>
      </>
    );
  }

  if (loading || !document) {
    return (
      <>
        <BackBreadcrumb />
        <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading report…
        </div>
      </>
    );
  }

  const status = deriveStatusFromDocumentDetail(document);
  const collected = document.lab_report_date ? formatDate(document.lab_report_date) : "—";

  return (
    <>
      <BackBreadcrumb profileId={document.profile_id} documentId={document.id} />

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold text-slate-900" title={document.filename}>
                {document.filename}
              </h1>
              <StatusBadge status={status} />
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-600 sm:grid-cols-4">
              <div>
                <dt className="uppercase tracking-wide">Document type</dt>
                <dd className="text-slate-900">{document.document_type || "—"}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-wide">Lab</dt>
                <dd className="text-slate-900">{document.lab_name || "—"}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-wide">Collected</dt>
                <dd className="text-slate-900">{collected}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-wide">Document ID</dt>
                <dd className="font-mono text-slate-900">{document.id.slice(0, 8)}…</dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-shrink-0 flex-wrap gap-2">
            <Button onClick={() => setReprocessOpen(true)} className="inline-flex items-center gap-1.5">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Reprocess record
            </Button>
            <Button
              variant="primary"
              onClick={() => setVerifyOpen(true)}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              disabled={status === "verified"}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {status === "verified" ? "Verified" : "Mark as verified"}
            </Button>
          </div>
        </div>
      </section>

      <div className="flex h-[calc(100vh-280px)] min-h-[520px] flex-col gap-4 lg:flex-row">
        <ReportPreview
          document={document}
          collapsed={previewCollapsed}
          onToggleCollapsed={() => setPreviewCollapsed((v) => !v)}
        />
        <StructuredDataForm
          document={document}
          onRefresh={refresh}
          collapsed={intakeCollapsed}
          onToggleCollapsed={() => setIntakeCollapsed((v) => !v)}
        />
        <AdminLabValuesTable
          document={document}
          collapsed={labsCollapsed}
          onToggleCollapsed={() => setLabsCollapsed((v) => !v)}
        />
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Reprocess runs</h2>
          <span className="text-xs text-slate-500">
            {activeRunId ? "Live update — polling…" : "Latest 10 runs for this document"}
          </span>
        </header>
        <ReprocessRunPanel
          documentId={document.id}
          activeRunId={activeRunId}
          refreshToken={runsRefreshToken}
          onRunFinished={handleRunFinished}
        />
      </section>

      <ReprocessModal
        open={reprocessOpen}
        documentId={document.id}
        document={document}
        onConfirm={handleReprocessConfirm}
        onClose={() => setReprocessOpen(false)}
      />

      <ConfirmDialog
        open={verifyOpen}
        title="Mark report as verified?"
        description="The report will be locked from further edits once verify endpoint is wired. Until then this action calls a stub and will report 'not implemented'."
        confirmLabel={verifying ? "Marking…" : "Mark as verified"}
        onConfirm={handleVerifyConfirm}
        onCancel={() => setVerifyOpen(false)}
      />
    </>
  );
}

function BackBreadcrumb({ profileId, documentId }: { profileId?: string | null; documentId?: string }) {
  return (
    <nav className="flex items-center gap-1 text-sm text-slate-600" aria-label="Breadcrumb">
      <Link to="/admin/users" className="inline-flex items-center gap-1 text-sky-700 hover:underline">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Users
      </Link>
      {profileId ? (
        <>
          <span className="text-slate-400">/</span>
          <span className="font-mono text-xs">profile {profileId.slice(0, 8)}</span>
        </>
      ) : null}
      {documentId ? (
        <>
          <span className="text-slate-400">/</span>
          <span className="font-mono text-xs text-slate-900">DOC-{documentId.slice(0, 8)}</span>
        </>
      ) : null}
    </nav>
  );
}

export default function ReportReviewScreen() {
  return (
    <AdminLayout>
      <ReportReviewBody />
    </AdminLayout>
  );
}

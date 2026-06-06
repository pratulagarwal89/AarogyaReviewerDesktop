import { useMemo } from "react";
import { Minimize2, ExternalLink } from "lucide-react";
import DocumentViewer from "../document/DocumentViewer";
import { getDocumentPdfIframeUrl } from "../../../api/client";
import { mapDocumentToViewItem } from "../../utils/profileMappers";
import type { DocumentDetail } from "../../../api/client";
import CollapsibleStrip from "./CollapsibleStrip";

interface ReportPreviewProps {
  document: DocumentDetail;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export default function ReportPreview({ document, collapsed = false, onToggleCollapsed }: ReportPreviewProps) {
  // mapDocumentToViewItem expects a DocumentListItem shape; DocumentDetail has
  // the same surface plus extras, so we adapt minimally.
  const viewItem = useMemo(
    () =>
      mapDocumentToViewItem({
        id: document.id,
        filename: document.filename,
        patient_name: document.patient_name,
        dob: document.dob,
        document_type: document.document_type,
        status: document.status,
        s3_url: document.s3_url,
        created_at: document.created_at,
        updated_at: document.updated_at,
      }),
    [document],
  );

  if (collapsed && onToggleCollapsed) {
    return <CollapsibleStrip label="Original Document" edge="leading" onExpand={onToggleCollapsed} />;
  }

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col rounded-md border border-slate-200 bg-white">
      <header className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">Original Document</h3>
          <p className="truncate text-xs text-slate-500" title={document.filename}>
            {document.filename}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          <a
            href={getDocumentPdfIframeUrl(document.id)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            Open
          </a>
          {onToggleCollapsed ? (
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-expanded
              title="Collapse Original Document"
              className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
            >
              <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">Collapse</span>
            </button>
          ) : null}
        </div>
      </header>
      <div className="min-h-0 flex-1">
        <DocumentViewer
          documents={[viewItem]}
          selectedDocumentId={viewItem.id}
          onSelectDocument={() => {}}
        />
      </div>
    </section>
  );
}

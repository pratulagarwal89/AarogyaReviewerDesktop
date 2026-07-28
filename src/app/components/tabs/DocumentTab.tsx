import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";
import type { ReviewBundle } from "../../../api/client";
import { mapDocumentToViewItem } from "../../utils/profileMappers";
import type { DocumentViewItem } from "../../types";
import Button from "../common/Button";
import DocumentViewer from "../document/DocumentViewer";
import ExtractedDataPanel from "../document/ExtractedDataPanel";

interface DocumentTabProps {
  bundle: ReviewBundle;
}

export default function DocumentTab({ bundle }: DocumentTabProps) {
  const documents: DocumentViewItem[] = useMemo(
    () => {
      const rawDocuments = Array.isArray(bundle.documents)
        ? bundle.documents.filter(
            (d): d is ReviewBundle["documents"][number] =>
              !!d &&
              typeof d === "object" &&
              typeof (d as { id?: unknown }).id === "string" &&
              (d as { id: string }).id.trim().length > 0,
          )
        : [];
      return rawDocuments.map(mapDocumentToViewItem);
    },
    [bundle.documents],
  );

  const [activeDocumentId, setActiveDocumentId] = useState(documents[0]?.id ?? "");
  const [isPdfViewerCollapsed, setIsPdfViewerCollapsed] = useState(false);
  const [isExtractedPanelCollapsed, setIsExtractedPanelCollapsed] = useState(false);
  const effectiveDocumentId =
    documents.some((d) => d.id === activeDocumentId)
      ? activeDocumentId
      : (documents[0]?.id ?? "");

  const showPdf = !isPdfViewerCollapsed;
  const showExtracted = !isExtractedPanelCollapsed;
  const showDocumentPickerInToolbar = isPdfViewerCollapsed;

  const gridCols =
    showPdf && showExtracted ? "grid-cols-2" : showPdf || showExtracted ? "grid-cols-1" : "grid-cols-1";

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {showDocumentPickerInToolbar ? (
            <select
              value={effectiveDocumentId}
              onChange={(event) => setActiveDocumentId(event.target.value)}
              aria-label="Select document"
              className="w-full max-w-md rounded-sm border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900"
            >
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          <Button
            onClick={() => setIsPdfViewerCollapsed((prev) => !prev)}
            aria-expanded={showPdf}
            className="inline-flex items-center gap-1.5"
          >
            {showPdf ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
            {showPdf ? "Hide PDF" : "Show PDF"}
          </Button>
          <Button
            onClick={() => setIsExtractedPanelCollapsed((prev) => !prev)}
            aria-expanded={showExtracted}
            className="inline-flex items-center gap-1.5"
          >
            {showExtracted ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
            {showExtracted ? "Hide extracted data" : "Show extracted data"}
          </Button>
        </div>
      </div>

      <div className={`grid min-h-0 gap-4 ${gridCols} h-[calc(100vh-292px)]`}>
        {showPdf ? (
          <div className="h-full min-h-0">
            <DocumentViewer
              documents={documents}
              selectedDocumentId={effectiveDocumentId}
              onSelectDocument={setActiveDocumentId}
            />
          </div>
        ) : null}
        {showExtracted ? (
          <div className="h-full min-h-0">
            <ExtractedDataPanel documentId={effectiveDocumentId || undefined} bundle={bundle} />
          </div>
        ) : null}
        {!showPdf && !showExtracted ? (
          <div className="flex min-h-[12rem] flex-col items-center justify-center gap-3 rounded-md border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-600">
            <p>Both the PDF viewer and extracted data panel are hidden. Expand one or both to continue, or use the controls
              above.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" onClick={() => setIsPdfViewerCollapsed(false)}>
                Show PDF
              </Button>
              <Button type="button" onClick={() => setIsExtractedPanelCollapsed(false)}>
                Show extracted data
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

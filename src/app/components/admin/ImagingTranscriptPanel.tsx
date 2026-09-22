import { useMemo } from "react";
import { Minimize2, ShieldAlert } from "lucide-react";
import type { DocumentDetail, ImagingWithheldPage } from "../../../api/client";
import CollapsibleStrip from "./CollapsibleStrip";
import { imagingStatusStyle } from "../../utils/imagingStatus";

interface ImagingTranscriptPanelProps {
  document: DocumentDetail;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

function withheldPages(document: DocumentDetail): ImagingWithheldPage[] {
  const raw = document.imaging_pages_withheld;
  return Array.isArray(raw) ? raw : [];
}

/**
 * The imaging counterpart of AdminLabValuesTable: it occupies the same slot
 * beside the original document, collapses the same way, and is read-only for
 * the same reason.
 *
 * What it shows is different because imaging's processed representation is
 * different. There is no value table to render — the contract is a FAITHFUL
 * Markdown transcription, and an earlier structured-field attempt fabricated an
 * impression that was not in the input. So the transcription is presented as
 * text, verbatim, with no parsing or re-formatting that could put words into
 * the report.
 */
export default function ImagingTranscriptPanel({
  document,
  collapsed = false,
  onToggleCollapsed,
}: ImagingTranscriptPanelProps) {
  const withheld = useMemo(() => withheldPages(document), [document]);
  const status = imagingStatusStyle(document.imaging_extraction_status);
  const markdown = document.imaging_report_markdown ?? "";
  const pages =
    document.imaging_pages_total == null
      ? "—"
      : `${document.imaging_pages_verified ?? 0}/${document.imaging_pages_total}`;

  if (collapsed && onToggleCollapsed) {
    return <CollapsibleStrip label="Imaging Transcription" edge="trailing" onExpand={onToggleCollapsed} />;
  }

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col rounded-md border border-slate-200 bg-white">
      <header className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">Imaging Transcription</h3>
          <p className="font-mono text-xs text-slate-500">
            imaging_reports · lane {document.imaging_lane || "—"} · pages verified {pages}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <span
            data-testid="imaging-status-badge"
            className={`rounded-full border px-2 py-0.5 text-xs font-medium ${status.classes}`}
          >
            {status.label}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
            Read-only
          </span>
          {onToggleCollapsed ? (
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-expanded
              title="Collapse Imaging Transcription"
              className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
            >
              <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">Collapse</span>
            </button>
          ) : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        {withheld.length > 0 ? (
          <section className="border-b border-violet-100 bg-violet-50/60 px-4 py-3">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-violet-900">
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
              Withheld by the privacy gate · {withheld.length}{" "}
              {withheld.length === 1 ? "page" : "pages"}
            </h4>
            <table className="mt-2 w-full text-xs">
              <thead className="text-left text-[11px] uppercase tracking-wide text-violet-800/70">
                <tr>
                  <th className="py-1 pr-3 font-semibold">Page</th>
                  <th className="py-1 pr-3 font-semibold">Reason</th>
                  <th className="py-1 font-semibold">Detail</th>
                </tr>
              </thead>
              <tbody>
                {withheld.map((entry, index) => (
                  <tr key={`${entry.page}-${entry.reason}-${index}`} className="border-t border-violet-100">
                    <td className="py-1 pr-3 font-mono text-violet-900">{entry.page ?? "—"}</td>
                    <td className="py-1 pr-3 font-mono text-violet-900">{entry.reason || "—"}</td>
                    <td className="py-1 font-mono text-violet-800">{entry.detail || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        {markdown ? (
          <div className="px-4 py-3">
            {document.imaging_administrative_details ? (
              <section className="mb-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Administrative details
                </h4>
                <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-xs text-slate-700">
                  {document.imaging_administrative_details}
                </pre>
              </section>
            ) : null}
            <pre
              data-testid="imaging-markdown"
              className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-slate-900"
            >
              {markdown}
            </pre>
          </div>
        ) : (
          <div className="p-6 text-center text-sm text-slate-600">
            {emptyBodyMessage(document.imaging_extraction_status)}
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Why there is no transcription to read. Each case is a different thing to do
 * next, so they must not collapse into one "no data" line.
 */
function emptyBodyMessage(status?: string): string {
  switch (status) {
    case "blocked":
      return (
        "Every page was withheld by the privacy gate, so nothing was transmitted and " +
        "nothing is stored. The per-page reasons are listed above. If redaction has " +
        "improved since, reprocess this record — it will be offered to the gate again."
      );
    case "pending":
      return "Queued for transcription. The record updates here when the worker finishes.";
    case "failed":
      return "The extraction errored. Reprocess this record to try again with the current pipeline.";
    default:
      return "No transcription stored for this imaging record yet.";
  }
}

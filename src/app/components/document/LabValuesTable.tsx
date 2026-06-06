import { AlertTriangle, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { LabValueView } from "../../types";

interface LabValuesTableProps {
  labValues?: LabValueView[]; // From document_intake.structured_tables (see documentMappers).
  /** When set, second column shows normalized stored tests (e.g. lab_reports path). Omitted for intake-only UI. */
  extractedLabValues?: LabValueView[];
}

function statusClasses(status?: LabValueView["status"]): string {
  if (!status) return "text-gray-700";
  if (status === "Normal") return "text-green-600";
  if (status === "Critical") return "text-red-500";
  if (status === "Low" || status === "High") return "text-orange-500";
  return "text-gray-700";
}

function ctxCell(v?: string) {
  return v && v.trim() !== "" ? v : "—";
}

type StripEdge = "leading" | "trailing";

function CollapsibleValueFrame({
  open,
  onToggle,
  stripLabel,
  stripEdge,
  title,
  rows,
  emptyText,
  showTableContext,
}: {
  open: boolean;
  onToggle: () => void;
  /** Short label shown on the collapsed side strip (vertical) */
  stripLabel: string;
  /** Which side this column sits on — controls expand chevron direction */
  stripEdge: StripEdge;
  title: string;
  rows?: LabValueView[];
  emptyText: string;
  showTableContext?: boolean;
}) {
  const safeRows = rows ?? [];
  const count = safeRows.length;
  const expandIcon =
    stripEdge === "leading" ? (
      <ChevronRight className="h-5 w-5 shrink-0 text-gray-600" aria-hidden />
    ) : (
      <ChevronLeft className="h-5 w-5 shrink-0 text-gray-600" aria-hidden />
    );

  if (!open) {
    return (
      <section className="flex h-full min-h-[12rem] w-12 shrink-0 flex-col overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={false}
          title={`Expand ${title}`}
          className="flex h-full min-h-[12rem] w-full flex-col items-center justify-between gap-2 py-3 hover:bg-gray-50"
        >
          <span className="select-none text-center text-xs font-semibold leading-tight text-gray-900 [writing-mode:vertical-rl] rotate-180">
            {stripLabel}
          </span>
          {expandIcon}
          <span className="sr-only">Expand {title}</span>
        </button>
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded
        className="flex w-full shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-900 hover:bg-gray-50"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate sm:inline">{title}</span>
          <span className="mt-0.5 block font-normal text-gray-600 sm:mt-0 sm:ml-2 sm:inline">
            ({count} {count === 1 ? "row" : "rows"})
          </span>
        </span>
        <ChevronUp className="h-5 w-5 shrink-0 text-gray-600" aria-hidden />
      </button>
      {count === 0 ? (
        <div className="flex min-h-[120px] flex-1 flex-col justify-center px-4 py-4">
          <p className="text-sm text-gray-600">{emptyText}</p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col p-4 pt-3">
          <div className="min-h-0 flex-1 overflow-auto">
            <table
              className={`w-full border border-gray-200 text-sm ${showTableContext ? "min-w-[1040px]" : "min-w-[720px]"}`}
            >
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-3 py-2 text-left font-semibold text-gray-900">Page</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-900">Test Name</th>
                  {showTableContext ? (
                    <>
                      <th className="px-3 py-2 text-left font-semibold text-gray-900">Table ID</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-900">Panel</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-900">Specimen</th>
                    </>
                  ) : null}
                  <th className="px-3 py-2 text-left font-semibold text-gray-900">Value</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-900">Unit</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-900">Reference Range</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody>
                {safeRows.map((value, index) => {
                  const abnormal = value.status !== "Normal";
                  return (
                    <tr key={`${value.testName}-${index}`} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="border-t border-gray-200 px-3 py-2 text-gray-900">{value.page ?? "—"}</td>
                      <td className="border-t border-gray-200 px-3 py-2 text-gray-900">{value.testName}</td>
                      {showTableContext ? (
                        <>
                          <td className="border-t border-gray-200 px-3 py-2 font-mono text-xs text-gray-800">
                            {ctxCell(value.sourceTableId)}
                          </td>
                          <td className="border-t border-gray-200 px-3 py-2 text-gray-900">{ctxCell(value.panel)}</td>
                          <td className="border-t border-gray-200 px-3 py-2 text-gray-900">{ctxCell(value.specimen)}</td>
                        </>
                      ) : null}
                      <td className="border-t border-gray-200 px-3 py-2 text-gray-900">{value.value}</td>
                      <td className="border-t border-gray-200 px-3 py-2 text-gray-900">{value.unit}</td>
                      <td className="border-t border-gray-200 px-3 py-2 text-gray-900">{value.referenceRange}</td>
                      <td className={`border-t border-gray-200 px-3 py-2 font-medium ${statusClasses(value.status)}`}>
                        <span className="inline-flex items-center gap-1">
                          {abnormal ? <AlertTriangle className="h-4 w-4" aria-hidden="true" /> : null}
                          {value.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

export default function LabValuesTable({ labValues, extractedLabValues }: LabValuesTableProps) {
  const [labSectionOpen, setLabSectionOpen] = useState(true);
  const [uiOpen, setUiOpen] = useState(true);
  const [extractedOpen, setExtractedOpen] = useState(true);
  const uiCount = labValues?.length ?? 0;
  const extractedCount = extractedLabValues?.length ?? 0;
  const showStoredColumn = extractedLabValues !== undefined;

  return (
    <section className="overflow-hidden rounded-md border border-gray-200 bg-gray-50/80 shadow-sm">
      <button
        type="button"
        onClick={() => setLabSectionOpen((open) => !open)}
        aria-expanded={labSectionOpen}
        className={`flex w-full items-center justify-between gap-3 bg-white px-4 py-3 text-left text-sm font-semibold text-gray-900 hover:bg-gray-50 ${
          labSectionOpen ? "border-b border-gray-200" : ""
        }`}
      >
        <span>
          Lab values
          <span className="ml-2 font-normal text-gray-600">
            {showStoredColumn ? `(document: ${uiCount} · stored: ${extractedCount})` : `(document_intake tables: ${uiCount})`}
          </span>
        </span>
        {labSectionOpen ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-gray-600" aria-hidden />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-gray-600" aria-hidden />
        )}
      </button>
      {labSectionOpen ? (
        <div className="flex h-[min(60vh,560px)] min-h-[280px] w-full min-w-0 flex-row items-stretch gap-2 p-4">
          <div className={showStoredColumn ? "contents" : "flex min-h-0 min-w-0 flex-1 flex-col"}>
            <CollapsibleValueFrame
              open={uiOpen}
              onToggle={() => setUiOpen((v) => !v)}
              stripLabel="UI / Document"
              stripEdge="leading"
              title="Lab Values (document_intake.structured_tables)"
              rows={labValues}
              emptyText="No lab values extracted from document_intake.structured_tables."
              showTableContext={false}
            />
          </div>
          {showStoredColumn ? (
            <CollapsibleValueFrame
              open={extractedOpen}
              onToggle={() => setExtractedOpen((v) => !v)}
              stripLabel="Stored"
              stripEdge="trailing"
              title="Lab Values (stored / joined)"
              rows={extractedLabValues}
              emptyText="No stored lab values in this view."
              showTableContext
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

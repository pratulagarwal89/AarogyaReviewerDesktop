import { useMemo } from "react";
import { Minimize2 } from "lucide-react";
import type { DocumentDetail } from "../../../api/client";
import CollapsibleStrip from "./CollapsibleStrip";

interface AdminLabValuesTableProps {
  document: DocumentDetail;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

interface LabRow {
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  flag?: string;
  confidence?: string;
}

interface InterpretationRow {
  key: string;
  text: string;
  page: string;
  confidence?: string;
}

/**
 * Best-effort normalization of `lab_reports.extracted_values` into rows.
 *
 * The blob can arrive in any of these shapes:
 *   1. Array of structured rows: [{test_name, value, unit, reference_range, flag, confidence}]
 *   2. Object wrapping rows: {tests:[...]} | {lab_values:[...]} | {results:[...]}
 *   3. Legacy key→value map: {glucose: 95, hba1c: 5.8}
 *   4. Map with metadata: {glucose: {value, unit, reference_range, flag}}
 *
 * Editing is intentionally not wired in this pass (see plan: "Read-only for
 * now, add edit later"). Add row / delete row / inline edit will follow once
 * the canonical row shape is agreed with the backend and a granular CRUD
 * endpoint exists.
 */
function normalizeRows(extracted: unknown): LabRow[] {
  if (!extracted || typeof extracted !== "object") return [];
  if (Array.isArray(extracted)) return extracted.map(rowFromUnknown).filter(Boolean) as LabRow[];

  const obj = extracted as Record<string, unknown>;
  for (const key of ["tests", "lab_values", "rows", "results"]) {
    const value = obj[key];
    if (Array.isArray(value)) return value.map(rowFromUnknown).filter(Boolean) as LabRow[];
  }
  return Object.entries(obj).map(([k, v]) => rowFromKeyValue(k, v)).filter(Boolean) as LabRow[];
}

function normalizeInterpretations(extracted: unknown): InterpretationRow[] {
  if (!extracted || typeof extracted !== "object" || Array.isArray(extracted)) return [];
  const obj = extracted as Record<string, unknown>;
  const raw = obj.interpretations;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const row = item as Record<string, unknown>;
      const text = pickString(row, ["text"]);
      if (!text) return null;
      const key = pickString(row, ["key_raw", "key"]) || "Interpretation";
      const pageRaw = row.page;
      const page = pageRaw == null || String(pageRaw).trim() === "" ? "—" : String(pageRaw);
      const confidence = pickString(row, ["confidence", "score"]);
      return { key, text, page, confidence: confidence || undefined };
    })
    .filter(Boolean) as InterpretationRow[];
}

function rowFromUnknown(input: unknown): LabRow | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const r = input as Record<string, unknown>;
  const testName = pickString(r, ["test_name", "test_name_raw", "parameter", "name"]);
  const value = pickString(r, ["value", "value_numeric", "result"]);
  const unit = pickString(r, ["unit", "unit_raw", "units"]);
  const ref = pickString(r, ["reference_range", "reference_range_raw", "range"]) || rangeFromLowHigh(r);
  const flag = pickString(r, ["flag", "status", "direction"]);
  const confidence = pickString(r, ["confidence", "score"]);
  if (!testName && !value) return null;
  return {
    testName: testName || "—",
    value: value || "—",
    unit: unit || "—",
    referenceRange: ref || "—",
    flag,
    confidence,
  };
}

function rowFromKeyValue(key: string, value: unknown): LabRow | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const inner = rowFromUnknown({ test_name: key, ...(value as Record<string, unknown>) });
    if (inner) return inner;
  }
  const stringValue = value == null ? "" : String(value);
  if (!key && !stringValue) return null;
  return {
    testName: key || "—",
    value: stringValue || "—",
    unit: "—",
    referenceRange: "—",
  };
}

function pickString(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

function rangeFromLowHigh(obj: Record<string, unknown>): string {
  const lo = obj.ref_low;
  const hi = obj.ref_high;
  const parts = [lo, hi].filter((x) => x != null && String(x).trim() !== "");
  if (parts.length === 0) return "";
  return parts.map((x) => String(x)).join(" – ");
}

function flagBadge(flag?: string): { label: string; classes: string } | null {
  if (!flag) return null;
  const raw = flag.trim().toLowerCase();
  if (!raw) return null;
  if (["high", "h", "↑"].includes(raw)) {
    return { label: "High", classes: "border-rose-200 bg-rose-50 text-rose-700" };
  }
  if (["low", "l", "↓"].includes(raw)) {
    return { label: "Low", classes: "border-amber-200 bg-amber-50 text-amber-700" };
  }
  if (["borderline", "b"].includes(raw)) {
    return { label: "Borderline", classes: "border-violet-200 bg-violet-50 text-violet-700" };
  }
  if (["normal", "n"].includes(raw)) {
    return { label: "Normal", classes: "border-emerald-200 bg-emerald-50 text-emerald-700" };
  }
  return { label: flag, classes: "border-slate-200 bg-slate-50 text-slate-700" };
}

export default function AdminLabValuesTable({
  document,
  collapsed = false,
  onToggleCollapsed,
}: AdminLabValuesTableProps) {
  const rows = useMemo(() => normalizeRows(document.extracted_values), [document.extracted_values]);
  const interpretations = useMemo(
    () => normalizeInterpretations(document.extracted_values),
    [document.extracted_values],
  );

  if (collapsed && onToggleCollapsed) {
    return <CollapsibleStrip label="Extracted Lab Values" edge="trailing" onExpand={onToggleCollapsed} />;
  }

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col rounded-md border border-slate-200 bg-white">
      <header className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">Extracted Lab Values</h3>
          <p className="font-mono text-xs text-slate-500">
            lab_report table · {rows.length} {rows.length === 1 ? "row" : "rows"} ·{" "}
            {interpretations.length} {interpretations.length === 1 ? "interpretation" : "interpretations"}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
            Read-only
          </span>
          {onToggleCollapsed ? (
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-expanded
              title="Collapse Extracted Lab Values"
              className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
            >
              <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">Collapse</span>
            </button>
          ) : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        {rows.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-600">
            No lab values extracted. Add / edit / delete coming next iteration —
            until then, reprocess the report to repopulate this table.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-2">Test</th>
                <th className="px-3 py-2">Value</th>
                <th className="px-3 py-2">Unit</th>
                <th className="px-3 py-2">Range</th>
                <th className="px-3 py-2">Flag</th>
                <th className="px-3 py-2 text-right">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const badge = flagBadge(row.flag);
                return (
                  <tr
                    key={`${row.testName}-${index}`}
                    className={`border-t border-slate-100 ${index % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                  >
                    <td className="px-3 py-2 text-slate-900">{row.testName}</td>
                    <td className="px-3 py-2 text-slate-900">{row.value}</td>
                    <td className="px-3 py-2 text-slate-700">{row.unit}</td>
                    <td className="px-3 py-2 text-slate-700">{row.referenceRange}</td>
                    <td className="px-3 py-2">
                      {badge ? (
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${badge.classes}`}>
                          {badge.label}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700">
                      {row.confidence || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="border-t border-slate-200">
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Interpretations / Findings
          </div>
          {interpretations.length === 0 ? (
            <div className="px-3 pb-3 text-sm text-slate-500">
              No interpretation blocks found in extracted values.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-3 py-2">Heading</th>
                  <th className="px-3 py-2">Finding</th>
                  <th className="px-3 py-2">Page</th>
                  <th className="px-3 py-2 text-right">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {interpretations.map((item, index) => (
                  <tr
                    key={`${item.key}-${index}`}
                    className={`border-t border-slate-100 ${index % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                  >
                    <td className="px-3 py-2 text-slate-900">{item.key}</td>
                    <td className="px-3 py-2 whitespace-pre-wrap text-slate-800">{item.text}</td>
                    <td className="px-3 py-2 text-slate-700">{item.page}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{item.confidence || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}

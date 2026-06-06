import type { DocumentDetail } from "../../api/client";
import type { ExtractedDataView, LabValueView } from "../types";

/** Structured table from document_intake.structured_tables (one per page) */
interface StructuredTableItem {
  page_index?: number;
  header?: string[] | unknown[];
  rows?: (string[] | unknown[])[];
  /** Lab-extractor / OCR pipeline shape: list of row objects (no string[][] grid). */
  rows_normalized?: Record<string, unknown>[];
}

function structuredTablesToLabValues(tables: unknown[]): LabValueView[] {
  const out: LabValueView[] = [];
  if (!Array.isArray(tables)) return out;
  const byPage = [...tables]
    .map((t) => t as StructuredTableItem)
    .sort((a, b) => (a.page_index ?? 0) - (b.page_index ?? 0));

  const norm = (s: unknown) => (s == null || s === "" ? "—" : String(s));
  const toStatus = (s: unknown): LabValueView["status"] => {
    const raw = String(s ?? "").trim().toLowerCase();
    if (raw === "high" || raw === "h" || raw === "↑") return "High";
    if (raw === "low" || raw === "l" || raw === "↓") return "Low";
    if (raw === "critical" || raw === "c" || raw === "panic") return "Critical";
    if (raw === "abnormal" || raw === "a") return "High";
    return "Normal";
  };

  const referenceFromNormalized = (r: Record<string, unknown>): string => {
    const raw = r.reference_range_raw;
    if (raw != null && String(raw).trim() !== "") return String(raw);
    const lo = r.ref_low;
    const hi = r.ref_high;
    const parts = [lo, hi].filter((x) => x != null && String(x).trim() !== "");
    if (parts.length === 0) return "—";
    return parts.map((x) => String(x)).join(" – ");
  };

  for (const table of byPage) {
    const page = (table.page_index ?? 0) + 1;
    const rowsNorm = Array.isArray(table?.rows_normalized) ? table.rows_normalized : null;
    if (rowsNorm?.length) {
      for (const row of rowsNorm) {
        if (!row || typeof row !== "object") continue;
        const r = row as Record<string, unknown>;
        const testName = r.test_name ?? r.test_name_raw ?? r.parameter;
        const value = r.value ?? r.value_numeric;
        const hasSignal =
          (testName != null && String(testName).trim() !== "") ||
          (value != null && String(value).trim() !== "");
        if (!hasSignal) continue;
        const panel = r.panel;
        const specimen = r.sample_type;
        out.push({
          testName: norm(testName ?? "—"),
          value: norm(value ?? "—"),
          unit: norm(r.unit ?? r.unit_raw),
          referenceRange: norm(referenceFromNormalized(r)),
          status: toStatus(r.flag),
          page,
          ...(panel != null && String(panel).trim() !== ""
            ? { panel: String(panel) }
            : {}),
          ...(specimen != null && String(specimen).trim() !== ""
            ? { specimen: String(specimen) }
            : {}),
        });
      }
      continue;
    }

    // Legacy grid: rows[0] is header, rows[1..] are data rows.
    const rowsRaw = Array.isArray(table?.rows) ? table.rows : null;
    if (!rowsRaw?.length) continue;

    const headerRow = Array.isArray(rowsRaw[0]) ? rowsRaw[0] : [];
    if (!headerRow.length) continue;
    const h = headerRow.map((x) => String(x ?? "").trim().toLowerCase());

    const iTest = Math.max(0, h.findIndex((x) => x.includes("test") || x.includes("parameter")));
    const iVal = h.findIndex((x) => x.includes("value") || x.includes("result"));
    const iUnit = h.findIndex((x) => x.includes("unit"));
    const iRef = h.findIndex((x) => x.includes("reference") || x.includes("ref"));
    const iStatus = h.findIndex((x) => x.includes("status") || x.includes("flag"));
    const iv = iVal >= 0 ? iVal : 1;
    const iu = iUnit >= 0 ? iUnit : 2;
    const ir = iRef >= 0 ? iRef : 3;
    const is = iStatus >= 0 ? iStatus : -1;

    for (const row of rowsRaw.slice(1)) {
      const arr = Array.isArray(row) ? row : [];
      if (arr.length === 0) continue;
      out.push({
        testName: norm(arr[iTest] ?? arr[0]),
        value: norm(arr[iv] ?? arr[1]),
        unit: norm(arr[iu] ?? arr[2]),
        referenceRange: norm(arr[ir] ?? arr[3]),
        status: toStatus(is >= 0 ? arr[is] : "Normal"),
        page,
      });
    }
  }
  return out;
}

/**
 * Maps `GET /review/documents/:id` to the extracted panel using **document_intake** fields only.
 *
 * Note: AarogyaSoul’s review handler also LEFT JOINs `lab_reports` and exposes `extracted_values`,
 * `abnormal_details`, `lab_name`, `lab_report_date`, etc. on the same JSON object. Those are ignored
 * here so the UI reflects `document_intake` only (see `structured_tables`, `label_value_pairs`,
 * `plain_text_searchable`, core metadata columns).
 */
export function documentDetailToExtractedView(doc: DocumentDetail): ExtractedDataView {
  // Intake-only: omit lab_report_date / lab_name (review API merges latest lab_reports row).
  const metadata: Record<string, string> = {
    "Patient Name": doc.patient_name ?? "—",
    "Date of Service": doc.created_at ?? "—",
    "Document Type": doc.document_type ?? "—",
    "Provider": "—",
    "Status": doc.status,
    "Filename": doc.filename,
  };

  const fromStructuredTables = structuredTablesToLabValues(doc.structured_tables ?? []);
  /** Intentionally omitted: normalized rows from `lab_reports.extracted_values` / review API join. */
  const labReportExtractedValues = undefined;
  const labValues = fromStructuredTables.length > 0 ? fromStructuredTables : undefined;

  const textFields = doc.plain_text_searchable
    ? [{ label: "OCR / Plain text", value: doc.plain_text_searchable, multiline: true }]
    : undefined;

  const keyValuePairs: Record<string, string> = {};
  for (const p of doc.label_value_pairs ?? []) {
    keyValuePairs[p.label] = p.value;
  }

  return {
    metadata,
    labValues,
    labReportExtractedValues,
    textFields: textFields && textFields.length > 0 ? textFields : undefined,
    keyValuePairs: Object.keys(keyValuePairs).length ? keyValuePairs : undefined,
  };
}

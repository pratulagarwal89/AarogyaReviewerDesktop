// Pure current-vs-proposed diff over materialized extraction payloads.
//
// A verifier_filtered proposal is the primary extraction minus a few rows the
// verifier judged non-patient (legend/interpretation/contradiction). We diff by
// `source_row_id` (the stable page-lineage key) so the reviewer sees exactly
// which rows a proposal drops or changes — not a re-ordered re-render.

export interface DiffTestRow {
  sourceRowId: string | null;
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  page?: number;
  panel?: string;
}

export type DiffStatus = 'unchanged' | 'removed' | 'added' | 'changed';

export interface DiffRow {
  key: string;
  status: DiffStatus;
  current?: DiffTestRow;
  proposed?: DiffTestRow;
}

function str(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function pick(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
      return str(row[k]);
    }
  }
  return '';
}

/**
 * Normalize a version payload (materialized `extracted_values`, shape
 * `{tests:[...]}`) into diffable rows, tolerating the several field-name
 * conventions used across the pipeline.
 */
export function normalizeTests(payload: unknown): DiffTestRow[] {
  let list: unknown = payload;
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    list = (payload as { tests?: unknown }).tests;
  }
  if (!Array.isArray(list)) return [];
  return list.map((raw) => {
    const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const idRaw = pick(row, ['source_row_id', 'sourceRowId', 'row_id']);
    const pageRaw = pick(row, ['page_index', 'page', 'pageNumber']);
    return {
      sourceRowId: idRaw === '' ? null : idRaw,
      testName: pick(row, ['test_name', 'name', 'testName', 'analyte', 'label']),
      value: pick(row, ['value', 'result', 'reported_value']),
      unit: pick(row, ['unit', 'units']),
      referenceRange: pick(row, ['reference_range', 'reference', 'referenceRange', 'ref_range']),
      page: pageRaw === '' ? undefined : Number(pageRaw),
      panel: pick(row, ['panel', 'category', 'section']) || undefined,
    };
  });
}

function rowKey(r: DiffTestRow, idx: number): string {
  if (r.sourceRowId) return 'id:' + r.sourceRowId;
  // No lineage id: fall back to name+ordinal so equal-named rows stay distinct.
  return 'name:' + r.testName.toLowerCase() + ':' + idx;
}

function cellsEqual(a: DiffTestRow, b: DiffTestRow): boolean {
  return (
    a.testName === b.testName &&
    a.value === b.value &&
    a.unit === b.unit &&
    a.referenceRange === b.referenceRange
  );
}

/**
 * Diff two normalized row sets keyed by source_row_id (name+ordinal fallback).
 * Current rows keep their order; rows present only in the proposal are appended
 * as `added`. In the common verifier_filtered case, dropped rows show `removed`.
 */
export function diffRows(current: DiffTestRow[], proposed: DiffTestRow[]): DiffRow[] {
  const proposedByKey = new Map<string, DiffTestRow>();
  proposed.forEach((r, i) => proposedByKey.set(rowKey(r, i), r));

  const seen = new Set<string>();
  const out: DiffRow[] = [];

  current.forEach((cur, i) => {
    const key = rowKey(cur, i);
    seen.add(key);
    const prop = proposedByKey.get(key);
    if (!prop) {
      out.push({ key, status: 'removed', current: cur });
    } else if (cellsEqual(cur, prop)) {
      out.push({ key, status: 'unchanged', current: cur, proposed: prop });
    } else {
      out.push({ key, status: 'changed', current: cur, proposed: prop });
    }
  });

  proposed.forEach((prop, i) => {
    const key = rowKey(prop, i);
    if (!seen.has(key)) out.push({ key, status: 'added', proposed: prop });
  });

  return out;
}

export interface DiffSummary {
  removed: number;
  added: number;
  changed: number;
  unchanged: number;
}

export function summarizeDiff(rows: DiffRow[]): DiffSummary {
  return rows.reduce(
    (acc, r) => {
      acc[r.status] += 1;
      return acc;
    },
    { removed: 0, added: 0, changed: 0, unchanged: 0 } as DiffSummary,
  );
}

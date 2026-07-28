/**
 * Faithful TypeScript port of the Flutter end-user simplified-lab rendering
 * logic, so the desktop "End-user (Flutter) view" shows exactly what the mobile
 * app shows for the same `/imported-files/:id/simplified-values` payload.
 *
 * Ported from AarogyaFace:
 *   - lib/features/documents/services/simplified_report_service.dart  (parsing)
 *   - lib/features/documents/services/result_status_resolver.dart     (status)
 *   - lib/features/documents/models/simplified_report_models.dart     (shapes)
 *
 * Keep this in sync with those files if the Flutter logic changes.
 */

export type ResultStatusType =
  | 'withinLabRange'
  | 'high'
  | 'low'
  | 'partlyOutsideLabRange'
  | 'outsideLabRange'
  | 'borderline'
  | 'labBand'
  | 'noComparisonAvailable';

export interface ResultStatus {
  type: ResultStatusType;
  label: string;
  source: 'explicitLabFlag' | 'numericComparison' | 'textualComparison' | 'referenceBand' | 'unavailable';
}

export interface ReferenceBand {
  label: string;
  rangeText: string;
  containsValue: boolean;
  explicitlyBorderline: boolean;
}

export interface DemographicReferenceRange {
  label: string;
  rangeText: string;
  isUsed: boolean;
  isConfident: boolean;
}

export interface SimplifiedResult {
  id: string;
  sectionName: string;
  testName: string;
  result: string;
  unit?: string;
  referenceText?: string;
  note?: string;
  status: ResultStatus;
  referenceBands: ReferenceBand[];
  demographicRanges: DemographicReferenceRange[];
  usedReferenceDescription?: string;
  usedReferenceSelectedConfidently: boolean;
}

export interface SimplifiedSection {
  id: string;
  name: string;
  results: SimplifiedResult[];
}

export interface SimplifiedReportData {
  title?: string;
  subtitle?: string;
  patientName?: string;
  reportInfoLine?: string;
  sections: SimplifiedSection[];
}

const OUTSIDE_TYPES: ReadonlySet<ResultStatusType> = new Set([
  'high',
  'low',
  'partlyOutsideLabRange',
  'outsideLabRange',
  'borderline',
]);

export function isOutsideLabRange(status: ResultStatus): boolean {
  return OUTSIDE_TYPES.has(status.type);
}

// ---------------------------------------------------------------------------
// Small readers (mirror _readString / _readBool)
// ---------------------------------------------------------------------------

type AnyMap = Record<string, unknown>;

function readString(map: AnyMap, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = map[key];
    if (value == null) continue;
    const text = String(value).trim();
    if (text !== '' && text.toLowerCase() !== 'null') return text;
  }
  return undefined;
}

function readBool(map: AnyMap, keys: string[]): boolean {
  for (const key of keys) {
    const value = map[key];
    if (value == null) continue;
    if (typeof value === 'boolean') return value;
    const text = String(value).trim().toLowerCase();
    if (text === 'true' || text === '1' || text === 'yes') return true;
    if (text === 'false' || text === '0' || text === 'no') return false;
  }
  return false;
}

function slugify(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || 'section';
}

// ---------------------------------------------------------------------------
// Status resolution (port of ResultStatusResolver)
// ---------------------------------------------------------------------------

const TEXT_TERMS = [
  'not detected',
  'non reactive',
  'not present',
  'detected',
  'negative',
  'positive',
  'present',
  'absent',
  'nil',
];

function titleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface NumericResult {
  min: number;
  max: number;
}
type ReferenceKind = 'between' | 'upper' | 'lower';
interface ReferenceConstraint {
  kind: ReferenceKind;
  min?: number;
  max?: number;
}

function parseResultNumericValue(text: string): NumericResult | null {
  const normalized = text.replace(/,/g, '');
  const interval = normalized.match(/(-?\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(-?\d+(?:\.\d+)?)/i);
  if (interval) {
    const first = Number.parseFloat(interval[1]);
    const second = Number.parseFloat(interval[2]);
    if (Number.isNaN(first) || Number.isNaN(second)) return null;
    return { min: Math.min(first, second), max: Math.max(first, second) };
  }
  const num = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!num) return null;
  const value = Number.parseFloat(num[0]);
  if (Number.isNaN(value)) return null;
  return { min: value, max: value };
}

function parseReferenceConstraint(referenceText?: string): ReferenceConstraint | null {
  if (!referenceText || referenceText.trim() === '') return null;
  const normalized = referenceText.toLowerCase().replace(/,/g, '');

  const upperInclusive = normalized.match(/(?:<=|≤|less than or equal to)\s*(-?\d+(?:\.\d+)?)/);
  if (upperInclusive) {
    const v = Number.parseFloat(upperInclusive[1]);
    if (!Number.isNaN(v)) return { kind: 'upper', max: v };
  }
  const upper = normalized.match(/(?:<|below|under|up to)\s*(-?\d+(?:\.\d+)?)/);
  if (upper) {
    const v = Number.parseFloat(upper[1]);
    if (!Number.isNaN(v)) return { kind: 'upper', max: v };
  }
  const lowerInclusive = normalized.match(/(?:>=|≥|greater than or equal to)\s*(-?\d+(?:\.\d+)?)/);
  if (lowerInclusive) {
    const v = Number.parseFloat(lowerInclusive[1]);
    if (!Number.isNaN(v)) return { kind: 'lower', min: v };
  }
  const lower = normalized.match(/(?:>|above|greater than|at least)\s*(-?\d+(?:\.\d+)?)/);
  if (lower) {
    const v = Number.parseFloat(lower[1]);
    if (!Number.isNaN(v)) return { kind: 'lower', min: v };
  }
  const range = normalized.match(/(-?\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(-?\d+(?:\.\d+)?)/);
  if (range) {
    const first = Number.parseFloat(range[1]);
    const second = Number.parseFloat(range[2]);
    if (Number.isNaN(first) || Number.isNaN(second)) return null;
    return { kind: 'between', min: Math.min(first, second), max: Math.max(first, second) };
  }
  return null;
}

function compareNumeric(result: NumericResult, reference: ReferenceConstraint): ResultStatusType | null {
  switch (reference.kind) {
    case 'between': {
      const min = reference.min!;
      const max = reference.max!;
      if (result.max < min) return 'low';
      if (result.min > max) return 'high';
      if (result.min >= min && result.max <= max) return 'withinLabRange';
      return 'partlyOutsideLabRange';
    }
    case 'upper': {
      const upper = reference.max!;
      if (result.min > upper) return 'high';
      if (result.max <= upper) return 'withinLabRange';
      return 'partlyOutsideLabRange';
    }
    case 'lower': {
      const lower = reference.min!;
      if (result.max < lower) return 'low';
      if (result.min >= lower) return 'withinLabRange';
      return 'partlyOutsideLabRange';
    }
  }
}

function matchesAny(text: string, matches: string[]): boolean {
  return matches.some((m) => text === m);
}

function resolveFromExplicitFlag(explicitFlag?: string): ResultStatus | null {
  const value = explicitFlag?.trim().toLowerCase();
  if (!value || value === 'unknown') return null;
  if (matchesAny(value, ['normal', 'within', 'n'])) {
    return { type: 'withinLabRange', label: 'In range', source: 'explicitLabFlag' };
  }
  if (matchesAny(value, ['high', 'h'])) {
    return { type: 'high', label: 'High', source: 'explicitLabFlag' };
  }
  if (matchesAny(value, ['low', 'l'])) {
    return { type: 'low', label: 'Low', source: 'explicitLabFlag' };
  }
  if (value.includes('border')) {
    return { type: 'borderline', label: 'Borderline', source: 'explicitLabFlag' };
  }
  if (matchesAny(value, ['abnormal', 'outside', 'critical'])) {
    return { type: 'outsideLabRange', label: 'Outside range', source: 'explicitLabFlag' };
  }
  return { type: 'labBand', label: titleCase(explicitFlag!.trim()), source: 'explicitLabFlag' };
}

function resolveFromReferenceBand(bands: ReferenceBand[]): ResultStatus | null {
  const matched = bands.filter((b) => b.containsValue);
  if (matched.length === 0) return null;
  const band = matched[0];
  if (band.explicitlyBorderline || band.label.toLowerCase().includes('borderline')) {
    return { type: 'borderline', label: 'Borderline', source: 'referenceBand' };
  }
  return { type: 'labBand', label: `Lab band: ${band.label}`, source: 'referenceBand' };
}

function resolveFromNumeric(resultText: string, referenceText?: string): ResultStatus | null {
  const reference = parseReferenceConstraint(referenceText);
  if (!reference) return null;
  const result = parseResultNumericValue(resultText);
  if (!result) return null;
  const compare = compareNumeric(result, reference);
  if (!compare) return null;
  const labels: Partial<Record<ResultStatusType, string>> = {
    withinLabRange: 'In range',
    high: 'High',
    low: 'Low',
    partlyOutsideLabRange: 'Partly outside range',
  };
  return { type: compare, label: labels[compare] ?? 'No comparison', source: 'numericComparison' };
}

function resolveFromTextual(resultText: string, referenceText?: string): ResultStatus | null {
  if (!referenceText || referenceText.trim() === '') return null;
  const refNorm = normalizeText(referenceText);
  const refTerms = TEXT_TERMS.filter((t) => refNorm.includes(t));
  if (refTerms.length === 0) return null;
  const resNorm = normalizeText(resultText);
  const resultTerm = TEXT_TERMS.find((t) => resNorm.includes(t));
  if (!resultTerm) return null;
  if (refTerms.includes(resultTerm)) {
    return { type: 'withinLabRange', label: 'Matches reference', source: 'textualComparison' };
  }
  return { type: 'outsideLabRange', label: 'Does not match', source: 'textualComparison' };
}

export function resolveStatus(args: {
  explicitFlag?: string;
  resultText: string;
  referenceText?: string;
  referenceBands?: ReferenceBand[];
}): ResultStatus {
  return (
    resolveFromExplicitFlag(args.explicitFlag) ??
    resolveFromReferenceBand(args.referenceBands ?? []) ??
    resolveFromNumeric(args.resultText, args.referenceText) ??
    resolveFromTextual(args.resultText, args.referenceText) ?? {
      type: 'noComparisonAvailable',
      label: 'No comparison',
      source: 'unavailable',
    }
  );
}

// ---------------------------------------------------------------------------
// Payload parsing (port of SimplifiedReportService.fetchReportForDocument)
// ---------------------------------------------------------------------------

function parseReferenceBands(map: AnyMap): ReferenceBand[] {
  const raw = map.reference_bands ?? map.referenceBands ?? map.bands ?? map.reference_categories;
  const out: ReferenceBand[] = [];
  if (Array.isArray(raw)) {
    raw.forEach((item, index) => {
      if (item && typeof item === 'object') {
        const band = item as AnyMap;
        const label = readString(band, ['label', 'name', 'band', 'category']) ?? `Band ${index + 1}`;
        const range = readString(band, ['range', 'value', 'text', 'description', 'reference']) ?? '';
        if (range === '' && label === '') return;
        out.push({
          label,
          rangeText: range,
          containsValue: readBool(band, ['contains_value', 'containsValue', 'is_match', 'is_selected', 'matched']),
          explicitlyBorderline: readBool(band, ['is_borderline', 'borderline']),
        });
      } else if (item != null) {
        out.push({ label: `Band ${index + 1}`, rangeText: String(item), containsValue: false, explicitlyBorderline: false });
      }
    });
    return out;
  }
  if (raw && typeof raw === 'object') {
    for (const [key, value] of Object.entries(raw as AnyMap)) {
      if (key.trim() === '') continue;
      out.push({ label: key, rangeText: value == null ? '' : String(value), containsValue: false, explicitlyBorderline: false });
    }
  }
  return out;
}

function parseDemographicRanges(map: AnyMap): DemographicReferenceRange[] {
  const raw =
    map.demographic_ranges ?? map.demographicRanges ?? map.all_ranges ?? map.all_reference_ranges ?? map.printed_ranges;
  const out: DemographicReferenceRange[] = [];
  if (Array.isArray(raw)) {
    raw.forEach((item, index) => {
      if (item && typeof item === 'object') {
        const row = item as AnyMap;
        const label = readString(row, ['label', 'demographic', 'group', 'population', 'name']) ?? `Range ${index + 1}`;
        const rangeText = readString(row, ['range', 'reference', 'reference_range', 'text', 'value']) ?? '';
        if (rangeText === '' && label === '') return;
        out.push({
          label,
          rangeText,
          isUsed: readBool(row, ['is_used', 'used', 'selected', 'applicable']),
          isConfident: readBool(row, ['is_confident', 'confident', 'selection_confident']),
        });
      } else if (item != null) {
        out.push({ label: `Range ${index + 1}`, rangeText: String(item), isUsed: false, isConfident: false });
      }
    });
    return out;
  }
  if (raw && typeof raw === 'object') {
    for (const [key, value] of Object.entries(raw as AnyMap)) {
      if (key.trim() === '') continue;
      out.push({ label: key, rangeText: value == null ? '' : String(value), isUsed: false, isConfident: false });
    }
  }
  return out;
}

function buildReportInfo(payload: AnyMap): string | undefined {
  const parts: string[] = [];
  const date = readString(payload, ['report_date', 'date', 'collected_on']);
  const lab = readString(payload, ['lab_name', 'lab', 'laboratory']);
  if (date) parts.push(date);
  if (lab) parts.push(lab);
  return parts.length ? parts.join(' · ') : undefined;
}

/**
 * Parse the raw simplified-values payload into the grouped, status-resolved
 * shape the Flutter screen renders. `fallbackSubtitle` mirrors the Flutter app
 * defaulting the subtitle to the document filename.
 */
export function parseSimplifiedReport(
  payload: { tests?: unknown } & AnyMap,
  fallbackSubtitle?: string,
): SimplifiedReportData {
  const rawTests = payload.tests ?? payload.results ?? payload.values;
  if (!Array.isArray(rawTests)) {
    return {
      title: readString(payload, ['report_title', 'title']) ?? 'Lab report',
      subtitle: readString(payload, ['report_subtitle', 'report_name']) ?? fallbackSubtitle,
      patientName: readString(payload, ['patient_name', 'patient']),
      reportInfoLine: buildReportInfo(payload),
      sections: [],
    };
  }

  const sections = new Map<string, SimplifiedResult[]>();
  let rowIndex = 0;
  for (const item of rawTests) {
    if (!item || typeof item !== 'object') continue;
    const map = item as AnyMap;

    const testName = readString(map, ['test_name', 'name', 'analyte', 'test']);
    if (!testName) continue;

    const resultText =
      readString(map, ['result', 'value', 'result_value', 'observed_value', 'result_raw']) ?? '—';
    const unit = readString(map, ['unit', 'units']);
    const referenceText = readString(map, [
      'reference_range',
      'ref_range',
      'reference_range_raw',
      'range',
      'printed_reference',
    ]);
    const sectionName = readString(map, ['panel', 'section', 'category', 'group']) ?? 'General';
    const explicitFlag = readString(map, ['normality', 'flag', 'status', 'abnormality', 'lab_flag']);
    const note = readString(map, ['note', 'comment', 'remarks', 'annotation']);
    const referenceBands = parseReferenceBands(map);
    const demographicRanges = parseDemographicRanges(map);
    const usedReferenceDescription = readString(map, [
      'used_reference',
      'used_range',
      'reference_used',
      'selected_reference',
    ]);
    const usedReferenceSelectedConfidently = readBool(map, [
      'used_reference_confident',
      'selected_reference_confident',
      'comparison_confident',
    ]);

    const status = resolveStatus({ explicitFlag, resultText, referenceText, referenceBands });

    if (!sections.has(sectionName)) sections.set(sectionName, []);
    sections.get(sectionName)!.push({
      id: `row_${rowIndex}`,
      sectionName,
      testName,
      result: resultText,
      unit,
      referenceText,
      note,
      status,
      referenceBands,
      demographicRanges,
      usedReferenceDescription,
      usedReferenceSelectedConfidently,
    });
    rowIndex += 1;
  }

  return {
    title: readString(payload, ['report_title', 'title']) ?? 'Lab report',
    subtitle: readString(payload, ['report_subtitle', 'report_name']) ?? fallbackSubtitle,
    patientName: readString(payload, ['patient_name', 'patient']),
    reportInfoLine: buildReportInfo(payload),
    sections: Array.from(sections.entries()).map(([name, results]) => ({
      id: slugify(name),
      name,
      results,
    })),
  };
}

// ---------------------------------------------------------------------------
// Summary counts (mirror SimplifiedReportData getters)
// ---------------------------------------------------------------------------

export interface SimplifiedSummary {
  total: number;
  within: number;
  outside: number;
  noComparison: number;
}

export function summarize(data: SimplifiedReportData): SimplifiedSummary {
  let total = 0;
  let within = 0;
  let outside = 0;
  let noComparison = 0;
  for (const section of data.sections) {
    for (const r of section.results) {
      total += 1;
      if (r.status.type === 'withinLabRange') within += 1;
      if (isOutsideLabRange(r.status)) outside += 1;
      if (r.status.type === 'noComparisonAvailable') noComparison += 1;
    }
  }
  return { total, within, outside, noComparison };
}

/** Pill styling matching AarogyaFace SimplifiedStatusPill (same hex colors). */
export function pillStyle(type: ResultStatusType): { prefix: string; bg: string; fg: string } {
  switch (type) {
    case 'withinLabRange':
      return { prefix: '✓', bg: '#E8FAF0', fg: '#148C4D' };
    case 'high':
      return { prefix: '↑', bg: '#FFEDF0', fg: '#C71F29' };
    case 'low':
      return { prefix: '↓', bg: '#FFEDF0', fg: '#C71F29' };
    case 'partlyOutsideLabRange':
    case 'outsideLabRange':
      return { prefix: '!', bg: '#FFEDF0', fg: '#C71F29' };
    case 'borderline':
    case 'labBand':
      return { prefix: '•', bg: '#FFF7E0', fg: '#B86E05' };
    case 'noComparisonAvailable':
      return { prefix: '', bg: '#F0F2F7', fg: '#616E80' };
  }
}

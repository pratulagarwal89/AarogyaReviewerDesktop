import { describe, expect, it } from 'vitest';
import { diffRows, normalizeTests, summarizeDiff } from './diffRows';

describe('diffRows', () => {
  const primary = normalizeTests({
    tests: [
      { source_row_id: 'a', name: 'TSH', value: '2.1', unit: 'uIU/mL', reference_range: '0.4-4.0' },
      { source_row_id: 'b', name: 'Interpretation', value: 'See note', unit: '', reference_range: '' },
    ],
  });
  const proposal = normalizeTests({
    tests: [
      { source_row_id: 'a', name: 'TSH', value: '2.1', unit: 'uIU/mL', reference_range: '0.4-4.0' },
    ],
  });

  it('normalizes flexible field names and lineage ids', () => {
    expect(primary[0]).toMatchObject({ sourceRowId: 'a', testName: 'TSH', value: '2.1' });
    const alt = normalizeTests([{ analyte: 'HDL', reported_value: '50', units: 'mg/dL', ref_range: '>40' }]);
    expect(alt[0]).toMatchObject({ testName: 'HDL', value: '50', unit: 'mg/dL', referenceRange: '>40' });
  });

  it('marks a dropped row removed and keeps the retained row unchanged', () => {
    const rows = diffRows(primary, proposal);
    const byId = Object.fromEntries(rows.map((r) => [r.current?.sourceRowId ?? r.proposed?.sourceRowId, r.status]));
    expect(byId.a).toBe('unchanged');
    expect(byId.b).toBe('removed');
    expect(summarizeDiff(rows)).toMatchObject({ removed: 1, unchanged: 1, added: 0, changed: 0 });
  });

  it('detects value changes and additions', () => {
    const changed = normalizeTests({
      tests: [{ source_row_id: 'a', name: 'TSH', value: '9.9', unit: 'uIU/mL', reference_range: '0.4-4.0' }],
    });
    const added = normalizeTests({
      tests: [
        { source_row_id: 'a', name: 'TSH', value: '2.1', unit: 'uIU/mL', reference_range: '0.4-4.0' },
        { source_row_id: 'c', name: 'T3', value: '1.0', unit: 'ng/mL', reference_range: '' },
      ],
    });
    expect(summarizeDiff(diffRows(primary.slice(0, 1), changed))).toMatchObject({ changed: 1 });
    expect(summarizeDiff(diffRows(primary.slice(0, 1), added))).toMatchObject({ added: 1, unchanged: 1 });
  });
});

// Shared fixtures for verification-dashboard tests. IDs are stable so tests can
// assert against them and MSW handlers can key off the case/report/version ids.

import type {
  CaseDetail,
  DashboardSummary,
  PendingPrimaryReport,
  ReportVersionsResponse,
  VerificationCaseRow,
} from '../api/verification';

export const REPORT_ID = '11111111-1111-1111-1111-111111111111';
export const CASE_ID = '22222222-2222-2222-2222-222222222222';
export const PRIMARY_VERSION_ID = '33333333-3333-3333-3333-333333333333';
export const PROPOSAL_VERSION_ID = '44444444-4444-4444-4444-444444444444';
export const PROFILE_ID = '55555555-5555-5555-5555-555555555555';
export const DOCUMENT_ID = '66666666-6666-6666-6666-666666666666';

export const summary: DashboardSummary = {
  proposals_ready: 3,
  mixed_or_uncertain: 2,
  failed: 1,
  queued_or_running: 4,
  superseded: 1,
  resolved_recent: 5,
  pending_primary_reports: 2,
  oldest_open_created_at: '2026-07-20T09:00:00Z',
};

export const caseRow: VerificationCaseRow = {
  case_id: CASE_ID,
  lab_report_id: REPORT_ID,
  document_id: DOCUMENT_ID,
  profile_id: PROFILE_ID,
  profile_name: 'Asha Verma',
  filename: 'thyroid_panel.pdf',
  page_index: 0,
  category: 'interpretation_matrix',
  gate_reasons: ['interpretation_matrix'],
  verification_status: 'succeeded',
  review_status: 'pending',
  resolution: null,
  page_verdict: 'partial',
  proposed_version_id: PROPOSAL_VERSION_ID,
  has_proposal: true,
  is_superseded: false,
  masked_image_available: true,
  created_at: '2026-07-21T09:00:00Z',
  updated_at: '2026-07-21T10:00:00Z',
  latest_run_model: 'gpt-4o',
  latest_run_status: 'succeeded',
  latest_cost: 0.012,
  latest_latency: 3400,
};

export const caseRow2: VerificationCaseRow = {
  ...caseRow,
  case_id: '2222aaaa-2222-2222-2222-222222222222',
  category: 'threshold_target',
  gate_reasons: ['threshold_target'],
  proposed_version_id: null,
  has_proposal: false,
  masked_image_available: false,
  verification_status: 'failed',
  page_verdict: null,
  filename: 'lipid.pdf',
  profile_name: 'Ravi Kumar',
  created_at: '2026-07-19T09:00:00Z',
};

export const caseDetail: CaseDetail = {
  case: {
    id: CASE_ID,
    lab_report_id: REPORT_ID,
    document_id: DOCUMENT_ID,
    page_index: 0,
    basis_primary_version_id: PRIMARY_VERSION_ID,
    category: 'interpretation_matrix',
    gate_version: 'v1',
    gate_signals: { interpretation_matrix: 0.8 },
    gate_reasons: ['interpretation_matrix'],
    exemptions_applied: [],
    candidate_source_row_ids: ['row-a', 'row-b'],
    masked_image_ref: 'masked-crops/doc/v/p0-mask-v1.jpg',
    mask_version: 'mask-v1',
    verification_status: 'succeeded',
    review_status: 'pending',
    resolution: null,
    resolved_by: null,
    resolved_at: null,
    current_recommendation: { page_verdict: 'partial', dropped_row_ids: ['row-b'] },
    proposed_version_id: PROPOSAL_VERSION_ID,
    created_at: '2026-07-21T09:00:00Z',
    updated_at: '2026-07-21T10:00:00Z',
  },
  runs: [
    {
      id: 'run-1',
      attempt: 1,
      model: 'gpt-4o',
      status: 'succeeded',
      page_verdict: 'partial',
      row_decisions: [{ source_row_id: 'row-b', decision: 'drop', reason: 'legend row' }],
      input_tokens: 900,
      output_tokens: 120,
      cost_usd: 0.012,
      latency_ms: 3400,
      created_at: '2026-07-21T09:30:00Z',
    },
  ],
  proposed_version: {
    id: PROPOSAL_VERSION_ID,
    version_number: 2,
    kind: 'verifier_filtered',
    metadata: { dropped_rows: 1 },
    created_at: '2026-07-21T09:31:00Z',
  },
  publication_state: {
    active_version_id: PRIMARY_VERSION_ID,
    publication_revision: 1,
    pending_primary_version_id: null,
  },
  masked_image_available: true,
};

// Two versions: active primary (v1) with 2 rows; verifier_filtered proposal (v2)
// which drops row-b. diff should show row-b as removed.
export const primaryPayload = {
  tests: [
    { source_row_id: 'row-a', name: 'TSH', value: '2.1', unit: 'uIU/mL', reference_range: '0.4-4.0' },
    { source_row_id: 'row-b', name: 'Interpretation', value: 'See note', unit: '', reference_range: '' },
  ],
};

export const proposalPayload = {
  tests: [
    { source_row_id: 'row-a', name: 'TSH', value: '2.1', unit: 'uIU/mL', reference_range: '0.4-4.0' },
  ],
};

export const reportVersions: ReportVersionsResponse = {
  lab_report_id: REPORT_ID,
  active_version_id: PRIMARY_VERSION_ID,
  publication_revision: 1,
  pending_primary_version_id: null,
  versions: [
    {
      id: PROPOSAL_VERSION_ID,
      version_number: 2,
      kind: 'verifier_filtered',
      basis_version_id: PRIMARY_VERSION_ID,
      basis_primary_version_id: PRIMARY_VERSION_ID,
      actor_type: 'agent',
      actor_email: null,
      metadata: { dropped_rows: 1 },
      created_at: '2026-07-21T09:31:00Z',
      is_active: false,
      is_pending_primary: false,
    },
    {
      id: PRIMARY_VERSION_ID,
      version_number: 1,
      kind: 'primary',
      basis_version_id: null,
      basis_primary_version_id: null,
      actor_type: 'system',
      actor_email: null,
      metadata: {},
      created_at: '2026-07-21T09:00:00Z',
      is_active: true,
      is_pending_primary: false,
    },
  ],
  activations: [
    {
      action: 'auto_activate',
      version_id: PRIMARY_VERSION_ID,
      previous_version_id: null,
      publication_revision: 1,
      actor_email: null,
      reason: null,
      created_at: '2026-07-21T09:00:00Z',
    },
  ],
};

export const pendingPrimaryReport: PendingPrimaryReport = {
  report_id: REPORT_ID,
  document_id: DOCUMENT_ID,
  profile_id: PROFILE_ID,
  profile_name: 'Asha Verma',
  filename: 'thyroid_panel.pdf',
  report_date: '2026-07-18',
  active_version_id: PRIMARY_VERSION_ID,
  active_kind: 'primary',
  pending_primary_version_id: '77777777-7777-7777-7777-777777777777',
  pending_primary_created_at: '2026-07-22T09:00:00Z',
  publication_revision: 1,
};

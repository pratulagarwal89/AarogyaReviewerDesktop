// ============================================================================
// Selective-verification audit dashboard client.
//
// All endpoints are read-only except the explicit, reason-required publication
// actions (activate / rollback / resolve / retry). The masked-crop endpoint only
// ever yields the MASKED evidence — there is no path here to the original object.
// ============================================================================

import { getBaseUrl, getJsonAuthHeaders } from './client';

export type VersionKind = 'primary' | 'verifier_filtered' | 'reviewer_corrected';

/**
 * Structured error for verification actions. `code` carries the backend's
 * machine-readable reason so callers can branch without string-matching:
 *  - stale_publication_revision  (+ expected/actual) → reinspect, never auto-retry
 *  - masked_evidence_unavailable → the evidence gate blocked a publish/rollback
 *  - masked_crop_missing / masked_crop_expired → evidence not serveable (404/410)
 *  - stale_case / case_superseded / no_proposal → case can't be activated as-is
 */
export class VerificationApiError extends Error {
  status: number;
  code?: string;
  expected?: number;
  actual?: number;
  constructor(message: string, status: number, body?: Record<string, unknown>) {
    super(message);
    this.name = 'VerificationApiError';
    this.status = status;
    if (body) {
      if (typeof body.code === 'string') this.code = body.code;
      if (typeof body.expected === 'number') this.expected = body.expected;
      if (typeof body.actual === 'number') this.actual = body.actual;
    }
  }
}

async function parseError(res: Response, fallback: string): Promise<VerificationApiError> {
  const text = await res.text().catch(() => '');
  let body: Record<string, unknown> | undefined;
  try {
    body = text ? (JSON.parse(text) as Record<string, unknown>) : undefined;
  } catch {
    body = undefined;
  }
  const msg =
    (body && (typeof body.error === 'string' ? body.error : undefined)) ||
    (text && !body ? `${fallback} (HTTP ${res.status})` : fallback);
  return new VerificationApiError(msg, res.status, body);
}

async function getJson<T>(path: string, fallback: string): Promise<T> {
  const res = await fetch(getBaseUrl() + path, { headers: getJsonAuthHeaders() });
  if (!res.ok) throw await parseError(res, fallback);
  return (await res.json()) as T;
}

async function postJson<T>(path: string, body: unknown, fallback: string): Promise<T> {
  const res = await fetch(getBaseUrl() + path, {
    method: 'POST',
    headers: getJsonAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res, fallback);
  return (await res.json()) as T;
}

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? '?' + s : '';
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DashboardSummary {
  proposals_ready: number;
  mixed_or_uncertain: number;
  failed: number;
  queued_or_running: number;
  superseded: number;
  resolved_recent: number;
  pending_primary_reports: number;
  oldest_open_created_at: string | null;
}

export interface VerificationCaseRow {
  case_id: string;
  lab_report_id: string;
  document_id: string | null;
  profile_id: string | null;
  profile_name: string | null;
  filename: string | null;
  page_index: number;
  category: string;
  gate_reasons: string[] | null;
  verification_status: string;
  review_status: string;
  resolution: string | null;
  page_verdict: string | null;
  proposed_version_id: string | null;
  has_proposal: boolean;
  is_superseded: boolean;
  masked_image_available: boolean;
  created_at: string;
  updated_at: string;
  latest_run_model: string | null;
  latest_run_status: string | null;
  latest_cost: number | null;
  latest_latency: number | null;
}

export interface CaseListResponse {
  count: number;
  limit: number;
  offset: number;
  cases: VerificationCaseRow[];
}

export interface PendingPrimaryReport {
  report_id: string;
  document_id: string | null;
  profile_id: string | null;
  profile_name: string | null;
  filename: string | null;
  report_date: string | null;
  active_version_id: string | null;
  active_kind: VersionKind | null;
  pending_primary_version_id: string | null;
  pending_primary_created_at: string | null;
  publication_revision: number;
}

export interface PendingPrimaryResponse {
  count: number;
  limit: number;
  offset: number;
  reports: PendingPrimaryReport[];
}

export interface VerificationRun {
  id: string;
  attempt: number;
  model: string;
  status: string;
  page_verdict: string | null;
  row_decisions: unknown;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
  latency_ms: number | null;
  created_at: string;
}

export interface CaseDetail {
  case: {
    id: string;
    lab_report_id: string;
    document_id: string | null;
    page_index: number;
    basis_primary_version_id: string;
    category: string;
    gate_version: string;
    gate_signals: unknown;
    gate_reasons: string[] | null;
    exemptions_applied: string[] | null;
    candidate_source_row_ids: string[] | null;
    masked_image_ref: string | null;
    mask_version: string | null;
    verification_status: string;
    review_status: string;
    resolution: string | null;
    resolved_by: string | null;
    resolved_at: string | null;
    current_recommendation: unknown;
    proposed_version_id: string | null;
    created_at: string;
    updated_at: string;
  };
  runs: VerificationRun[];
  proposed_version: {
    id: string;
    version_number: number;
    kind: VersionKind;
    metadata: unknown;
    created_at: string;
  } | null;
  publication_state: {
    active_version_id: string | null;
    publication_revision: number;
    pending_primary_version_id: string | null;
  };
  masked_image_available: boolean;
}

export interface VersionSummary {
  id: string;
  version_number: number;
  kind: VersionKind;
  basis_version_id: string | null;
  basis_primary_version_id: string | null;
  actor_type: string;
  actor_email: string | null;
  metadata: unknown;
  created_at: string;
  is_active: boolean;
  is_pending_primary: boolean;
}

export interface VersionActivation {
  action: string;
  version_id: string;
  previous_version_id: string | null;
  publication_revision: number;
  actor_email: string | null;
  reason: string | null;
  created_at: string;
}

export interface ReportVersionsResponse {
  lab_report_id: string;
  active_version_id: string | null;
  publication_revision: number;
  pending_primary_version_id: string | null;
  versions: VersionSummary[];
  activations: VersionActivation[];
}

export interface VersionPayload {
  lab_report_id: string;
  publication_revision: number;
  version: VersionSummary & { payload: unknown };
}

export interface PublishResult {
  publication_revision: number;
  active_version_id: string;
  idempotent?: boolean;
}

export type MaskedImageResult =
  | { status: 'available'; url: string; expiresInSeconds: number }
  | { status: 'missing' }
  | { status: 'expired' }
  | { status: 'unavailable' }; // object storage down (503)

// ---------------------------------------------------------------------------
// Dashboard reads
// ---------------------------------------------------------------------------

export function getDashboardSummary(): Promise<DashboardSummary> {
  return getJson('/review/verification-dashboard/summary', 'Failed to load dashboard summary');
}

export interface CaseListParams {
  verification_status?: string;
  review_status?: string;
  resolution?: string;
  category?: string;
  has_proposal?: boolean;
  superseded?: boolean;
  q?: string;
  sort?: 'oldest' | 'newest' | 'cost' | 'latency';
  limit?: number;
  offset?: number;
}

export function listVerificationCases(params: CaseListParams = {}): Promise<CaseListResponse> {
  // `oldest` is the backend default; only pass sort when it differs.
  const sort = params.sort && params.sort !== 'oldest' ? params.sort : undefined;
  return getJson(
    '/review/verification-cases' + qs({ ...params, sort }),
    'Failed to load verification cases',
  );
}

export function listPendingPrimaryReports(
  params: { q?: string; limit?: number; offset?: number } = {},
): Promise<PendingPrimaryResponse> {
  return getJson(
    '/review/pending-primary-reports' + qs(params),
    'Failed to load pending-primary reports',
  );
}

export function getVerificationCase(caseId: string): Promise<CaseDetail> {
  return getJson(
    '/review/verification-cases/' + encodeURIComponent(caseId),
    'Failed to load verification case',
  );
}

/**
 * Fetch a short-lived presigned URL to the MASKED crop. Normalizes the
 * evidence-availability contract (200/404/410/503) into a discriminated union.
 * Never falls back to the original document.
 */
export async function getMaskedImage(caseId: string): Promise<MaskedImageResult> {
  const res = await fetch(
    getBaseUrl() + '/review/verification-cases/' + encodeURIComponent(caseId) + '/masked-image',
    { headers: getJsonAuthHeaders() },
  );
  if (res.status === 200) {
    const body = (await res.json()) as { masked_image_url: string; expires_in_seconds: number };
    return {
      status: 'available',
      url: body.masked_image_url,
      expiresInSeconds: body.expires_in_seconds,
    };
  }
  if (res.status === 410) return { status: 'expired' };
  if (res.status === 503) return { status: 'unavailable' };
  // 404 (missing crop or case) — treat as missing evidence.
  return { status: 'missing' };
}

export function getReportVersions(reportId: string): Promise<ReportVersionsResponse> {
  return getJson(
    '/review/lab-reports/' + encodeURIComponent(reportId) + '/versions',
    'Failed to load report versions',
  );
}

export function getReportVersion(reportId: string, versionId: string): Promise<VersionPayload> {
  return getJson(
    '/review/lab-reports/' +
      encodeURIComponent(reportId) +
      '/versions/' +
      encodeURIComponent(versionId),
    'Failed to load version',
  );
}

// ---------------------------------------------------------------------------
// Explicit, reason-required publication actions
// ---------------------------------------------------------------------------

export function activateVersion(
  reportId: string,
  versionId: string,
  expectedPublicationRevision: number,
  reason: string,
): Promise<PublishResult> {
  return postJson(
    '/review/lab-reports/' +
      encodeURIComponent(reportId) +
      '/versions/' +
      encodeURIComponent(versionId) +
      '/activate',
    { expected_publication_revision: expectedPublicationRevision, reason },
    'Failed to activate version',
  );
}

export function rollbackVersion(
  reportId: string,
  targetVersionId: string,
  expectedPublicationRevision: number,
  reason: string,
): Promise<PublishResult> {
  return postJson(
    '/review/lab-reports/' + encodeURIComponent(reportId) + '/rollback',
    {
      target_version_id: targetVersionId,
      expected_publication_revision: expectedPublicationRevision,
      reason,
    },
    'Failed to roll back version',
  );
}

export type ResolveAction = 'keep_as_is' | 'dismiss' | 'activate_proposal';

export interface ResolveResult {
  case_id: string;
  review_status?: string;
  resolution?: string;
  publication_revision?: number;
  active_version_id?: string;
}

export function resolveCase(
  caseId: string,
  action: ResolveAction,
  reason: string,
  expectedPublicationRevision?: number,
): Promise<ResolveResult> {
  const body: Record<string, unknown> = { action, reason };
  if (action === 'activate_proposal') {
    body.expected_publication_revision = expectedPublicationRevision;
  }
  return postJson(
    '/review/verification-cases/' + encodeURIComponent(caseId) + '/resolve',
    body,
    'Failed to resolve case',
  );
}

export function retryCase(
  caseId: string,
  reason: string,
): Promise<{ case_id: string; verification_status: string; enqueued: boolean }> {
  return postJson(
    '/review/verification-cases/' + encodeURIComponent(caseId) + '/retry',
    { reason },
    'Failed to retry verification',
  );
}

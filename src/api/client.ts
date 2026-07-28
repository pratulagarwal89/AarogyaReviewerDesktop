const API_BASE_URL_KEY = 'api_base_url';
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

function getBaseUrl(): string {
  return localStorage.getItem(API_BASE_URL_KEY) || 'http://localhost:8080';
}

export interface AuthResponse {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface DocumentListItem {
  id: string;
  filename: string;
  patient_name?: string;
  dob?: string;
  document_type?: string;
  status: string;
  s3_url?: string;
  created_at: string;
  updated_at: string;
  doc_confidence_scores?: {
    text_min?: number;
    text_avg?: number;
    table_min?: number;
    table_avg?: number;
  };
}

export interface LabelValuePair {
  label: string;
  value: string;
  confidence?: number;
  page?: number;
}

export interface DocumentDetail {
  id: string;
  filename: string;
  patient_name?: string;
  dob?: string;
  document_type?: string;
  status: string;
  s3_url?: string;
  file_path?: string;
  profile_id?: string;
  plain_text_searchable?: string;
  label_value_pairs?: LabelValuePair[];
  structured_tables?: unknown[];
  text_paragraphs?: unknown[];
  pdf_table_presence?: unknown[];
  raw_ocr_with_layout?: unknown;
  doc_confidence_scores?: Record<string, unknown>;
  lab_report_id?: string;
  lab_name?: string;
  lab_report_date?: string;
  lab_report_status?: string;
  lab_summary?: string;
  extracted_values?: Record<string, unknown>;
  abnormal_details?: Record<string, unknown>;
  /** Present once the backend adds verified_by/verified_at columns + /verify endpoint. */
  verified_by?: string | null;
  verified_at?: string | null;
  created_at: string;
  updated_at: string;
}

/** Patient history JSON from patient_history table (rebuild_patient_history) */
export interface PatientHistoryData {
  patient?: { name?: string; gender?: string };
  history_or_comorbidity?: Record<string, unknown> | unknown[];
  major_medical_events?: Record<string, unknown> | unknown[];
  lifestyle?: Record<string, unknown> | unknown[];
  current_medication?: unknown[];
  vitals?: Record<string, unknown>;
  recent_lab?: Array<{
    report_id?: string;
    report_date?: string;
    parameter?: string;
    value?: unknown;
    unit?: string;
    magnitude?: string;
    direction?: string;
  }>;
}

export interface ReviewProfileSummary {
  id: string;
  name: string;
  dob?: string;
  gender?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewUserIntakeForm {
  comorbidity?: Record<string, unknown> | unknown[];
  major_events?: Record<string, unknown> | unknown[];
  lifestyle?: Record<string, unknown> | unknown[];
}

export interface ReviewLabReport {
  id: string;
  profile_id: string;
  lab_name?: string;
  report_date?: string;
  extracted_values?: Record<string, unknown> | unknown;
  abnormal_details?: Record<string, unknown> | unknown;
  summary?: string;
  pdf_url?: string;
  document_source?: string;
  status: string;
  document_filename?: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewBundle {
  profile: ReviewProfileSummary;
  user_intake_form: ReviewUserIntakeForm;
  patient_history: PatientHistoryData | Record<string, unknown> | unknown;
  lab_reports: ReviewLabReport[]; // Cleared client-side for intake-only review; lab tab uses empty list until re-enabled.
  documents: DocumentListItem[];
}

export interface ReviewProfileListItem {
  id: string;
  name: string;
  dob?: string;
  gender?: string;
  document_count: number;
  lab_report_count: number;
  updated_at: string;
}

function getJsonAuthHeaders(): HeadersInit {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  return token ? { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

function getDocumentAuthHeaders(): HeadersInit {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  return token ? { Authorization: 'Bearer ' + token, Accept: 'application/pdf' } : { Accept: 'application/pdf' };
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(getBaseUrl() + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Login failed');
  return res.json();
}

export async function listDocuments(params: { limit?: number; offset?: number; status?: string; q?: string } = {}): Promise<{ items: DocumentListItem[]; count: number }> {
  const url = new URL(getBaseUrl() + '/review/documents');
  if (params.limit) url.searchParams.set('limit', String(params.limit));
  if (params.offset) url.searchParams.set('offset', String(params.offset));
  if (params.status) url.searchParams.set('status', params.status);
  if (params.q) url.searchParams.set('q', params.q);
  const res = await fetch(url.toString(), { headers: getJsonAuthHeaders() });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch documents');
  return res.json();
}

export async function getDocument(id: string, includeRaw = false): Promise<DocumentDetail> {
  const url = new URL(getBaseUrl() + '/review/documents/' + id);
  if (includeRaw) url.searchParams.set('include_raw_ocr', 'true');
  const res = await fetch(url.toString(), { headers: getJsonAuthHeaders() });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch document');
  return res.json();
}

export function getDocumentPdfIframeUrl(id: string): string {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  return getBaseUrl() + '/review/documents/' + id + '/pdf' + (token ? '?token=' + token : '');
}

/** @deprecated Use getDocumentPdfIframeUrl for URL-based fallback preview. */
export const getDocumentPdfUrl = getDocumentPdfIframeUrl;

/** Fetch PDF bytes with auth (for use with react-pdf when URL + query token fails e.g. CORS/redirects). */
export async function fetchDocumentPdf(id: string): Promise<Blob> {
  const res = await fetch(getBaseUrl() + '/review/documents/' + id + '/pdf', {
    headers: getDocumentAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Failed to load PDF');
  }
  return res.blob();
}

export async function getPatientHistory(profileId: string): Promise<{ history: PatientHistoryData }> {
  const res = await fetch(getBaseUrl() + '/patient-history/' + profileId, { headers: getJsonAuthHeaders() });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch patient history');
  return res.json();
}

export async function getReviewBundle(profileId: string): Promise<ReviewBundle> {
  const res = await fetch(getBaseUrl() + '/review/profiles/' + profileId + '/review-bundle', { headers: getJsonAuthHeaders() });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch profile review bundle');
  return res.json();
}

export async function listReviewProfiles(params: { q?: string } = {}): Promise<{ items: ReviewProfileListItem[]; count: number }> {
  const url = new URL(getBaseUrl() + '/review/profiles');
  if (params.q) url.searchParams.set('q', params.q);
  const res = await fetch(url.toString(), { headers: getJsonAuthHeaders() });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch profiles');
  return res.json();
}

// ============================================================================
// Admin review API (Users → Profiles → Reports → Report Review)
// ============================================================================

/**
 * Extract a useful error message from a non-OK fetch response, tolerating
 * non-JSON bodies (e.g. Gin's `404 page not found` plain text when the
 * backend hasn't been restarted with new routes).
 */
async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  const text = await res.text().catch(() => '');
  if (text) {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object' && typeof (parsed as { error?: unknown }).error === 'string') {
        return (parsed as { error: string }).error;
      }
    } catch {
      // Body isn't JSON — fall through and use the raw text.
    }
    const snippet = text.length > 200 ? text.slice(0, 200) + '…' : text;
    return `${fallback} (HTTP ${res.status}: ${snippet})`;
  }
  return `${fallback} (HTTP ${res.status})`;
}

export interface AdminUserListItem {
  id: string;
  name?: string | null;
  email: string;
  is_active: boolean;
  created_at: string;
  profile_count: number;
  document_count: number;
  lab_report_count: number;
  issue_count: number;
  last_upload_at?: string | null;
}

export interface AdminUserProfileItem {
  id: string;
  user_id: string;
  name: string;
  dob?: string | null;
  gender?: string | null;
  is_default: boolean;
  document_count: number;
  issue_count: number;
  last_upload_at?: string | null;
}

export interface AdminUserDetail {
  user: AdminUserListItem;
  profiles: AdminUserProfileItem[];
}

export async function listAdminUsers(params: { q?: string } = {}): Promise<{ items: AdminUserListItem[]; count: number }> {
  const url = new URL(getBaseUrl() + '/review/users');
  if (params.q) url.searchParams.set('q', params.q);
  const res = await fetch(url.toString(), { headers: getJsonAuthHeaders() });
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Failed to fetch users'));
  return res.json();
}

export async function getAdminUser(userId: string): Promise<AdminUserDetail> {
  const res = await fetch(getBaseUrl() + '/review/users/' + userId, { headers: getJsonAuthHeaders() });
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Failed to fetch user'));
  return res.json();
}

/**
 * Update document_intake fields.
 *
 * TODO(backend): there is no PATCH /review/documents/:id endpoint in
 * AarogyaSoul today. Until that endpoint exists, this function throws so the
 * UI cannot silently fake a successful save. When wiring the endpoint, accept
 * a partial body of: { document_type?, patient_name?, dob?, status?, lab_name?,
 * report_date? } and return the updated row.
 */
export async function updateDocumentIntake(
  documentId: string,
  patch: Partial<{
    document_type: string;
    patient_name: string;
    dob: string;
    status: string;
    lab_name: string;
    report_date: string;
  }>,
): Promise<DocumentDetail> {
  void documentId;
  void patch;
  throw new Error(
    'updateDocumentIntake is not yet wired — backend endpoint PATCH /review/documents/:id is missing. Track the missing endpoint and remove this stub once it exists.',
  );
}

function getReprocessBaseUrl(): string {
  const raw = import.meta.env.VITE_REPROCESS_API_URL;
  if (raw === '') {
    return '';
  }
  if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
    return String(raw).replace(/\/$/, '');
  }
  return 'http://localhost:8000';
}

export type ReprocessScope = 'full' | 'reuse_ocr' | 'stages';
export type ReprocessStage = 'patient_name' | 'profile_id' | 'document_type' | 'lab_values';

export interface ReprocessRequest {
  scope: ReprocessScope;
  stages?: ReprocessStage[];
  overwrite?: boolean;
  async?: boolean;
}

export interface ReprocessStageOutcome {
  stage: string;
  status: 'succeeded' | 'failed' | 'skipped' | 'updated' | string;
  action?: string;
  duration_ms?: number;
  changed_fields?: string[];
  error?: string | null;
  detail?: string | null;
  reason?: string | null;
}

export interface ReprocessLabValuesOutcome {
  stage: 'lab_values';
  status: 'updated' | 'skipped' | 'failed' | string;
  lab_report_id?: string;
  tests_count?: number;
  reason?: string;
  error?: string;
}

export interface ReprocessDriftWarning {
  kind: 'document_type_drift' | 'profile_id_drift' | string;
  before?: string;
  after?: string;
  lab_report_id?: string;
  prescription_id?: string;
}

export interface ReprocessRun {
  id: string;
  document_id: string;
  requested_by?: string | null;
  requested_by_email?: string | null;
  scope: ReprocessScope;
  requested_stages?: string[] | null;
  options?: Record<string, unknown> | null;
  status: 'running' | 'succeeded' | 'failed' | 'partial';
  failed_stage?: string | null;
  error?: string | null;
  outcomes?: {
    stages?: ReprocessStageOutcome[];
    lab_values?: ReprocessLabValuesOutcome | null;
  } | null;
  drift_warnings?: ReprocessDriftWarning[] | null;
  started_at?: string | null;
  finished_at?: string | null;
  created_at?: string | null;
}

export interface ReprocessQueuedResponse {
  run_id: string;
  status: string;
  scope: ReprocessScope;
  stages?: ReprocessStage[];
  overwrite?: boolean;
}

/**
 * Queue a reviewer-initiated reprocess job for a document.
 *
 * Calls the AarogyaAI Flask service (`/review/documents/:id/reprocess`),
 * which validates the same JWT issued by AarogyaSoul and enforces the
 * `REVIEWER_EMAIL_ALLOWLIST`. Returns the persisted run id; poll
 * `getReprocessRun` for completion/outcomes.
 */
export async function reprocessReport(
  documentId: string,
  payload: ReprocessRequest,
): Promise<ReprocessQueuedResponse> {
  const base = getReprocessBaseUrl();
  const url = base === '' ? `/review/documents/${documentId}/reprocess` : `${base}/review/documents/${documentId}/reprocess`;
  const body: Record<string, unknown> = {
    scope: payload.scope,
    overwrite: payload.overwrite ?? false,
    async: payload.async ?? true,
  };
  if (payload.scope === 'stages' && payload.stages?.length) {
    body.stages = payload.stages;
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: getJsonAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, 'Failed to reprocess document'));
  }
  return res.json();
}

/** Legacy convenience helper — kept so existing call sites that pass a boolean still work. */
export async function reprocessDocumentRecord(
  documentId: string,
  runOcr = false,
): Promise<ReprocessQueuedResponse> {
  return reprocessReport(documentId, { scope: runOcr ? 'full' : 'reuse_ocr', async: true });
}

export async function listReprocessRuns(
  documentId: string,
  limit = 20,
): Promise<{ items: ReprocessRun[]; count: number }> {
  const base = getReprocessBaseUrl();
  const path = `/review/documents/${documentId}/reprocess-runs?limit=${limit}`;
  const url = base === '' ? path : `${base}${path}`;
  const res = await fetch(url, { headers: getJsonAuthHeaders() });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, 'Failed to list reprocess runs'));
  }
  return res.json();
}

export async function getReprocessRun(documentId: string, runId: string): Promise<ReprocessRun> {
  const base = getReprocessBaseUrl();
  const path = `/review/documents/${documentId}/reprocess-runs/${runId}`;
  const url = base === '' ? path : `${base}${path}`;
  const res = await fetch(url, { headers: getJsonAuthHeaders() });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, 'Failed to fetch reprocess run'));
  }
  return res.json();
}

/**
 * Mark a document as verified.
 *
 * TODO(backend): no verify endpoint exists, and document_intake has no
 * verified_by/verified_at columns. When adding the endpoint:
 *   - migration: ALTER TABLE document_intake
 *       ADD COLUMN verified_by UUID REFERENCES users(id),
 *       ADD COLUMN verified_at TIMESTAMP WITH TIME ZONE;
 *   - endpoint: POST /review/documents/:id/verify — sets verified_by to the
 *     authenticated reviewer's user_id and verified_at to NOW(); returns the
 *     row. The status badge logic in src/app/utils/reportStatus.ts already
 *     reads these fields.
 */
export async function verifyReport(documentId: string): Promise<{ verified_at: string; verified_by: string }> {
  void documentId;
  throw new Error(
    'verifyReport is not yet wired — backend endpoint POST /review/documents/:id/verify and verified_by/verified_at columns are missing.',
  );
}

/**
 * The exact payload the Flutter simplified lab screen consumes
 * (`GET /imported-files/:id/simplified-values`). `tests` is present only when a
 * lab_report exists for this document with status='Processed' and non-empty
 * extracted_values; otherwise `available` is false and `tests` is empty. The
 * document id here is the same document_intake id used by the reviewer
 * endpoints, so both lenses key off one id.
 */
export interface SimplifiedValuesResponse {
  available: boolean;
  tests: Array<Record<string, unknown>>;
  source: string;
}

export async function getSimplifiedValues(documentId: string): Promise<SimplifiedValuesResponse> {
  const res = await fetch(getBaseUrl() + '/imported-files/' + documentId + '/simplified-values', {
    headers: getJsonAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, 'Failed to fetch simplified values'));
  }
  const data = (await res.json()) as Partial<SimplifiedValuesResponse>;
  return {
    available: Boolean(data.available),
    tests: Array.isArray(data.tests) ? data.tests : [],
    source: typeof data.source === 'string' ? data.source : 'none',
  };
}

export function setApiBaseUrl(url: string) {
  localStorage.setItem(API_BASE_URL_KEY, url);
}

export function getApiBaseUrl(): string {
  return localStorage.getItem(API_BASE_URL_KEY) || 'http://localhost:8080';
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return !!localStorage.getItem(ACCESS_TOKEN_KEY);
}

/** OpenAI-style turns for lab Q&A (no system role). */
export interface LabQueryChatMessage {
  role: "user" | "assistant";
  content: string;
}

function getLabQueryChatBaseUrl(): string {
  const raw = import.meta.env.VITE_LAB_QUERY_API_URL;
  if (raw === "") {
    return "";
  }
  if (raw !== undefined && raw !== null && String(raw).trim() !== "") {
    return String(raw).replace(/\/$/, "");
  }
  return "http://localhost:8000";
}

/**
 * Calls the AarogyaAI Flask service (lab_query_chat + resolver).
 * Run: `python server.py` in AarogyaAI (default port 8000), with OPENAI_API_KEY and DB env set.
 */
export async function postLabQueryChat(body: {
  messages: LabQueryChatMessage[];
  report_ids: string[];
}): Promise<{ reply: string }> {
  const base = getLabQueryChatBaseUrl();
  const url = base === "" ? "/lab-query/chat" : `${base}/lab-query/chat`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Lab chat failed (${res.status})`);
  }
  if (typeof data.reply !== "string") {
    throw new Error("Lab chat returned an invalid response");
  }
  return { reply: data.reply };
}

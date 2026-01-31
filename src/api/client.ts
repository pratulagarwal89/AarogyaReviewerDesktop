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
  plain_text_searchable?: string;
  label_value_pairs?: LabelValuePair[];
  structured_tables?: any[];
  text_paragraphs?: any[];
  pdf_table_presence?: any[];
  raw_ocr_with_layout?: any;
  doc_confidence_scores?: any;
  created_at: string;
  updated_at: string;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  return token ? { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
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
  const res = await fetch(url.toString(), { headers: getAuthHeaders() });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch documents');
  return res.json();
}

export async function getDocument(id: string, includeRaw = false): Promise<DocumentDetail> {
  const url = new URL(getBaseUrl() + '/review/documents/' + id);
  if (includeRaw) url.searchParams.set('include_raw_ocr', 'true');
  const res = await fetch(url.toString(), { headers: getAuthHeaders() });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch document');
  return res.json();
}

export function getDocumentPdfUrl(id: string): string {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  return getBaseUrl() + '/review/documents/' + id + '/pdf' + (token ? '?token=' + token : '');
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

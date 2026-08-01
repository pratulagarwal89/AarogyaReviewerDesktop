// MSW server + default happy-path handlers for the verification dashboard.
// Individual tests override handlers with server.use(...) to exercise error
// paths (stale CAS, evidence gate, 410 expired crop, empty states, ...).

import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import {
  CASE_ID,
  PRIMARY_VERSION_ID,
  PROPOSAL_VERSION_ID,
  REPORT_ID,
  caseDetail,
  caseRow,
  caseRow2,
  pendingPrimaryReport,
  primaryPayload,
  proposalPayload,
  reportVersions,
  summary,
} from './fixtures';

const BASE = 'http://soul.test';

export const handlers = [
  http.get(BASE + '/review/verification-dashboard/summary', () => HttpResponse.json(summary)),

  http.get(BASE + '/review/verification-cases', ({ request }) => {
    const url = new URL(request.url);
    let cases = [caseRow, caseRow2];
    const hp = url.searchParams.get('has_proposal');
    if (hp === 'true') cases = cases.filter((c) => c.has_proposal);
    if (hp === 'false') cases = cases.filter((c) => !c.has_proposal);
    const vs = url.searchParams.get('verification_status');
    if (vs) cases = cases.filter((c) => c.verification_status === vs);
    return HttpResponse.json({ count: cases.length, limit: 50, offset: 0, cases });
  }),

  http.get(BASE + '/review/pending-primary-reports', () =>
    HttpResponse.json({ count: 1, limit: 50, offset: 0, reports: [pendingPrimaryReport] }),
  ),

  http.get(BASE + '/review/verification-cases/' + CASE_ID, () => HttpResponse.json(caseDetail)),

  http.get(BASE + '/review/verification-cases/' + CASE_ID + '/masked-image', () =>
    HttpResponse.json({
      masked_image_url: 'https://s3.test/masked-crops/doc/v/p0-mask-v1.jpg?sig=abc',
      expires_in_seconds: 300,
    }),
  ),

  http.get(BASE + '/review/lab-reports/' + REPORT_ID + '/versions', () =>
    HttpResponse.json(reportVersions),
  ),

  http.get(BASE + '/review/lab-reports/' + REPORT_ID + '/versions/:versionId', ({ params }) => {
    const vid = params.versionId as string;
    const isPrimary = vid === PRIMARY_VERSION_ID;
    const summaryV = reportVersions.versions.find((v) => v.id === vid);
    return HttpResponse.json({
      lab_report_id: REPORT_ID,
      publication_revision: 1,
      version: { ...summaryV, payload: isPrimary ? primaryPayload : proposalPayload },
    });
  }),

  http.post(
    BASE + '/review/lab-reports/' + REPORT_ID + '/versions/' + PROPOSAL_VERSION_ID + '/activate',
    async ({ request }) => {
      const body = (await request.json()) as { expected_publication_revision: number };
      if (body.expected_publication_revision !== 1) {
        return HttpResponse.json(
          { code: 'stale_publication_revision', expected: body.expected_publication_revision, actual: 1 },
          { status: 409 },
        );
      }
      return HttpResponse.json({ publication_revision: 2, active_version_id: PROPOSAL_VERSION_ID });
    },
  ),

  http.post(BASE + '/review/lab-reports/' + REPORT_ID + '/rollback', async ({ request }) => {
    const body = (await request.json()) as { target_version_id: string };
    return HttpResponse.json({ publication_revision: 3, active_version_id: body.target_version_id });
  }),

  http.post(BASE + '/review/verification-cases/' + CASE_ID + '/resolve', async ({ request }) => {
    const body = (await request.json()) as { action: string };
    if (body.action === 'activate_proposal') {
      return HttpResponse.json({
        case_id: CASE_ID,
        review_status: 'resolved',
        resolution: 'activated',
        publication_revision: 2,
        active_version_id: PROPOSAL_VERSION_ID,
      });
    }
    return HttpResponse.json({
      case_id: CASE_ID,
      review_status: 'resolved',
      resolution: body.action === 'dismiss' ? 'dismissed' : 'kept_as_is',
    });
  }),

  http.post(BASE + '/review/verification-cases/' + CASE_ID + '/retry', () =>
    HttpResponse.json({ case_id: CASE_ID, verification_status: 'queued', enqueued: true }),
  ),
];

export const server = setupServer(...handlers);
export { http, HttpResponse };

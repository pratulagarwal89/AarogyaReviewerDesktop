import { describe, expect, it } from 'vitest';
import { http, HttpResponse, server } from '../test/msw';
import { CASE_ID, PROPOSAL_VERSION_ID, REPORT_ID } from '../test/fixtures';
import {
  VerificationApiError,
  activateVersion,
  getDashboardSummary,
  getMaskedImage,
  listVerificationCases,
  resolveCase,
} from './verification';

const BASE = 'http://soul.test';

describe('verification client', () => {
  it('loads the dashboard summary', async () => {
    const s = await getDashboardSummary();
    expect(s.proposals_ready).toBe(3);
    expect(s.pending_primary_reports).toBe(2);
  });

  it('filters the case list by has_proposal', async () => {
    const withProposal = await listVerificationCases({ has_proposal: true });
    expect(withProposal.cases.every((c) => c.has_proposal)).toBe(true);
    const without = await listVerificationCases({ has_proposal: false });
    expect(without.cases.every((c) => !c.has_proposal)).toBe(true);
  });

  it('omits the default oldest sort but forwards others', async () => {
    let seen = '';
    server.use(
      http.get(BASE + '/review/verification-cases', ({ request }) => {
        seen = new URL(request.url).search;
        return HttpResponse.json({ count: 0, limit: 50, offset: 0, cases: [] });
      }),
    );
    await listVerificationCases({ sort: 'oldest' });
    expect(seen).not.toContain('sort=');
    await listVerificationCases({ sort: 'newest' });
    expect(seen).toContain('sort=newest');
  });

  it('normalizes masked-image 200/404/410', async () => {
    const ok = await getMaskedImage(CASE_ID);
    expect(ok.status).toBe('available');

    server.use(
      http.get(BASE + '/review/verification-cases/' + CASE_ID + '/masked-image', () =>
        HttpResponse.json({ code: 'masked_crop_missing' }, { status: 404 }),
      ),
    );
    expect((await getMaskedImage(CASE_ID)).status).toBe('missing');

    server.use(
      http.get(BASE + '/review/verification-cases/' + CASE_ID + '/masked-image', () =>
        HttpResponse.json({ code: 'masked_crop_expired' }, { status: 410 }),
      ),
    );
    expect((await getMaskedImage(CASE_ID)).status).toBe('expired');
  });

  it('surfaces a stale-CAS 409 as a structured error', async () => {
    try {
      await activateVersion(REPORT_ID, PROPOSAL_VERSION_ID, 99, 'because');
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(VerificationApiError);
      const err = e as VerificationApiError;
      expect(err.status).toBe(409);
      expect(err.code).toBe('stale_publication_revision');
      expect(err.actual).toBe(1);
    }
  });

  it('surfaces the evidence gate 409 on resolve', async () => {
    server.use(
      http.post(BASE + '/review/verification-cases/' + CASE_ID + '/resolve', () =>
        HttpResponse.json(
          { code: 'masked_evidence_unavailable', error: 'blocked' },
          { status: 409 },
        ),
      ),
    );
    await expect(resolveCase(CASE_ID, 'activate_proposal', 'go', 1)).rejects.toMatchObject({
      code: 'masked_evidence_unavailable',
      status: 409,
    });
  });
});

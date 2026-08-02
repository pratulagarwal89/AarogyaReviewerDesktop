import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, server } from '../../test/msw';
import { renderVerificationApp } from '../../test/render';
import {
  CASE_ID,
  PRIMARY_VERSION_ID,
  PROPOSAL_VERSION_ID,
  REPORT_ID,
  caseDetail,
  reportVersions,
} from '../../test/fixtures';

const BASE = 'http://soul.test';
const CASE_URL = '/admin/verification/' + CASE_ID;

describe('VerificationCaseScreen — thin slice', () => {
  it('shows masked evidence and the current-vs-proposed diff (dropped row)', async () => {
    renderVerificationApp(CASE_URL);
    // Masked crop is shown (never the original).
    expect(await screen.findByAltText(/Masked crop/i)).toBeInTheDocument();
    // Diff: the verifier_filtered proposal drops the interpretation row.
    const diff = await screen.findByText('Current vs proposed');
    const section = diff.closest('section')!;
    expect(await within(section).findByText('Interpretation')).toBeInTheDocument();
    expect(within(section).getAllByText('Removed').length).toBeGreaterThan(0);
  });

  it('activates the proposal with a required reason, using the CAS token', async () => {
    let activateBody: Record<string, unknown> | null = null;
    let resolved = false;
    server.use(
      http.get(BASE + '/review/verification-cases/' + CASE_ID, () =>
        HttpResponse.json(
          resolved
            ? { ...caseDetail, case: { ...caseDetail.case, review_status: 'resolved', resolution: 'activated' } }
            : caseDetail,
        ),
      ),
      http.post(BASE + '/review/verification-cases/' + CASE_ID + '/resolve', async ({ request }) => {
        activateBody = (await request.json()) as Record<string, unknown>;
        resolved = true;
        return HttpResponse.json({
          case_id: CASE_ID,
          review_status: 'resolved',
          resolution: 'activated',
          publication_revision: 2,
        });
      }),
    );

    const user = userEvent.setup();
    renderVerificationApp(CASE_URL);

    await user.click(await screen.findByRole('button', { name: /Activate proposal/i }));
    const dialog = await screen.findByRole('dialog', { name: /Activate proposal/i });
    // Confirm is disabled until a reason is entered.
    const confirm = within(dialog).getByRole('button', { name: 'Activate' });
    expect(confirm).toBeDisabled();
    await user.type(within(dialog).getByLabelText(/Reason/i), 'Legend row correctly dropped');
    await user.click(confirm);

    await waitFor(() =>
      expect(activateBody).toMatchObject({
        action: 'activate_proposal',
        expected_publication_revision: 1,
      }),
    );
    expect(await screen.findByText(/Proposal activated/i)).toBeInTheDocument();
    // The reload reflects the resolved state.
    expect(await screen.findByText(/resolved: activated/i)).toBeInTheDocument();
  });

  it('surfaces a stale CAS as a reinspect prompt and does not auto-retry', async () => {
    let resolveCalls = 0;
    server.use(
      http.post(BASE + '/review/verification-cases/' + CASE_ID + '/resolve', () => {
        resolveCalls += 1;
        return HttpResponse.json(
          { code: 'stale_publication_revision', expected: 1, actual: 5 },
          { status: 409 },
        );
      }),
    );
    const user = userEvent.setup();
    renderVerificationApp(CASE_URL);

    await user.click(await screen.findByRole('button', { name: /Activate proposal/i }));
    const dialog = await screen.findByRole('dialog', { name: /Activate proposal/i });
    await user.type(within(dialog).getByLabelText(/Reason/i), 'go');
    await user.click(within(dialog).getByRole('button', { name: 'Activate' }));

    expect(await within(dialog).findByText(/newer publication landed \(now rev 5\)/i)).toBeInTheDocument();
    // No automatic retry of the write.
    expect(resolveCalls).toBe(1);
  });

  it('blocks activation in the UI when masked evidence is unavailable', async () => {
    server.use(
      http.get(BASE + '/review/verification-cases/' + CASE_ID + '/masked-image', () =>
        HttpResponse.json({ code: 'masked_crop_missing' }, { status: 404 }),
      ),
    );
    renderVerificationApp(CASE_URL);
    // Once the authoritative check reports missing, activation is disabled.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Activate proposal/i })).toBeDisabled(),
    );
    expect(screen.getByText(/Activation blocked: masked evidence unavailable/i)).toBeInTheDocument();
    // Rollback to the verifier_filtered proposal is likewise disabled in history.
    const rollbackButtons = screen.getAllByRole('button', { name: /Roll back/i });
    expect(rollbackButtons.some((b) => (b as HTMLButtonElement).disabled)).toBe(true);
  });

  it('allows rollback to the original primary without evidence', async () => {
    // Make the verifier_filtered proposal the active version, so the primary is a
    // rollback target and the primary rollback path is exercised.
    let rollbackBody: Record<string, unknown> | null = null;
    server.use(
      http.get(BASE + '/review/lab-reports/' + REPORT_ID + '/versions', () =>
        HttpResponse.json({
          ...reportVersions,
          active_version_id: PROPOSAL_VERSION_ID,
          publication_revision: 2,
          versions: reportVersions.versions.map((v) => ({
            ...v,
            is_active: v.id === PROPOSAL_VERSION_ID,
          })),
        }),
      ),
      http.post(BASE + '/review/lab-reports/' + REPORT_ID + '/rollback', async ({ request }) => {
        rollbackBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ publication_revision: 3, active_version_id: PRIMARY_VERSION_ID });
      }),
    );
    const user = userEvent.setup();
    renderVerificationApp(CASE_URL);

    // The primary row's rollback button (only non-active version now) is enabled.
    const rollbackButtons = await screen.findAllByRole('button', { name: /Roll back/i });
    const enabled = rollbackButtons.find((b) => !(b as HTMLButtonElement).disabled)!;
    await user.click(enabled);
    const dialog = await screen.findByRole('dialog', { name: /Roll back to primary/i });
    await user.type(within(dialog).getByLabelText(/Reason/i), 'restore original extraction');
    await user.click(within(dialog).getByRole('button', { name: 'Roll back' }));

    await waitFor(() =>
      expect(rollbackBody).toMatchObject({
        target_version_id: PRIMARY_VERSION_ID,
        expected_publication_revision: 1,
      }),
    );
    expect(await screen.findByText(/Rolled back/i)).toBeInTheDocument();
  });
});

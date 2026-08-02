import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, server } from '../../test/msw';
import { renderVerificationApp } from '../../test/render';

const BASE = 'http://soul.test';

describe('VerificationDashboardScreen', () => {
  it('renders summary widgets and the case queue (not every report)', async () => {
    renderVerificationApp('/admin/verification');
    // summary-backed widget
    expect(await screen.findByLabelText('Proposals ready: 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Pending primary reports: 2')).toBeInTheDocument();
    // queue rows come from the cross-report case list, not a report enumeration
    expect(await screen.findByText('Asha Verma')).toBeInTheDocument();
    expect(screen.getByText('Ravi Kumar')).toBeInTheDocument();
  });

  it('drills a widget into a URL-filtered queue', async () => {
    const user = userEvent.setup();
    let lastQuery = '';
    server.use(
      http.get(BASE + '/review/verification-cases', ({ request }) => {
        lastQuery = new URL(request.url).search;
        return HttpResponse.json({ count: 0, limit: 25, offset: 0, cases: [] });
      }),
    );
    renderVerificationApp('/admin/verification');
    await user.click(await screen.findByLabelText('Proposals ready: 3'));
    await waitFor(() => expect(lastQuery).toContain('has_proposal=true'));
    expect(lastQuery).toContain('review_status=pending');
  });

  it('shows an empty state when the queue is empty', async () => {
    server.use(
      http.get(BASE + '/review/verification-cases', () =>
        HttpResponse.json({ count: 0, limit: 25, offset: 0, cases: [] }),
      ),
    );
    renderVerificationApp('/admin/verification');
    expect(await screen.findByText(/No cases match this view/i)).toBeInTheDocument();
    expect(screen.getByText(/verification queue is empty/i)).toBeInTheDocument();
  });

  it('opens the pending-primary drawer', async () => {
    const user = userEvent.setup();
    renderVerificationApp('/admin/verification');
    await user.click(await screen.findByLabelText('Pending primary reports: 2'));
    const dialog = await screen.findByRole('dialog', { name: /pending primary/i });
    expect(within(dialog).getByText('Asha Verma')).toBeInTheDocument();
  });
});

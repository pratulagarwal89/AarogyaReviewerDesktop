/**
 * Finding an imaging record in the reviewer.
 *
 * Graduation sets document_intake.active = FALSE, so once processing finishes
 * the intake row says nothing useful about an imaging document. The list has to
 * read the imaging record itself, or a reviewer sees "Needs Review" on a report
 * that was actually blocked — or a blank row where a transcription exists.
 */
import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse, server } from '../../test/msw';
import ProfileReportsScreen from './ProfileReportsScreen';

const BASE = 'http://soul.test';
const USER_ID = '11111111-aaaa-4444-8888-111111111111';
const PROFILE_ID = '22222222-aaaa-4444-8888-222222222222';
const IMAGING_DOC = '33333333-aaaa-4444-8888-333333333333';
const LAB_DOC = '44444444-aaaa-4444-8888-444444444444';

const bundle = {
  profile: {
    id: PROFILE_ID,
    name: 'Asha Verma',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  },
  user_intake_form: {},
  patient_history: {},
  lab_reports: [
    {
      id: '55555555-aaaa-4444-8888-555555555555',
      profile_id: PROFILE_ID,
      document_source: LAB_DOC,
      lab_name: 'Acme Labs',
      report_date: '2026-08-20',
      status: 'Processed',
      extracted_values: { tests: [{ test_name: 'Hb' }, { test_name: 'WBC' }] },
      created_at: '2026-08-20T00:00:00Z',
      updated_at: '2026-08-20T00:00:00Z',
    },
  ],
  imaging_reports: [
    {
      id: '66666666-aaaa-4444-8888-666666666666',
      profile_id: PROFILE_ID,
      document_source: IMAGING_DOC,
      report_date: '2026-09-01',
      extraction_status: 'blocked',
      lane: 'image',
      pages_total: 3,
      pages_verified: 0,
      has_markdown: false,
      pages_withheld_count: 3,
      document_filename: 'chest_xray.pdf',
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    },
  ],
  documents: [
    {
      id: IMAGING_DOC,
      filename: 'chest_xray.pdf',
      document_type: 'imaging',
      status: 'completed',
      created_at: '2026-09-01T08:00:00Z',
      updated_at: '2026-09-01T08:10:00Z',
    },
    {
      id: LAB_DOC,
      filename: 'cbc.pdf',
      document_type: 'lab_report',
      status: 'completed',
      created_at: '2026-08-20T08:00:00Z',
      updated_at: '2026-08-20T08:10:00Z',
    },
  ],
};

function mount(payload: Record<string, unknown> = bundle) {
  server.use(
    http.get(BASE + '/review/profiles/' + PROFILE_ID + '/review-bundle', () => HttpResponse.json(payload)),
    http.get(BASE + '/review/users/' + USER_ID, () =>
      HttpResponse.json({
        user: { id: USER_ID, email: 'asha@example.com', is_active: true, created_at: '2026-01-01T00:00:00Z', profile_count: 1, document_count: 2, lab_report_count: 1, issue_count: 0 },
        profiles: [{ id: PROFILE_ID, user_id: USER_ID, name: 'Asha Verma', is_default: true, document_count: 2, issue_count: 0 }],
      }),
    ),
  );
  return render(
    <MemoryRouter initialEntries={[`/admin/users/${USER_ID}/profiles/${PROFILE_ID}/reports`]}>
      <Routes>
        <Route path="/admin/users/:userId/profiles/:profileId/reports" element={<ProfileReportsScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function rowFor(filename: string) {
  const cell = await screen.findByTitle(filename);
  return cell.closest('tr')!;
}

describe('ProfileReportsScreen — imaging', () => {
  it('shows an imaging record with its own extraction status, not the intake status', async () => {
    mount();
    const row = await rowFor('chest_xray.pdf');
    // document_intake.status is 'completed' here; the record itself is blocked,
    // and that is what a reviewer must see.
    expect(within(row).getByText('Blocked (privacy)')).toBeInTheDocument();
    expect(within(row).getByText('Imaging · image')).toBeInTheDocument();
    // Pages verified, not a test count — imaging has no values to count.
    expect(within(row).getByText('0/3')).toBeInTheDocument();
  });

  it('leaves lab rows exactly as they were', async () => {
    mount();
    const row = await rowFor('cbc.pdf');
    expect(within(row).getByText('Acme Labs')).toBeInTheDocument();
    expect(within(row).getByText('2')).toBeInTheDocument();
    expect(within(row).getByText('Needs Review')).toBeInTheDocument();
  });

  it('still renders against a backend that serves no imaging_reports key', async () => {
    const withoutImaging = { ...bundle };
    delete (withoutImaging as Partial<typeof bundle>).imaging_reports;
    mount(withoutImaging);
    const row = await rowFor('cbc.pdf');
    expect(within(row).getByText('Acme Labs')).toBeInTheDocument();
  });
});

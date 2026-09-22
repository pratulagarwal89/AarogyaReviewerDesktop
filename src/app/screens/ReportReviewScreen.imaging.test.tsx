/**
 * The reviewer's imaging surface, driven through the real screen.
 *
 * These assert the four things a reviewer needs from an imaging record and one
 * thing that must not change: the original beside the transcription, the
 * extraction status, the privacy reasons on a blocked record, a reprocess that
 * sends the imaging stage — and a lab document still rendering the lab lens.
 *
 * DocumentViewer is mocked because it pulls pdf.js into jsdom; ReportPreview
 * itself is real, so the side-by-side layout is what is actually rendered.
 */
import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render } from '@testing-library/react';
import { http, HttpResponse, server } from '../../test/msw';
import ReportReviewScreen from './ReportReviewScreen';
import type { DocumentDetail } from '../../api/client';

vi.mock('../components/document/DocumentViewer', () => ({
  default: () => <div data-testid="document-viewer">PDF viewer</div>,
}));

const BASE = 'http://soul.test';
// The reprocess endpoints are served by the Flask service, whose base URL comes
// from VITE_REPROCESS_API_URL (with the client's own localhost fallback). Read
// it the same way the client does so this test follows whatever .env.local
// says instead of pinning one machine's configuration.
const REPROCESS_BASE = String(
  import.meta.env.VITE_REPROCESS_API_URL || 'http://localhost:8000',
).replace(/\/$/, '');
const DOC_ID = '77777777-7777-7777-7777-777777777777';
const IMAGING_ID = '88888888-8888-8888-8888-888888888888';
const RUN_ID = '99999999-9999-9999-9999-999999999999';

const MARKDOWN = '## FINDINGS\n\nNo acute cardiopulmonary abnormality.\n\n## IMPRESSION\n\nNormal chest radiograph.';

function imagingDocument(overrides: Partial<DocumentDetail> = {}): DocumentDetail {
  return {
    id: DOC_ID,
    filename: 'chest_xray.pdf',
    document_type: 'imaging',
    status: 'completed',
    profile_id: '55555555-5555-5555-5555-555555555555',
    created_at: '2026-09-01T09:00:00Z',
    updated_at: '2026-09-01T09:05:00Z',
    imaging_report_id: IMAGING_ID,
    imaging_extraction_status: 'succeeded',
    imaging_report_date: '2026-09-01',
    imaging_report_markdown: MARKDOWN,
    imaging_administrative_details: 'Study: CT Chest',
    imaging_lane: 'image',
    imaging_pages_total: 3,
    imaging_pages_verified: 3,
    ...overrides,
  };
}

function labDocument(): DocumentDetail {
  return {
    id: DOC_ID,
    filename: 'cbc.pdf',
    document_type: 'lab_report',
    status: 'completed',
    created_at: '2026-09-01T09:00:00Z',
    updated_at: '2026-09-01T09:05:00Z',
    lab_report_id: '12121212-1212-1212-1212-121212121212',
    lab_name: 'Acme Labs',
    lab_report_status: 'Processed',
    structured_tables: [{}],
    plain_text_searchable: 'Haemoglobin 13.2',
    extracted_values: { tests: [{ test_name: 'Haemoglobin', value: '13.2', unit: 'g/dL' }] },
  };
}

function mount(document: DocumentDetail, runs: unknown[] = []) {
  server.use(
    http.get(BASE + '/review/documents/' + DOC_ID, () => HttpResponse.json(document)),
    http.get(REPROCESS_BASE + '/review/documents/' + DOC_ID + '/reprocess-runs', () =>
      HttpResponse.json({ items: runs, count: runs.length }),
    ),
  );
  return render(
    <MemoryRouter initialEntries={['/admin/reports/' + DOC_ID]}>
      <Routes>
        <Route path="/admin/reports/:documentId" element={<ReportReviewScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ReportReviewScreen — imaging', () => {
  it('shows the original document beside the Markdown transcription', async () => {
    mount(imagingDocument());

    // Original (left) and transcription (right) are both on screen.
    expect(await screen.findByText('Original Document')).toBeInTheDocument();
    expect(screen.getByTestId('document-viewer')).toBeInTheDocument();
    const transcription = await screen.findByTestId('imaging-markdown');
    expect(transcription).toHaveTextContent('No acute cardiopulmonary abnormality.');
    expect(transcription).toHaveTextContent('Normal chest radiograph.');

    // The imaging lens replaces the lab one — there is no value table to show.
    expect(screen.queryByText('Extracted Lab Values')).not.toBeInTheDocument();
  });

  it('shows the extraction status and the lane/page provenance', async () => {
    mount(imagingDocument({ imaging_extraction_status: 'partial', imaging_pages_verified: 2 }));

    expect(await screen.findByTestId('imaging-status-badge')).toHaveTextContent('Partial');
    expect(screen.getByText(/lane image/)).toHaveTextContent('pages verified 2/3');
  });

  it('shows why each page was withheld on a blocked record, and stores no transcription', async () => {
    mount(
      imagingDocument({
        imaging_extraction_status: 'blocked',
        imaging_report_markdown: undefined,
        imaging_pages_verified: 0,
        imaging_pages_withheld: [
          { page: 1, reason: 'identity_in_clinical_region', detail: 'name_band' },
          { page: 2, reason: 'page_skew_too_large', detail: '12.3deg' },
        ],
      }),
    );

    expect(await screen.findByTestId('imaging-status-badge')).toHaveTextContent('Blocked (privacy)');
    expect(screen.getByText(/Withheld by the privacy gate/)).toHaveTextContent('2 pages');
    expect(screen.getByText('identity_in_clinical_region')).toBeInTheDocument();
    expect(screen.getByText('page_skew_too_large')).toBeInTheDocument();
    expect(screen.getByText('12.3deg')).toBeInTheDocument();
    // Nothing was transmitted, so there is nothing to render as a report.
    expect(screen.queryByTestId('imaging-markdown')).not.toBeInTheDocument();
    expect(screen.getByText(/Every page was withheld by the privacy gate/)).toBeInTheDocument();
  });

  it('triggers a reprocess that asks for the imaging stage', async () => {
    let posted: Record<string, unknown> | null = null;
    server.use(
      http.post(REPROCESS_BASE + '/review/documents/' + DOC_ID + '/reprocess', async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ run_id: RUN_ID, status: 'running', scope: 'stages' });
      }),
      http.get(REPROCESS_BASE + '/review/documents/' + DOC_ID + '/reprocess-runs/' + RUN_ID, () =>
        HttpResponse.json({
          id: RUN_ID,
          document_id: DOC_ID,
          scope: 'stages',
          requested_stages: ['imaging'],
          status: 'succeeded',
          outcomes: {
            imaging: {
              stage: 'imaging',
              status: 'completed',
              previous_extraction_status: 'blocked',
              extraction_status: 'succeeded',
              pages_total: 3,
              pages_verified: 3,
            },
          },
        }),
      ),
    );
    mount(imagingDocument({ imaging_extraction_status: 'blocked', imaging_report_markdown: undefined }));

    await userEvent.click(await screen.findByRole('button', { name: /Reprocess record/i }));
    const dialog = await screen.findByRole('dialog');

    // The dialog opens on the imaging preset, and says the gate is not bypassed.
    expect(within(dialog).getByRole('radio', { name: /Re-run imaging transcription/i })).toBeChecked();
    expect(within(dialog).getByText(/does not bypass it/)).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: /Confirm reprocess/i }));

    await waitFor(() => expect(posted).not.toBeNull());
    expect(posted).toMatchObject({ scope: 'stages', stages: ['imaging'] });

    // The run reports what happened to the record, not just that it was queued.
    expect(await screen.findByText(/blocked → succeeded/)).toBeInTheDocument();
  });

  it('leaves a lab document on the lab lens, with its presets unchanged', async () => {
    mount(labDocument());

    expect(await screen.findByText('Extracted Lab Values')).toBeInTheDocument();
    expect(screen.getByText('Haemoglobin')).toBeInTheDocument();
    expect(screen.queryByTestId('imaging-markdown')).not.toBeInTheDocument();
    // The end-user lens stays available for lab documents.
    expect(screen.getByRole('button', { name: /End-user \(Flutter\) view/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Reprocess record/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('radio', { name: /Reuse existing OCR/i })).toBeChecked();
    expect(within(dialog).queryByRole('radio', { name: /Re-run imaging transcription/i })).not.toBeInTheDocument();
  });
});

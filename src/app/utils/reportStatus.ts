// Single source of truth for the UI-facing status badge across the admin
// review flow. Map AarogyaSoul backend state into one of five buckets:
//
//   processing       — OCR or extraction is in flight
//   failed           — OCR or extraction failed
//   reprocess        — a reprocess job is queued/pending
//   verified         — verified_by/verified_at populated (once BE adds columns)
//   needs_review     — extraction completed but not verified (default state)
//
// Backend reality today: document_intake.status is one of
// {pending, processing, completed, failed}. There is no separate
// ocr_status/extraction_status column, no verified_by/verified_at column,
// and no reprocess_required flag. We derive UI status from what is available
// and gracefully read verify fields if the backend ever supplies them.

import type { DocumentListItem, DocumentDetail, ReviewLabReport } from "../../api/client";

export type UiReportStatus =
  | "verified"
  | "needs_review"
  | "failed"
  | "reprocess"
  | "processing";

export interface StatusSourceInput {
  /** document_intake.status (pending|processing|completed|failed) */
  intakeStatus?: string | null;
  /** lab_reports.status if joined (e.g. "Unprocessed", "Completed") */
  labReportStatus?: string | null;
  /** Optional verify fields (present when BE adds columns) */
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  /** Number of lab rows already extracted, if known */
  labRowCount?: number;
}

export function deriveReportStatus(input: StatusSourceInput): UiReportStatus {
  const intake = (input.intakeStatus ?? "").toLowerCase();
  const labStatus = (input.labReportStatus ?? "").toLowerCase();

  if (input.verifiedAt && input.verifiedBy) {
    return "verified";
  }
  if (intake === "failed" || labStatus === "failed") {
    return "failed";
  }
  if (intake === "processing" || intake === "pending" || labStatus === "processing") {
    return "processing";
  }
  if (labStatus === "reprocess_required" || labStatus === "reprocess") {
    return "reprocess";
  }
  // intake === "completed" or anything else lands here.
  return "needs_review";
}

/** Convenience helper for the reports table row given a document + lab_report. */
export function deriveStatusFromDocumentRow(
  doc: DocumentListItem,
  labReport?: ReviewLabReport,
): UiReportStatus {
  return deriveReportStatus({
    intakeStatus: doc.status,
    labReportStatus: labReport?.status,
  });
}

/** Convenience helper for the report review screen. */
export function deriveStatusFromDocumentDetail(doc: DocumentDetail): UiReportStatus {
  return deriveReportStatus({
    intakeStatus: doc.status,
    labReportStatus: doc.lab_report_status,
    verifiedAt: doc.verified_at,
    verifiedBy: doc.verified_by,
  });
}

export function statusLabel(status: UiReportStatus): string {
  switch (status) {
    case "verified":
      return "Verified";
    case "needs_review":
      return "Needs Review";
    case "failed":
      return "Failed";
    case "reprocess":
      return "Reprocess Required";
    case "processing":
      return "Processing";
  }
}

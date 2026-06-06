import type {
  DocumentListItem,
  PatientHistoryData,
  ReviewBundle,
  ReviewProfileListItem,
} from "../api/client";

/** Profile list item for sidebar (from listReviewProfiles or derived from bundle) */
export interface ProfileListItem {
  id: string;
  name: string;
  dob?: string;
  gender?: string;
}

/** Document item for viewer (id, display name, PDF URL) */
export interface DocumentViewItem {
  id: string;
  name: string;
  type: "pdf" | "image";
  url: string;
  uploadDate?: string;
}

/** Single lab value row for display */
export interface LabValueView {
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: "Normal" | "High" | "Low" | "Critical";
  page?: number;
  /** Optional row linkage when merging stored/joined test rows */
  sourceTableId?: string;
  panel?: string;
  specimen?: string;
}

export interface TextFieldView {
  label: string;
  value: string;
  multiline: boolean;
}

/** Extracted data view for the right panel (document_intake via getDocument; lab_reports merge optional) */
export interface ExtractedDataView {
  metadata: Record<string, string>;
  labValues?: LabValueView[];
  labReportExtractedValues?: LabValueView[];
  textFields?: TextFieldView[];
  keyValuePairs?: Record<string, string>;
}

export type { ReviewBundle, ReviewProfileListItem, PatientHistoryData, DocumentListItem };

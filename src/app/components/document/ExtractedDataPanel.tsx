import { useEffect, useState } from "react";
import type { ReviewBundle } from "../../../api/client";
import { getDocument } from "../../../api/client";
import { documentDetailToExtractedView } from "../../utils/documentMappers";
import KeyValuePairsSection from "./KeyValuePairsSection";
import LabValuesTable from "./LabValuesTable";
import MetadataSection from "./MetadataSection";
import TextFieldsSection from "./TextFieldsSection";

interface ExtractedDataPanelProps {
  documentId?: string;
  /** Retained for layout/parent props; document detail uses document_intake only (no lab_reports merge). */
  bundle: ReviewBundle;
}

export default function ExtractedDataPanel({ documentId, bundle: _bundle }: ExtractedDataPanelProps) {
  void _bundle;
  const [extracted, setExtracted] = useState<ReturnType<typeof documentDetailToExtractedView> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!documentId) {
      Promise.resolve().then(() => {
        setExtracted(null);
        setError("");
        setLoading(false);
      });
      return;
    }
    let cancelled = false;
    queueMicrotask(() => {
      setLoading(true);
      setError("");
    });
    getDocument(documentId, false)
      .then((doc) => {
        if (cancelled) return;
        // lab_reports merge disabled — show document_intake-derived fields only (see documentMappers).
        // const labReport = bundle.lab_reports?.find(
        //   (r) => r.document_source === documentId || (doc.lab_report_id != null && r.id === doc.lab_report_id),
        // );
        setExtracted(documentDetailToExtractedView(doc));
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load document");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  if (!documentId) {
    return (
      <div className="h-full rounded-md border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600">
        No document selected.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center rounded-md border border-gray-200 bg-white text-sm text-gray-600">
        Loading extracted data…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center rounded-md border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!extracted) {
    return null;
  }

  return (
    <div className="h-full space-y-4 overflow-y-auto rounded-md border border-gray-200 bg-white p-4">
      <MetadataSection metadata={extracted.metadata} />
      <LabValuesTable
        labValues={extracted.labValues}
        extractedLabValues={extracted.labReportExtractedValues}
      />
      <TextFieldsSection textFields={extracted.textFields} />
      <KeyValuePairsSection keyValuePairs={extracted.keyValuePairs} />
    </div>
  );
}

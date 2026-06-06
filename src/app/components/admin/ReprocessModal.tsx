import { useEffect, useMemo, useState } from "react";
import Button from "../common/Button";
import type {
  DocumentDetail,
  ReprocessRequest,
  ReprocessStage,
} from "../../../api/client";

interface ReprocessModalProps {
  open: boolean;
  documentId: string;
  document?: DocumentDetail;
  onClose: () => void;
  onConfirm: (payload: ReprocessRequest) => Promise<void>;
}

type Preset = "full" | "reuse_ocr" | "custom";

interface StageOption {
  key: ReprocessStage;
  label: string;
  hint: string;
  /** Why the stage is disabled, if any. */
  disabledReason: (doc?: DocumentDetail) => string | null;
}

const STAGE_OPTIONS: StageOption[] = [
  {
    key: "patient_name",
    label: "Patient name + DOB",
    hint: "Re-extracts patient name/DOB from OCR text and label/value pairs, then re-links to a profile.",
    disabledReason: (doc) =>
      doc?.plain_text_searchable ? null : "OCR text is missing — run OCR first.",
  },
  {
    key: "profile_id",
    label: "Profile linkage only",
    hint: "Keeps the current patient name; re-matches against the uploader's profiles.",
    disabledReason: (doc) =>
      (doc?.patient_name ?? "").trim()
        ? null
        : "Patient name is empty — run patient extraction first.",
  },
  {
    key: "document_type",
    label: "Document type",
    hint: "Re-classifies as lab_report / prescription from text + structured tables.",
    disabledReason: (doc) =>
      doc?.plain_text_searchable ? null : "OCR text is missing — run OCR first.",
  },
  {
    key: "lab_values",
    label: "Lab values (LLM)",
    hint: "Refreshes the confirmed lab_reports row's extracted_values from structured_tables.",
    disabledReason: (doc) => {
      if (!doc?.lab_report_id) return "No confirmed lab_reports row yet.";
      if (!doc.structured_tables || (Array.isArray(doc.structured_tables) && doc.structured_tables.length === 0)) {
        return "structured_tables is empty — run OCR first.";
      }
      if (doc.document_type === "prescription") return "Prescription LLM refresh not yet supported.";
      return null;
    },
  },
];

export default function ReprocessModal({ open, documentId, document, onClose, onConfirm }: ReprocessModalProps) {
  const [preset, setPreset] = useState<Preset>("reuse_ocr");
  const [stages, setStages] = useState<Set<ReprocessStage>>(new Set());
  const [overwrite, setOverwrite] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => {
        setPreset("reuse_ocr");
        setStages(new Set());
        setOverwrite(false);
        setSubmitting(false);
        setError("");
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, submitting]);

  const isConfirmed = document ? document.status === "completed" && !!document.lab_report_id : false;

  const summary = useMemo(() => {
    if (preset === "full") return "Re-runs OCR, then patient + doc type + lab values.";
    if (preset === "reuse_ocr") return "Skips OCR. Re-runs patient + doc type + lab values from stored OCR.";
    if (stages.size === 0) return "Pick one or more stages to run.";
    return `Runs: ${[...stages].join(", ")}.`;
  }, [preset, stages]);

  const toggleStage = (stage: ReprocessStage) => {
    setStages((prev) => {
      const next = new Set(prev);
      if (next.has(stage)) next.delete(stage);
      else next.add(stage);
      return next;
    });
  };

  const buildPayload = (): ReprocessRequest | null => {
    if (preset === "full") {
      return { scope: "full", overwrite, async: true };
    }
    if (preset === "reuse_ocr") {
      return { scope: "reuse_ocr", overwrite, async: true };
    }
    if (stages.size === 0) return null;
    return {
      scope: "stages",
      stages: [...stages],
      overwrite,
      async: true,
    };
  };

  const handleConfirm = async () => {
    const payload = buildPayload();
    if (!payload) {
      setError("Pick at least one stage to run.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await onConfirm(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to queue reprocess");
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reprocess-dialog-title"
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded-md border border-slate-200 bg-white p-5 shadow-lg">
        <h2 id="reprocess-dialog-title" className="text-base font-semibold text-slate-900">
          Reprocess DOC-{documentId.slice(0, 8)}
        </h2>
        <p className="mt-1 text-xs text-slate-500">{summary}</p>

        {isConfirmed ? (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            This document is already confirmed. Reprocess will refresh values in place; changes to
            <code className="mx-1">document_type</code> or
            <code className="mx-1">profile_id</code>
            will be flagged on the confirmed record (not silently applied).
          </div>
        ) : null}

        <fieldset className="mt-4 space-y-2 text-sm" disabled={submitting}>
          <legend className="sr-only">Reprocess scope</legend>
          <Preset
            id="reuse"
            label="Reuse existing OCR"
            hint="Faster. Rebuilds patient, doc type, and lab values from stored OCR."
            checked={preset === "reuse_ocr"}
            onChange={() => setPreset("reuse_ocr")}
          />
          <Preset
            id="full"
            label="Run OCR again"
            hint="Slower. Re-reads the file, then all downstream stages."
            checked={preset === "full"}
            onChange={() => setPreset("full")}
          />
          <Preset
            id="custom"
            label="Targeted stages"
            hint="Pick exactly which downstream stages to rerun."
            checked={preset === "custom"}
            onChange={() => setPreset("custom")}
          />
        </fieldset>

        {preset === "custom" ? (
          <fieldset className="mt-3 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm" disabled={submitting}>
            <legend className="px-1 text-xs uppercase tracking-wide text-slate-500">Stages</legend>
            {STAGE_OPTIONS.map((opt) => {
              const reason = opt.disabledReason(document);
              const disabled = !!reason;
              return (
                <label
                  key={opt.key}
                  className={`flex items-start gap-2 rounded-md border border-transparent p-2 ${
                    disabled ? "opacity-60" : "hover:border-slate-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-sky-600"
                    checked={stages.has(opt.key)}
                    disabled={disabled}
                    onChange={() => toggleStage(opt.key)}
                  />
                  <span>
                    <span className="font-medium text-slate-900">{opt.label}</span>
                    <span className="ml-2 text-xs text-slate-500">{opt.hint}</span>
                    {reason ? <div className="mt-0.5 text-xs text-rose-700">{reason}</div> : null}
                  </span>
                </label>
              );
            })}
          </fieldset>
        ) : null}

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-rose-600"
            checked={overwrite}
            onChange={(event) => setOverwrite(event.target.checked)}
            disabled={submitting}
          />
          <span className="text-slate-900">
            Overwrite existing populated fields
            <span className="ml-2 text-xs text-slate-500">
              Off by default to protect reviewer corrections.
            </span>
          </span>
        </label>

        {error ? (
          <p role="alert" className="mt-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={submitting}
            className="bg-sky-600 hover:bg-sky-700"
          >
            {submitting ? "Queuing…" : "Confirm reprocess"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Preset({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-start gap-2 rounded-md border border-slate-200 bg-white p-3">
      <input
        type="radio"
        name="reprocess-preset"
        value={id}
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 accent-sky-600"
      />
      <span>
        <span className="font-medium text-slate-900">{label}</span>
        <span className="ml-2 text-xs text-slate-500">{hint}</span>
      </span>
    </label>
  );
}

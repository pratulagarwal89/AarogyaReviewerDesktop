import { useEffect, useState } from "react";
import { Minimize2, Pencil, X } from "lucide-react";
import Button from "../common/Button";
import type { DocumentDetail } from "../../../api/client";
import { updateDocumentIntake } from "../../../api/client";
import { useToast } from "./useToast";
import { formatDate } from "../../../utils/dateUtils";
import CollapsibleStrip from "./CollapsibleStrip";

interface StructuredDataFormProps {
  document: DocumentDetail;
  onRefresh: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

interface Editable {
  document_type: string;
  patient_name: string;
  dob: string;
  status: string;
  lab_name: string;
  report_date: string;
}

function toEditable(doc: DocumentDetail): Editable {
  return {
    document_type: doc.document_type ?? "",
    patient_name: doc.patient_name ?? "",
    dob: doc.dob ?? "",
    status: doc.status ?? "",
    lab_name: doc.lab_name ?? "",
    report_date: doc.lab_report_date ? doc.lab_report_date.slice(0, 10) : "",
  };
}

function diff(initial: Editable, current: Editable): Partial<Editable> {
  const out: Partial<Editable> = {};
  (Object.keys(initial) as (keyof Editable)[]).forEach((key) => {
    if (initial[key] !== current[key]) out[key] = current[key];
  });
  return out;
}

function ReadOnlyRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 py-1.5">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="break-all text-sm text-slate-900">{value && value.trim() !== "" ? value : "—"}</dd>
    </div>
  );
}

function FieldRow({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "date";
  disabled?: boolean;
}) {
  return (
    <label className="grid grid-cols-[140px_1fr] items-center gap-3 py-1.5">
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50 disabled:text-slate-500"
      />
    </label>
  );
}

export default function StructuredDataForm({
  document,
  onRefresh,
  collapsed = false,
  onToggleCollapsed,
}: StructuredDataFormProps) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Editable>(() => toEditable(document));
  const [saving, setSaving] = useState(false);
  const initial = toEditable(document);

  useEffect(() => {
    setDraft(toEditable(document));
    setEditing(false);
  }, [document]);

  if (collapsed && onToggleCollapsed) {
    return <CollapsibleStrip label="Document Intake" edge="leading" onExpand={onToggleCollapsed} />;
  }

  const handleSave = async () => {
    const patch = diff(initial, draft);
    if (Object.keys(patch).length === 0) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await updateDocumentIntake(document.id, patch);
      toast("success", "Document intake updated.");
      setEditing(false);
      onRefresh();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(initial);
    setEditing(false);
  };

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col rounded-md border border-slate-200 bg-white">
      <header className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">Document Intake</h3>
          <p className="font-mono text-xs text-slate-500">document_intake table</p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {editing ? (
            <>
              <Button onClick={handleCancel} className="!py-1 !px-3 text-xs" disabled={saving}>
                <X className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={saving}
                className="bg-sky-600 hover:bg-sky-700 !py-1 !px-3 text-xs"
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditing(true)} className="!py-1 !px-3 text-xs">
              <Pencil className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
              Edit
            </Button>
          )}
          {onToggleCollapsed ? (
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-expanded
              title="Collapse Document Intake"
              className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
            >
              <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">Collapse</span>
            </button>
          ) : null}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <dl className="divide-y divide-slate-100">
          <ReadOnlyRow label="Document ID" value={document.id} />
          <ReadOnlyRow label="Profile ID" value={document.profile_id ?? "—"} />
          <ReadOnlyRow label="Filename" value={document.filename} />
          <ReadOnlyRow
            label="Uploaded at"
            value={document.created_at ? formatDate(document.created_at) : "—"}
          />
          <ReadOnlyRow
            label="Updated at"
            value={document.updated_at ? formatDate(document.updated_at) : "—"}
          />
          {editing ? (
            <>
              <FieldRow
                label="Document type"
                value={draft.document_type}
                onChange={(v) => setDraft({ ...draft, document_type: v })}
              />
              <FieldRow
                label="Patient name"
                value={draft.patient_name}
                onChange={(v) => setDraft({ ...draft, patient_name: v })}
              />
              <FieldRow
                label="DOB"
                value={draft.dob}
                onChange={(v) => setDraft({ ...draft, dob: v })}
              />
              <FieldRow
                label="Lab name"
                value={draft.lab_name}
                onChange={(v) => setDraft({ ...draft, lab_name: v })}
              />
              <FieldRow
                label="Report date"
                type="date"
                value={draft.report_date}
                onChange={(v) => setDraft({ ...draft, report_date: v })}
              />
              <FieldRow label="Status" value={draft.status} onChange={() => {}} disabled />
            </>
          ) : (
            <>
              <ReadOnlyRow label="Document type" value={document.document_type ?? "—"} />
              <ReadOnlyRow label="Patient name" value={document.patient_name ?? "—"} />
              <ReadOnlyRow label="DOB" value={document.dob ?? "—"} />
              <ReadOnlyRow label="Lab name" value={document.lab_name ?? "—"} />
              <ReadOnlyRow
                label="Report date"
                value={document.lab_report_date ? formatDate(document.lab_report_date) : "—"}
              />
              <ReadOnlyRow label="Intake status" value={document.status} />
              <ReadOnlyRow label="Lab report status" value={document.lab_report_status ?? "—"} />
            </>
          )}
        </dl>

        {Array.isArray(document.structured_tables) && document.structured_tables.length > 0 ? (
          <details className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
            <summary className="cursor-pointer select-none font-medium text-slate-700">
              structured_table debug ({document.structured_tables.length}{" "}
              {document.structured_tables.length === 1 ? "table" : "tables"})
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-sm bg-white p-2 font-mono text-[11px] leading-snug text-slate-700">
              {JSON.stringify(document.structured_tables, null, 2)}
            </pre>
          </details>
        ) : null}
      </div>
    </section>
  );
}

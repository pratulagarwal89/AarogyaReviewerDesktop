import { Check, X } from "lucide-react";
import type { PatientHistoryData, ReviewUserIntakeForm } from "../../../api/client";
import Card from "../common/Card";

interface IntakeTabProps {
  userIntakeForm: ReviewUserIntakeForm;
  patientHistory: PatientHistoryData | Record<string, unknown> | unknown;
}

function isPatientHistory(
  h: PatientHistoryData | Record<string, unknown> | unknown,
): h is PatientHistoryData {
  return h !== null && typeof h === "object" && !Array.isArray(h);
}

function asRecord(x: unknown): Record<string, unknown> {
  if (x !== null && typeof x === "object" && !Array.isArray(x)) {
    return x as Record<string, unknown>;
  }
  return {};
}

function asArray(x: unknown): unknown[] {
  return Array.isArray(x) ? x : [];
}

export default function IntakeTab({ userIntakeForm, patientHistory }: IntakeTabProps) {
  const history = isPatientHistory(patientHistory) ? patientHistory : null;
  const comorbidity = asRecord(history?.history_or_comorbidity ?? userIntakeForm.comorbidity);
  const majorEvents = asRecord(history?.major_medical_events ?? userIntakeForm.major_events);
  const lifestyle = asRecord(history?.lifestyle ?? {});
  const medications = asArray(history?.current_medication);
  const conditions = Object.keys(comorbidity).filter((k) => typeof comorbidity[k] === "boolean" || typeof comorbidity[k] === "string");
  const checkedConditions = conditions.filter((k) => comorbidity[k] === true || (typeof comorbidity[k] === "string" && String(comorbidity[k]).toLowerCase() !== "no"));

  return (
    <div className="grid gap-4">
      <Card title="Medical History / Comorbidity">
        {conditions.length === 0 ? (
          <p className="text-sm text-gray-600">No conditions recorded.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {conditions.map((condition) => {
              const checked = checkedConditions.includes(condition);
              return (
                <div key={condition} className="inline-flex items-center gap-2 text-sm">
                  {checked ? (
                    <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
                  ) : (
                    <X className="h-4 w-4 text-gray-400" aria-hidden="true" />
                  )}
                  <span className={checked ? "text-gray-900" : "text-gray-500"}>{condition}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="Current Medications">
        {medications.length === 0 ? (
          <p className="text-sm text-gray-600">No medications recorded.</p>
        ) : (
          <div className="space-y-3">
            {medications.map((med, index) => {
              const m = med as Record<string, unknown>;
              return (
                <div key={`${String(m.name)}-${index}`} className="rounded-sm border border-gray-200 bg-gray-50 p-3 text-sm">
                  <p className="font-semibold text-gray-900">{String(m.name ?? "—")}</p>
                  <p className="mt-1 text-gray-700">
                    {String(m.dosage ?? "—")} | {String(m.frequency ?? "—")}
                  </p>
                  {m.startDate != null && (
                    <p className="mt-1 text-xs text-gray-600">Start: {String(m.startDate)}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="Major Medical Events">
        {Object.keys(majorEvents).length === 0 ? (
          <p className="text-sm text-gray-600">No major events recorded.</p>
        ) : (
          <pre className="whitespace-pre-wrap rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-900">
            {JSON.stringify(majorEvents, null, 2)}
          </pre>
        )}
      </Card>

      <Card title="Lifestyle Information">
        <div className="grid gap-3 md:grid-cols-3 text-sm">
          <div className="rounded-sm border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-600">Smoking</p>
            <p className="mt-1 text-gray-900">{String(lifestyle.smoking ?? lifestyle.smoking_status ?? "—")}</p>
          </div>
          <div className="rounded-sm border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-600">Alcohol</p>
            <p className="mt-1 text-gray-900">{String(lifestyle.alcohol ?? lifestyle.alcohol_use ?? "—")}</p>
          </div>
          <div className="rounded-sm border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-600">Exercise</p>
            <p className="mt-1 text-gray-900">{String(lifestyle.exercise ?? "—")}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

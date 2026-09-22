import type { ImagingExtractionStatus } from "../../api/client";

/**
 * How each imaging extraction state is shown. Kept out of the panel component
 * so both the panel and the review screen's header read one definition.
 *
 * `blocked` is deliberately NOT styled as an error. The privacy gate refusing
 * to transmit a page it could not de-identify is the pipeline working as
 * designed; a red badge would invite someone to "fix" it.
 */
const STATUS_STYLES: Record<ImagingExtractionStatus, { label: string; classes: string }> = {
  pending: { label: "Pending", classes: "border-sky-200 bg-sky-50 text-sky-800" },
  succeeded: { label: "Succeeded", classes: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  partial: { label: "Partial", classes: "border-amber-200 bg-amber-50 text-amber-900" },
  blocked: { label: "Blocked (privacy)", classes: "border-violet-200 bg-violet-50 text-violet-800" },
  failed: { label: "Failed", classes: "border-rose-200 bg-rose-50 text-rose-800" },
};

export function imagingStatusStyle(status?: string) {
  return (
    STATUS_STYLES[(status ?? "") as ImagingExtractionStatus] ?? {
      label: status ? String(status) : "—",
      classes: "border-slate-200 bg-slate-50 text-slate-700",
    }
  );
}

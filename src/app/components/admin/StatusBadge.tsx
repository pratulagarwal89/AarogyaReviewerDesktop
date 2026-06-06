import type { UiReportStatus } from "../../utils/reportStatus";
import { statusLabel } from "../../utils/reportStatus";

interface StatusBadgeProps {
  status: UiReportStatus;
  className?: string;
}

const styles: Record<UiReportStatus, string> = {
  verified: "border-emerald-200 bg-emerald-50 text-emerald-700",
  needs_review: "border-amber-200 bg-amber-50 text-amber-700",
  failed: "border-rose-200 bg-rose-50 text-rose-700",
  reprocess: "border-violet-200 bg-violet-50 text-violet-700",
  processing: "border-sky-200 bg-sky-50 text-sky-700",
};

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status]} ${className}`}
    >
      {statusLabel(status)}
    </span>
  );
}

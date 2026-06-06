import { ChevronLeft, ChevronRight } from "lucide-react";

type StripEdge = "leading" | "trailing";

interface CollapsibleStripProps {
  label: string;
  edge: StripEdge;
  onExpand: () => void;
}

/**
 * The thin vertical column we render in place of a panel when it's collapsed.
 * Matches the existing pattern used by document/LabValuesTable so the three
 * Report Review panels collapse consistently.
 */
export default function CollapsibleStrip({ label, edge, onExpand }: CollapsibleStripProps) {
  const Icon = edge === "leading" ? ChevronRight : ChevronLeft;
  return (
    <section className="flex h-full w-12 flex-none flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onExpand}
        aria-expanded={false}
        title={`Expand ${label}`}
        className="flex h-full w-full flex-col items-center justify-between gap-2 py-3 hover:bg-slate-50"
      >
        <span className="select-none text-center text-xs font-semibold leading-tight text-slate-900 [writing-mode:vertical-rl] rotate-180">
          {label}
        </span>
        <Icon className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
        <span className="sr-only">Expand {label}</span>
      </button>
    </section>
  );
}

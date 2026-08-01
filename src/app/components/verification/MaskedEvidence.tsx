import { useEffect, useState } from 'react';
import { ImageOff, ShieldAlert, ShieldCheck } from 'lucide-react';
import { getMaskedImage, type MaskedImageResult } from '../../../api/verification';

/**
 * Shows the MASKED source crop for a verification case. There is deliberately no
 * fallback to the original unmasked document: when the crop is missing (404) or
 * expired (410) we say so and surface that the evidence gate will block
 * publication of a verifier_filtered proposal.
 *
 * `onAvailabilityChange` lets the parent screen mirror the *authoritative*
 * evidence state (from the endpoint, not just the case flag) into its action gate.
 */
export default function MaskedEvidence({
  caseId,
  onAvailabilityChange,
}: {
  caseId: string;
  onAvailabilityChange?: (available: boolean) => void;
}) {
  const [result, setResult] = useState<MaskedImageResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getMaskedImage(caseId)
      .then((r) => {
        if (cancelled) return;
        setResult(r);
        onAvailabilityChange?.(r.status === 'available');
      })
      .catch(() => {
        if (cancelled) return;
        setResult({ status: 'missing' });
        onAvailabilityChange?.(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // onAvailabilityChange intentionally excluded — parent passes a stable cb.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
        <h3 className="text-sm font-semibold text-slate-900">Masked source evidence</h3>
        {result?.status === 'available' ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Available
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-amber-700">
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" /> Unavailable
          </span>
        )}
      </header>
      <div className="p-4">
        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">Loading masked crop…</div>
        ) : result?.status === 'available' ? (
          <div>
            <img
              src={result.url}
              alt="Masked crop of the source region under verification (patient identifiers removed)"
              className="max-h-[420px] w-full rounded border border-slate-200 object-contain"
            />
            <p className="mt-2 text-xs text-slate-500">
              Patient identifiers are masked. Link expires in ~{Math.round(result.expiresInSeconds / 60)} min.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-amber-300 bg-amber-50 py-8 text-center">
            <ImageOff className="h-6 w-6 text-amber-500" aria-hidden="true" />
            <p className="text-sm font-medium text-amber-800">
              {result?.status === 'expired'
                ? 'Masked evidence has expired'
                : result?.status === 'unavailable'
                  ? 'Object storage is unavailable'
                  : 'No masked crop for this case'}
            </p>
            <p className="max-w-sm text-xs text-amber-700">
              The original document is never shown here. Without an available masked crop, a
              verifier-filtered proposal cannot be published — the action is blocked in the UI and by
              the backend.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

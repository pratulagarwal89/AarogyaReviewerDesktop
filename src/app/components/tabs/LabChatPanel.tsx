import { ChevronDown, ChevronUp } from "lucide-react";
import { useCallback, useMemo, useRef, useState, type FormEvent } from "react";
import type { ReviewBundle } from "../../../api/client";
import { postLabQueryChat, type LabChatMessage } from "../../../api/labQueryChat";
import Button from "../common/Button";

interface LabChatPanelProps {
  bundle: ReviewBundle;
}

function collectLabReportIds(bundle: ReviewBundle): string[] {
  const raw = bundle.lab_reports;
  if (!Array.isArray(raw)) return [];
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const id = (r as { id?: unknown }).id;
    if (typeof id !== "string") continue;
    const t = id.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    ids.push(t);
  }
  return ids;
}

function reportSummaries(bundle: ReviewBundle): { id: string; label: string }[] {
  const raw = bundle.lab_reports;
  if (!Array.isArray(raw)) return [];
  const out: { id: string; label: string }[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const id = (r as { id?: unknown }).id;
    if (typeof id !== "string" || !id.trim()) continue;
    const tid = id.trim();
    if (seen.has(tid)) continue;
    seen.add(tid);
    const lab = (r as { lab_name?: unknown }).lab_name;
    const date = (r as { report_date?: unknown }).report_date;
    const file = (r as { document_filename?: unknown }).document_filename;
    const parts = [
      typeof lab === "string" && lab.trim() ? lab.trim() : null,
      typeof date === "string" && date.trim() ? date.trim() : null,
      typeof file === "string" && file.trim() ? file.trim() : null,
    ].filter(Boolean) as string[];
    const label = parts.length ? parts.join(" · ") : tid.slice(0, 8) + "…";
    out.push({ id: tid, label });
  }
  return out;
}

export default function LabChatPanel({ bundle }: LabChatPanelProps) {
  const reportIds = useMemo(() => collectLabReportIds(bundle), [bundle]);
  const summaries = useMemo(() => reportSummaries(bundle), [bundle]);
  const [messages, setMessages] = useState<LabChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [labReportListOpen, setLabReportListOpen] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    queueMicrotask(() => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || reportIds.length === 0) return;

    const nextMessages: LabChatMessage[] = [...messages, { role: "user", content: text }];
    setInput("");
    setError("");
    setMessages(nextMessages);
    setLoading(true);
    scrollToBottom();

    try {
      const { reply } = await postLabQueryChat({
        messages: nextMessages,
        reportIds: reportIds,
      });
      setMessages([...nextMessages, { role: "assistant", content: reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
      setMessages(messages);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }, [input, loading, messages, reportIds, scrollToBottom]);

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      void send();
    },
    [send],
  );

  if (reportIds.length === 0) {
    return (
      <section className="rounded-md border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <h2 className="text-base font-semibold">Lab Q&amp;A</h2>
        <p className="mt-2 text-sm">
          This profile has no lab reports yet. Lab Q&amp;A uses stored extracted values from lab reports in the database.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Lab Q&amp;A</h2>
        <p className="mt-1 text-sm text-gray-600">
          Questions use <strong>all {reportIds.length}</strong> lab report{reportIds.length === 1 ? "" : "s"} for this
          profile. The assistant reads merged results from the database (same pipeline as the CLI).
        </p>
        {summaries.length > 0 ? (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setLabReportListOpen((o) => !o)}
              aria-expanded={labReportListOpen}
              className="flex w-full items-center justify-between gap-2 rounded-sm border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm font-medium text-gray-800 hover:bg-gray-100"
            >
              <span>
                Lab reports in scope ({summaries.length})
              </span>
              {labReportListOpen ? (
                <ChevronUp className="h-4 w-4 shrink-0 text-gray-600" aria-hidden />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0 text-gray-600" aria-hidden />
              )}
            </button>
            {labReportListOpen ? (
              <ul className="mt-2 max-h-28 list-inside list-disc overflow-y-auto text-xs text-gray-600">
                {summaries.map((s) => (
                  <li key={s.id}>
                    <span className="font-mono text-[11px] text-gray-500">{s.id.slice(0, 8)}…</span> — {s.label}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        <p className="mt-2 text-xs text-gray-500">
          Requires the AarogyaAI <code className="rounded bg-gray-100 px-1">/lab-query/chat</code> service (dev: Vite proxies{" "}
          <code className="rounded bg-gray-100 px-1">/lab-query</code> to port 8000; production: set{" "}
          <code className="rounded bg-gray-100 px-1">VITE_LAB_QUERY_API_URL</code>).
        </p>
      </div>

      <div
        ref={listRef}
        className="flex min-h-[280px] flex-col gap-3 rounded-md border border-gray-200 bg-white p-4 shadow-sm"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-gray-500">Ask about results across all reports, for example hemoglobin, TSH, or glucose.</p>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-primary-600 text-white"
                    : "border border-gray-200 bg-gray-50 text-gray-900"
                }`}
              >
                <span className="sr-only">{m.role === "user" ? "You: " : "Assistant: "}</span>
                <pre className="whitespace-pre-wrap font-sans">{m.content}</pre>
              </div>
            </div>
          ))
        )}
        {loading ? (
          <div className="text-sm text-gray-500" aria-busy="true">
            Thinking…
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex-1 text-sm font-medium text-gray-700">
          <span className="sr-only">Your question</span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. What was my hemoglobin and fasting glucose?"
            rows={3}
            disabled={loading}
            className="mt-1 w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600 disabled:bg-gray-100"
          />
        </label>
        <Button type="submit" variant="primary" disabled={loading || !input.trim()} className="shrink-0 self-stretch sm:self-auto">
          Send
        </Button>
      </form>
    </section>
  );
}

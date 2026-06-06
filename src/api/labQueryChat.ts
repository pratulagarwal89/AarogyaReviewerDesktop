export type LabChatMessageRole = "user" | "assistant";

export interface LabChatMessage {
  role: LabChatMessageRole;
  content: string;
}

function labQueryChatUrl(): string {
  const base = (import.meta.env.VITE_LAB_QUERY_API_URL as string | undefined)?.trim();
  if (base) {
    return `${base.replace(/\/$/, "")}/lab-query/chat`;
  }
  return "/lab-query/chat";
}

export async function postLabQueryChat(params: {
  messages: LabChatMessage[];
  reportIds: string[];
}): Promise<{ reply: string }> {
  const res = await fetch(labQueryChatUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: params.messages,
      report_ids: params.reportIds,
    }),
  });
  const data: { reply?: string; error?: string } = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = typeof data.error === "string" && data.error ? data.error : `Lab Q&A request failed (${res.status})`;
    throw new Error(msg);
  }
  if (typeof data.reply !== "string") {
    throw new Error(typeof data.error === "string" && data.error ? data.error : "Invalid response from lab Q&A service");
  }
  return { reply: data.reply };
}

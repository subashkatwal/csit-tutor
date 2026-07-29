import { apiFetch } from "./client";

// Keep in sync with client.ts — consider exporting API_BASE from there instead of duplicating.
const API_BASE = "http://localhost:9010";

export interface ConversationOut {
  id: string;
  title: string;
  semester_id: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessageOut {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta: { detection?: Detection; exam?: ExamPattern; practice?: PracticeProblems } | string | null;
  created_at: string;
}

export interface ConversationDetail extends ConversationOut {
  messages: MessageOut[];
}

export interface Detection {
  subject: string;
  topic: string;
  problem_type: string;
  difficulty_level: string;
}

export interface ExamPattern {
  commonly_appears: boolean;
  likely_years: number[];
  marks: number;
  exam_tip: string;
}

export interface PracticeProblems {
  problem_one: string;
  answer_one: string;
  problem_two: string;
  answer_two: string;
}

export async function listConversations(includeArchived = false) {
  const qs = includeArchived ? "?include_archived=true" : "";
  return apiFetch(`/conversations${qs}`) as Promise<ConversationOut[]>;
}

export async function createConversation(semesterId?: string, title?: string) {
  return apiFetch("/conversations", {
    method: "POST",
    body: JSON.stringify({ semester_id: semesterId, title: title ?? "New Conversation" }),
  }) as Promise<ConversationOut>;
}

export async function getConversation(id: string) {
  return apiFetch(`/conversations/${id}`) as Promise<ConversationDetail>;
}

export async function renameConversation(id: string, title: string) {
  return apiFetch(`/conversations/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  }) as Promise<ConversationOut>;
}

export async function deleteConversation(id: string) {
  return apiFetch(`/conversations/${id}`, { method: "DELETE" });
}

export async function archiveConversation(id: string) {
  return apiFetch(`/conversations/${id}/archive`, { method: "POST" }) as Promise<ConversationOut>;
}

// --- Streaming message send ---

export type StreamHandlers = {
  onStatus?: (text: string) => void;
  onDetection?: (data: Detection) => void;
  onSolution?: (content: string) => void;
  onExam?: (data: ExamPattern) => void;
  onPractice?: (data: PracticeProblems) => void;
  onDone?: () => void;
  onError?: (message: string) => void;
};

/**
 * Streams a message response via SSE. Uses raw fetch (not apiFetch) because
 * the response body is a stream of `data: {...}\n\n` events, not one JSON payload.
 */
export async function sendMessageStream(
  conversationId: string,
  content: string,
  handlers: StreamHandlers,
) {
  const token = localStorage.getItem("access_token");

  const res = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ content }),
  });

  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({ detail: "Failed to send message" }));
    throw new Error(err.detail || "Failed to send message");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      if (!part.startsWith("data: ")) continue;
      const payload = JSON.parse(part.slice(6));

      switch (payload.type) {
        case "status":
          handlers.onStatus?.(payload.data.text);
          break;
        case "detection":
          handlers.onDetection?.(payload.data);
          break;
        case "solution":
          handlers.onSolution?.(payload.data.content);
          break;
        case "exam":
          handlers.onExam?.(payload.data);
          break;
        case "practice":
          handlers.onPractice?.(payload.data);
          break;
        case "done":
          handlers.onDone?.();
          break;
        case "error":
          handlers.onError?.(payload.data.message);
          break;
      }
    }
  }
}
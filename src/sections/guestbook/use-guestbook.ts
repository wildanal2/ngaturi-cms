"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { postInvitationForm } from "../public-form";

export type GuestbookMessage = {
  id: string;
  name: string;
  message: string;
  createdAt: string;
};
export const GUESTBOOK_NAME_MAX = 25;
export const GUESTBOOK_MESSAGE_MAX = 255;
export const GUESTBOOK_PAGE = 6;

export function useGuestbook(
  invitationId?: string,
  guestName?: string | null,
  isPreview?: boolean,
) {
  const [msgs, setMsgs] = useState<GuestbookMessage[]>([]);
  const [name, setName] = useState(() => guestName ?? "");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [pendingNote, setPendingNote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(!isPreview && !!invitationId);
  const [attempt, setAttempt] = useState(0);
  const sending = useRef(false);
  useEffect(() => {
    if (isPreview || !invitationId) return;
    const controller = new AbortController();
    fetch(`/api/public/${invitationId}/guestbook`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("load");
        return response.json();
      })
      .then((body) => {
        if (!controller.signal.aborted) {
          setMsgs(body.messages ?? []);
          setLoadError(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [invitationId, isPreview, attempt]);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPreview || !invitationId || sending.current) return;
    const fields = new FormData(event.currentTarget);
    sending.current = true;
    setState("sending");
    setError(null);
    try {
      const body = await postInvitationForm(invitationId, "guestbook", fields);
      setName("");
      setMessage("");
      setState("done");
      if (body.pending) setPendingNote(true);
      if (!body.pending && body.message)
        setMsgs((current) => [body.message, ...current]);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Gagal mengirim. Coba lagi.",
      );
      setState("idle");
    } finally {
      sending.current = false;
    }
  }
  return {
    msgs,
    name,
    setName,
    message,
    setMessage,
    state,
    pendingNote,
    error,
    loading,
    loadError,
    onSubmit,
    retry: () => {
      setLoading(true);
      setAttempt((n) => n + 1);
    },
  };
}

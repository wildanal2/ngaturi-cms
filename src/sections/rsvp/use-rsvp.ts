"use client";

import { useRef, useState, type FormEvent } from "react";
import { postInvitationForm } from "../public-form";

export function useRsvp(invitationId?: string, isPreview?: boolean) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    status: string;
    count: string;
  } | null>(null);
  const sending = useRef(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPreview || !invitationId || sending.current) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    sending.current = true;
    setState("sending");
    setError(null);
    try {
      await postInvitationForm(invitationId, "rsvp", fields);
      setSummary({
        status: String(fields.get("status") ?? ""),
        count: String(fields.get("guest_count") ?? ""),
      });
      setState("done");
      form.reset();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Gagal mengirim. Coba lagi.",
      );
      setState("error");
    } finally {
      sending.current = false;
    }
  }
  return { state, error, summary, onSubmit };
}

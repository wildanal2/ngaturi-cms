"use client";

import type { ReactNode } from "react";
import { Check, CircleAlert, LoaderCircle, Send } from "lucide-react";
import foundation from "./serambi-delima.module.css";
import styles from "./phase-four.module.css";

export function SerambiField({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function SerambiNotice({
  id,
  tone = "info",
  children,
}: {
  id?: string;
  tone?: "info" | "success" | "error";
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      className={styles.notice}
      data-tone={tone}
      role={tone === "error" ? "alert" : "status"}
    >
      {tone === "error" ? (
        <CircleAlert size={20} aria-hidden="true" />
      ) : tone === "success" ? (
        <Check size={20} aria-hidden="true" />
      ) : null}
      <div>{children}</div>
    </div>
  );
}

export function SerambiSubmit({
  sending,
  disabled,
  children,
}: {
  sending: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={sending || disabled}
      className={`${foundation.button} ${styles.action}`}
    >
      {sending ? (
        <LoaderCircle size={18} aria-hidden="true" className={styles.spinner} />
      ) : (
        <Send size={18} aria-hidden="true" />
      )}
      {sending ? "Mengirim…" : children}
    </button>
  );
}

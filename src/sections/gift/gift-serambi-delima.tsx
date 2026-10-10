"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { SectionRenderProps } from "../types";
import type { BankAccount } from "./gift-cards";
import { textProp } from "../serambi-delima/primitives";
import {
  SerambiEntrance,
  SerambiSection,
} from "../serambi-delima/section-primitives";
import foundation from "../serambi-delima/serambi-delima.module.css";
import styles from "../serambi-delima/phase-four.module.css";

function BankLogo({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // As in existing Gift variants, account logos keep their supplied URL.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      width={44}
      height={44}
      loading="lazy"
      decoding="async"
      className={styles.bankLogo}
      onError={() => setFailed(true)}
    />
  );
}

function Account({ account }: { account: BankAccount }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(account.account_number);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }
  return (
    <article className={styles.giftAccount}>
      {account.logo_url ? (
        <BankLogo key={account.logo_url} url={account.logo_url} />
      ) : null}
      <h3 className={styles.bankName}>{account.bank_name}</h3>
      <p className={styles.accountName} dir="auto">
        a.n. {account.account_name}
      </p>
      <span className={styles.accountNumber} dir="ltr">
        {account.account_number}
      </span>
      <button
        type="button"
        className={`${foundation.button} ${styles.action}`}
        onClick={() => void copy()}
        aria-label={`Salin nomor ${account.bank_name}`}
      >
        {status === "copied" ? (
          <Check size={18} aria-hidden="true" />
        ) : (
          <Copy size={18} aria-hidden="true" />
        )}
        {status === "copied" ? "Tersalin" : "Salin nomor"}
      </button>
      <p className={styles.copyFeedback} role="status">
        {status === "copied"
          ? "Nomor berhasil disalin."
          : status === "failed"
            ? "Belum tersalin. Pilih nomor di atas untuk menyalin secara manual."
            : "\u00a0"}
      </p>
    </article>
  );
}

/** Optional existing Gift section; no new submission, payment or account contract. */
export function GiftSerambiDelima({ props, inCanvas }: SectionRenderProps) {
  const accounts = Array.isArray(props.bank_accounts)
    ? (props.bank_accounts as BankAccount[]).filter((account) =>
        account?.account_number?.trim(),
      )
    : [];
  if (!accounts.length) return null;
  return (
    <SerambiSection
      type="gift"
      title="Tanda Kasih"
      intro={textProp(props.intro)}
      inCanvas={inCanvas}
    >
      <div className={styles.giftAccounts}>
        {accounts.map((account, index) => (
          <SerambiEntrance
            key={`${index}-${account.bank_name}-${account.account_number}`}
            inCanvas={inCanvas}
          >
            <Account account={account} />
          </SerambiEntrance>
        ))}
      </div>
    </SerambiSection>
  );
}

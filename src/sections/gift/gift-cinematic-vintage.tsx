"use client";

import { useState } from "react";
import type { SectionRenderProps } from "../types";
import type { BankAccount } from "./gift-cards";
import styles from "../cinematic/cinematic.module.css";

export function GiftCinematicVintage({ props }: SectionRenderProps) {
  const p = props as { intro?: string; bank_accounts?: BankAccount[] };
  const accounts = (p.bank_accounts ?? []).filter((account) =>
    account.account_number?.trim(),
  );
  const [copied, setCopied] = useState<number | null>(null);
  const [copyError, setCopyError] = useState<number | null>(null);
  if (!accounts.length) return null;
  async function copy(account: BankAccount, index: number) {
    setCopied(null);
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(account.account_number);
      setCopied(index);
    } catch {
      setCopyError(index);
    }
  }
  return (
    <div className={`${styles.interactionChapter} ${styles.giftChapter}`}>
      <header className={styles.chapterHeading}>
        <p className={styles.eyebrow}>Dengan penuh terima kasih</p>
        <h2>Tanda Kasih</h2>
        <p>
          {p.intro ||
            "Doa dan restu Anda adalah hadiah yang paling berarti bagi kami."}
        </p>
      </header>
      <details className={styles.giftDisclosure}>
        <summary>
          Lihat informasi tanda kasih <span aria-hidden="true">⌄</span>
        </summary>
        <div className={`${styles.parchment} ${styles.giftLetter}`}>
          {accounts.map((account, index) => (
            <div className={styles.giftAccount} key={index}>
              <h3>{account.bank_name}</h3>
              <p>a.n. {account.account_name}</p>
              <div className={styles.accountAction}>
                <span className={styles.accountNumber}>
                  {copyError !== index &&
                  /^[0-9]{8,}$/.test(account.account_number)
                    ? account.account_number.match(/.{1,4}/g)?.join(" ")
                    : account.account_number}
                </span>
                <button
                  type="button"
                  className={styles.paperButton}
                  onClick={() => void copy(account, index)}
                  aria-label={`Salin nomor ${account.bank_name}`}
                >
                  Salin
                </button>
              </div>
              <p className={styles.copyFeedback} role="status">
                {copied === index
                  ? "Tersalin"
                  : copyError === index
                    ? "Belum tersalin. Pilih nomor di atas untuk menyalin secara manual."
                    : "\u00a0"}
              </p>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

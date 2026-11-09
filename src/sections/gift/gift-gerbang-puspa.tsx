"use client";

import { useState } from "react";
import { Landmark } from "lucide-react";
import type { SectionRenderProps } from "../types";
import type { BankAccount } from "./gift-cards";
import {
  GerbangPuspaPhaseTwoReveal as Reveal,
  GerbangPuspaMedia,
} from "../gerbang-puspa/phase-two-media";
import foundation from "../gerbang-puspa/foundation.module.css";
import styles from "./gift-gerbang-puspa.module.css";

export function GiftGerbangPuspa({ props, inCanvas }: SectionRenderProps) {
  const accounts = (props.bank_accounts ?? []) as BankAccount[];
  const [copied, setCopied] = useState<number | null>(null),
    [failed, setFailed] = useState<number | null>(null);
  return (
    <section
      className={`${foundation.scene} ${styles.gift}`}
      data-scene="gift"
      data-gerbang-puspa-gift
    >
      <div className={`${foundation.frame} ${styles.centeredFrame}`}>
        <Reveal kind="down" inCanvas={inCanvas}>
          <h2>Tanda Kasih</h2>
          {!!props.intro && <p>{String(props.intro)}</p>}
        </Reveal>
        <Reveal inCanvas={inCanvas}>
          <div className={styles.giftCards}>
            {accounts.map((account, index) => (
              <div className={styles.giftAccount} key={index}>
                {account.logo_url ? (
                  <GerbangPuspaMedia
                    src={account.logo_url}
                    fallback="/themes/gerbang-puspa/bank-placeholder.svg"
                    alt={account.bank_name}
                    className={styles.bankLogo}
                  />
                ) : (
                  <div className={styles.bankMark}>
                    <Landmark size={24} strokeWidth={1.4} aria-hidden="true" />
                    {account.bank_name || "Rekening"}
                  </div>
                )}
                <div className={styles.accountDetails}>
                  <p className={styles.accountNumber}>
                    {account.account_number || "Nomor belum diisi"}
                  </p>
                  <p className={styles.accountName}>{account.account_name}</p>
                  <button
                    className={styles.copyButton}
                    type="button"
                    disabled={!account.account_number}
                    data-gp-gift-copy={index}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          account.account_number,
                        );
                        setCopied(index);
                        setFailed(null);
                      } catch {
                        setFailed(index);
                        setCopied(null);
                      }
                    }}
                  >
                    {copied === index
                      ? "Disalin"
                      : failed === index
                        ? "Coba Lagi"
                        : "Salin Rekening"}
                  </button>
                  <span
                    className={styles.feedback}
                    role="status"
                    aria-live="polite"
                  >
                    {failed === index
                      ? "Gagal menyalin. Silakan salin nomor secara manual."
                      : copied === index
                        ? "Nomor rekening berhasil disalin."
                        : ""}
                  </span>
                </div>
              </div>
            ))}
            {!accounts.length && <p>Rekening belum ditambahkan.</p>}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

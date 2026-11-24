"use client";

import { isDuplicateContactPhone } from "@/lib/invitation/contact-picker";
import type { ContactPrefill } from "./use-contact-prefill";

export function ContactPickButton({
  prefill,
  disabled,
}: {
  prefill: ContactPrefill;
  disabled?: boolean;
}) {
  if (!prefill.supported) return null;
  return (
    <button
      type="button"
      onClick={prefill.choose}
      disabled={disabled || prefill.picking}
      className="min-h-11 justify-self-start rounded-full border border-line px-4 py-2 text-sm hover:bg-cream-200 disabled:opacity-60 sm:col-span-2"
    >
      {prefill.picking ? "Membuka kontak…" : "Ambil dari Kontak HP"}
    </button>
  );
}

export function ContactPhoneChoice({
  prefill,
  existingPhones,
  disabled,
}: {
  prefill: ContactPrefill;
  existingPhones: (string | null)[];
  disabled?: boolean;
}) {
  return (
    <>
      {prefill.phones.length > 1 ? (
        <label className="space-y-1 text-sm sm:col-span-2">
          <span>Pilih nomor kontak</span>
          <select
            value={prefill.phones.includes(prefill.phone) ? prefill.phone : ""}
            onChange={(event) => prefill.selectPhone(event.target.value)}
            className="min-h-11 w-full rounded-lg border border-line bg-paper px-3 py-2 text-base sm:text-sm"
            disabled={disabled || prefill.picking}
          >
            <option value="" disabled>
              Pilih nomor WhatsApp
            </option>
            {prefill.phones.map((phone) => (
              <option key={phone} value={phone}>
                {phone}
                {isDuplicateContactPhone(phone, existingPhones)
                  ? " — sudah terdaftar"
                  : ""}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {prefill.duplicate ? (
        <p role="status" className="text-xs text-wine sm:col-span-2">
          Nomor WhatsApp ini sudah terdaftar pada tamu. Data tamu yang ada tidak
          akan ditimpa.
        </p>
      ) : null}
    </>
  );
}

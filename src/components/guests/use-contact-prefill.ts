"use client";

import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import {
  getContactPicker,
  fillFromContact,
  isDuplicateContactPhone,
  pickGuestContact,
} from "@/lib/invitation/contact-picker";

// Browser capability is static; keep the initial server/hydration snapshot false.
const subscribe = () => () => {};

/**
 * Native single-contact picker feeding a name/phone form (Chrome Android).
 * Shared by the owner and delegate forms. Each pick replaces the previous
 * contact entirely: a contact without a name or number never inherits the old one.
 */
export function useContactPrefill(existingPhones: (string | null)[]) {
  const supported = useSyncExternalStore(
    subscribe,
    () => !!getContactPicker(),
    () => false,
  );
  const [picking, setPicking] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phones, setPhones] = useState<string[]>([]);
  const duplicate = isDuplicateContactPhone(phone, existingPhones);

  function selectPhone(value: string) {
    if (isDuplicateContactPhone(value, existingPhones)) {
      toast.warning(
        "Nomor ini sudah terdaftar pada tamu. Data sebelumnya tetap dipertahankan.",
      );
      return false;
    }
    setPhone(value);
    return true;
  }

  async function choose() {
    const picker = getContactPicker();
    if (!picker) return;
    setPicking(true);
    try {
      const contact = await pickGuestContact(picker);
      if (!contact) return;
      const fill = fillFromContact(contact, existingPhones);
      if (fill.kind === "duplicate") {
        selectPhone(contact.phones[0]);
        return;
      }
      setName(fill.name);
      setPhone(fill.phone);
      setPhones(fill.phones);
    } catch {
      toast.error(
        "Kontak belum dapat diakses. Coba lagi atau isi nama dan nomor secara manual.",
      );
    } finally {
      setPicking(false);
    }
  }

  function reset() {
    setName("");
    setPhone("");
    setPhones([]);
  }

  return {
    supported,
    picking,
    name,
    setName,
    phone,
    setPhone,
    phones,
    duplicate,
    selectPhone,
    choose,
    reset,
  };
}

export type ContactPrefill = ReturnType<typeof useContactPrefill>;

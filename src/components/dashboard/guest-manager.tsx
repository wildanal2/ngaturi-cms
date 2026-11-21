"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { toast, Toaster } from "sonner";
import { WhatsappMessageEditor } from "./whatsapp-message-editor";
import {
  getContactPicker,
  isDuplicateContactPhone,
  pickGuestContact,
} from "@/lib/invitation/contact-picker";
import {
  renderWhatsappMessage,
  whatsappUrl,
  type WhatsappTemplate,
} from "@/lib/invitation/whatsapp-message";
import {
  createGuestInvite,
  deleteGuestInvite,
  markGuestSent,
} from "@/lib/invitation/guests";

interface Guest {
  id: string;
  guestName: string;
  guestGroup: string | null;
  slugToken: string;
  maxGuests: number;
  whatsappPhone: string | null;
  isSent: boolean;
  openedAt: string | null;
}

// Browser capability is static; keep the initial server/hydration snapshot false.
const subscribeToContactSupport = () => () => {};

export function GuestManager({
  invitationId,
  baseUrl,
  guests,
  canCreate,
  initialWhatsappTemplate,
  coupleNames,
}: {
  invitationId: string;
  baseUrl: string;
  guests: Guest[];
  canCreate: boolean;
  initialWhatsappTemplate: WhatsappTemplate;
  coupleNames: string;
}) {
  const [pending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);
  const [activeTemplate, setActiveTemplate] = useState(initialWhatsappTemplate);
  const contactsSupported = useSyncExternalStore(
    subscribeToContactSupport,
    () => !!getContactPicker(),
    () => false,
  );
  const [pickingContact, setPickingContact] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [contactPhones, setContactPhones] = useState<string[]>([]);
  const existingPhones = guests.map((guest) => guest.whatsappPhone);
  const duplicatePhone = isDuplicateContactPhone(guestPhone, existingPhones);

  function selectContactPhone(phone: string) {
    if (isDuplicateContactPhone(phone, existingPhones)) {
      toast.warning(
        "Nomor ini sudah terdaftar pada tamu. Data sebelumnya tetap dipertahankan.",
      );
      return false;
    }
    setGuestPhone(phone);
    return true;
  }

  async function chooseContact() {
    const picker = getContactPicker();
    if (!picker) return;
    setPickingContact(true);
    try {
      const contact = await pickGuestContact(picker);
      if (!contact) return;
      if (contact.phones.length === 1 && !selectContactPhone(contact.phones[0]))
        return;
      if (contact.phones.length > 1) setGuestPhone("");
      if (contact.name) setGuestName(contact.name);
      setContactPhones(contact.phones.length > 1 ? contact.phones : []);
    } catch {
      toast.error(
        "Kontak belum dapat diakses. Coba lagi atau isi nama dan nomor secara manual.",
      );
    } finally {
      setPickingContact(false);
    }
  }

  function link(g: Guest) {
    return `${baseUrl}?to=${g.slugToken}`;
  }
  function waLink(g: Guest) {
    return whatsappUrl(
      renderWhatsappMessage(
        activeTemplate.message,
        g.guestName,
        link(g),
        coupleNames,
      ),
      g.whatsappPhone,
    );
  }

  return (
    <div className="space-y-6">
      <Toaster position="bottom-center" richColors />
      <WhatsappMessageEditor
        invitationId={invitationId}
        active={activeTemplate}
        canEdit={canCreate}
        coupleNames={coupleNames}
        onSaved={setActiveTemplate}
      />

      {canCreate ? (
        <form
          key={formKey}
          action={(fd) =>
            startTransition(async () => {
              const res = await createGuestInvite(invitationId, fd);
              if (res.ok) {
                toast.success("Tamu ditambahkan");
                setFormKey((k) => k + 1);
                setGuestName("");
                setGuestPhone("");
                setContactPhones([]);
              } else {
                toast.error(res.error ?? "Gagal");
              }
            })
          }
          className="grid gap-3 rounded-xl border border-line bg-paper p-4 sm:grid-cols-2"
        >
          {contactsSupported ? (
            <button
              type="button"
              onClick={chooseContact}
              disabled={pending || pickingContact}
              className="justify-self-start rounded-full border border-line px-4 py-2 text-sm hover:bg-cream-200 disabled:opacity-60 sm:col-span-2"
            >
              {pickingContact ? "Membuka kontak…" : "Ambil dari Kontak HP"}
            </button>
          ) : null}
          <input
            name="guest_name"
            aria-label="Nama tamu"
            value={guestName}
            onChange={(event) => setGuestName(event.target.value)}
            readOnly={pickingContact}
            required
            placeholder="Nama tamu"
            className="rounded-lg border border-line px-3 py-2 text-sm"
          />
          <input
            name="guest_group"
            placeholder="Grup (opsional): Keluarga, Kantor…"
            className="rounded-lg border border-line px-3 py-2 text-sm"
          />
          <input
            name="whatsapp_phone"
            aria-label="No. WhatsApp"
            value={guestPhone}
            onChange={(event) => setGuestPhone(event.target.value)}
            readOnly={pickingContact}
            placeholder="No. WhatsApp (opsional)"
            className="rounded-lg border border-line px-3 py-2 text-sm"
          />
          <input
            name="max_guests"
            type="number"
            min={1}
            max={10}
            defaultValue={2}
            className="rounded-lg border border-line px-3 py-2 text-sm"
          />
          {contactPhones.length > 1 ? (
            <label className="space-y-1 text-sm sm:col-span-2">
              <span>Pilih nomor kontak</span>
              <select
                value={contactPhones.includes(guestPhone) ? guestPhone : ""}
                onChange={(event) => selectContactPhone(event.target.value)}
                className="w-full rounded-lg border border-line bg-paper px-3 py-2"
                disabled={pending || pickingContact}
              >
                <option value="" disabled>
                  Pilih nomor WhatsApp
                </option>
                {contactPhones.map((phone) => (
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
          {duplicatePhone ? (
            <p role="status" className="text-xs text-wine sm:col-span-2">
              Nomor WhatsApp ini sudah terdaftar pada tamu. Data tamu yang ada
              tidak akan ditimpa.
            </p>
          ) : null}
          <button
            disabled={pending || pickingContact}
            className="rounded-full bg-forest px-4 py-2 text-sm font-medium text-cream disabled:opacity-60 sm:col-span-2"
          >
            Tambah tamu
          </button>
        </form>
      ) : null}

      <ul className="space-y-2">
        {guests.map((g) => (
          <li
            key={g.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-paper p-4 text-sm"
          >
            <div>
              <p className="font-medium">
                {g.guestName}
                {g.guestGroup ? (
                  <span className="ml-2 text-xs text-muted">
                    {g.guestGroup}
                  </span>
                ) : null}
              </p>
              <p className="text-xs text-muted">
                Maks {g.maxGuests} tamu ·{" "}
                {g.openedAt
                  ? "sudah dibuka"
                  : g.isSent
                    ? "terkirim"
                    : "belum dikirim"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(link(g));
                  toast.success("Tautan disalin");
                }}
                className="rounded-full border border-line px-3 py-1.5 hover:bg-cream-200"
              >
                Salin link
              </button>
              <a
                href={waLink(g)}
                target="_blank"
                rel="noreferrer"
                onClick={() =>
                  startTransition(() => markGuestSent(invitationId, g.id))
                }
                className="rounded-full bg-forest px-3 py-1.5 font-medium text-cream"
              >
                Kirim WA
              </a>
              <button
                onClick={() =>
                  startTransition(() => deleteGuestInvite(invitationId, g.id))
                }
                className="rounded-full border border-line px-3 py-1.5 text-wine hover:bg-cream-200"
              >
                Hapus
              </button>
            </div>
          </li>
        ))}
        {guests.length === 0 ? (
          <li className="text-muted">Belum ada tamu.</li>
        ) : null}
      </ul>
    </div>
  );
}

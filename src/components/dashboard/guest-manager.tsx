"use client";

import { useState, useTransition } from "react";
import { toast, Toaster } from "sonner";
import { WhatsappMessageEditor } from "./whatsapp-message-editor";
import { CategoryCombobox } from "@/components/guests/category-combobox";
import { ContactImporter } from "@/components/guests/contact-importer";
import { GuestList } from "@/components/guests/guest-list";
import {
  ContactPhoneChoice,
  ContactPickButton,
} from "@/components/guests/contact-prefill-fields";
import { categoryOptions } from "@/lib/invitation/guest-list";
import { useContactPrefill } from "@/components/guests/use-contact-prefill";
import {
  renderWhatsappMessage,
  whatsappUrl,
  type WhatsappTemplate,
} from "@/lib/invitation/whatsapp-message";
import {
  createGuestInvite,
  createGuestInvitesBulk,
  deleteGuestInvite,
  markGuestSent,
  renameGuestInvite,
  setGuestCategory,
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
  const [category, setCategory] = useState("");
  const existingPhones = guests.map((guest) => guest.whatsappPhone);
  const categories = categoryOptions(guests.map((guest) => guest.guestGroup));
  const prefill = useContactPrefill(existingPhones);
  const {
    name: guestName,
    phone: guestPhone,
    picking: pickingContact,
  } = prefill;

  function link(g: Pick<Guest, "slugToken">) {
    return `${baseUrl}?to=${g.slugToken}`;
  }
  function waLink(g: Pick<Guest, "slugToken" | "guestName" | "whatsappPhone">) {
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
                prefill.reset();
                setCategory("");
              } else {
                toast.error(res.error ?? "Gagal");
              }
            })
          }
          className="grid gap-3 rounded-xl border border-line bg-paper p-4 sm:grid-cols-2"
        >
          <ContactPickButton prefill={prefill} disabled={pending} />
          <input
            name="guest_name"
            aria-label="Nama tamu"
            value={guestName}
            onChange={(event) => prefill.setName(event.target.value)}
            readOnly={pickingContact}
            required
            placeholder="Nama tamu"
            className="min-h-11 rounded-lg border border-line bg-paper px-3 py-2 text-base sm:text-sm"
          />
          <CategoryCombobox
            name="guest_group"
            value={category}
            onChange={setCategory}
            options={categories}
            disabled={pending}
          />
          <input
            name="whatsapp_phone"
            aria-label="No. WhatsApp"
            value={guestPhone}
            onChange={(event) => prefill.setPhone(event.target.value)}
            readOnly={pickingContact}
            placeholder="No. WhatsApp (opsional)"
            className="min-h-11 rounded-lg border border-line bg-paper px-3 py-2 text-base sm:text-sm"
          />
          <input
            name="max_guests"
            type="number"
            min={1}
            max={10}
            defaultValue={2}
            className="min-h-11 rounded-lg border border-line bg-paper px-3 py-2 text-base sm:text-sm"
          />
          <ContactPhoneChoice
            prefill={prefill}
            existingPhones={existingPhones}
            disabled={pending}
          />
          <button
            disabled={pending || pickingContact}
            className="min-h-11 rounded-full bg-forest px-4 py-2 text-sm font-medium text-cream disabled:opacity-60 sm:col-span-2"
          >
            Tambah tamu
          </button>
        </form>
      ) : null}
      {canCreate ? (
        <ContactImporter
          existing={guests.map((g) => ({
            name: g.guestName,
            phone: g.whatsappPhone,
          }))}
          categories={categories}
          remaining={null}
          disabled={pending}
          onConfirm={(items) => createGuestInvitesBulk(invitationId, items)}
        />
      ) : null}

      <GuestList
        guests={guests.map((g) => ({ ...g, opened: g.openedAt !== null }))}
        canEdit={canCreate}
        nameMax={200}
        busy={pending}
        link={link}
        waHref={waLink}
        onSent={(g) => startTransition(() => markGuestSent(invitationId, g.id))}
        onRename={async (g, name) => {
          const res = await renameGuestInvite(invitationId, g.id, name);
          return res.ok ? null : (res.error ?? "Gagal menyimpan nama.");
        }}
        onCategory={async (g, value) => {
          const res = await setGuestCategory(invitationId, g.id, value);
          return res.ok ? null : (res.error ?? "Gagal menyimpan kategori.");
        }}
        onDelete={(g) =>
          startTransition(() => deleteGuestInvite(invitationId, g.id))
        }
        emptyText="Belum ada tamu."
      />
    </div>
  );
}

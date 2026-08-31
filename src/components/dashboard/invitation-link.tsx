"use client";

import { useState, useTransition } from "react";
import { Check, Link2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { updateInvitationSlug } from "@/lib/invitation/actions";

export function InvitationLink({
  invitationId,
  slug,
  appUrl,
}: {
  invitationId: string;
  slug: string;
  appUrl: string;
}) {
  const base = appUrl.replace(/\/$/, "");
  const [current, setCurrent] = useState(slug);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(slug);
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const res = await updateInvitationSlug(invitationId, draft);
      if (res.ok) {
        setCurrent(res.slug);
        setDraft(res.slug);
        setEditing(false);
        toast.success("Tautan undangan diperbarui");
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <Link2 size={14} /> Tautan undangan
      </p>

      {!editing ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="max-w-full truncate rounded-lg bg-cream-200 px-3 py-1.5 text-sm">
            {base}/{current}
          </code>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(`${base}/${current}`);
                toast.success("Tautan tersalin");
              } catch {}
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs hover:bg-cream-200"
          >
            <Check size={13} /> Salin
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(current);
              setEditing(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs hover:bg-cream-200"
          >
            <Pencil size={13} /> Ubah nama tautan
          </button>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-1 text-sm">
            <span className="whitespace-nowrap text-muted">{base}/</span>
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="andi-rima"
              className="min-w-0 flex-1 rounded-lg border border-line bg-white px-2.5 py-1.5"
            />
          </div>
          <p className="text-[11px] text-muted">
            Huruf kecil, angka, dan tanda hubung. 3–40 karakter. Contoh:{" "}
            <code>andi-rima</code> atau <code>wildanfirda</code>.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={pending || draft.trim().length < 3}
              className="rounded-full bg-forest px-4 py-1.5 text-xs font-medium text-cream disabled:opacity-60"
            >
              {pending ? "Menyimpan…" : "Simpan"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={pending}
              className="rounded-full border border-line px-4 py-1.5 text-xs hover:bg-cream-200"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {current !== slug ? (
        <p className="mt-2 text-[11px] text-gold">
          Tautan lama <code>{base}/{slug}</code> tidak berlaku lagi.
        </p>
      ) : null}
    </div>
  );
}

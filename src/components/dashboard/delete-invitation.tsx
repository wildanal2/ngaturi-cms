"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteInvitation } from "@/lib/invitation/actions";

export function DeleteInvitation({
  invitationId,
  title,
}: {
  invitationId: string;
  title: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  function run() {
    start(async () => {
      try {
        // server action redirects to /invitations on success
        await deleteInvitation(invitationId);
      } catch (e) {
        // a Next redirect throws — that's success, not an error
        if (
          e &&
          typeof e === "object" &&
          "digest" in e &&
          String((e as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
        ) {
          return;
        }
        toast.error("Gagal menghapus undangan. Coba lagi.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-wine/30 bg-wine/5 p-4">
      <p className="text-sm font-medium text-wine">Hapus undangan</p>
      <p className="mt-1 text-xs text-ink-soft">
        Undangan “{title}” beserta semua RSVP, ucapan, dan data kunjungan akan
        dihapus permanen. Slot kuota akan kembali kosong. Tindakan ini tidak bisa
        dibatalkan.
      </p>

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-wine/40 px-3.5 py-1.5 text-sm font-medium text-wine hover:bg-wine/10"
        >
          <Trash2 size={14} />
          Hapus undangan
        </button>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-wine">Yakin mau hapus?</span>
          <button
            type="button"
            onClick={run}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-full bg-wine px-3.5 py-1.5 text-sm font-medium text-cream hover:brightness-95 disabled:opacity-60"
          >
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Ya, hapus permanen
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={pending}
            className="rounded-full border border-line px-3.5 py-1.5 text-sm hover:bg-cream-200"
          >
            Batal
          </button>
        </div>
      )}
    </div>
  );
}

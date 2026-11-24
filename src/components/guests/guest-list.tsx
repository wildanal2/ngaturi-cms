"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CategoryCombobox } from "./category-combobox";
import {
  DEFAULT_FILTERS,
  NAME_LOCKED_MESSAGE,
  activeFilterCount,
  categoryFilterFor,
  categoryOptions,
  filterGuests,
  guestStats,
  nameLocked,
  normalizeCategory,
  paginate,
  type CategoryFilter,
  type GuestFilters,
  type ListGuest,
  type StatusFilter,
} from "@/lib/invitation/guest-list";

const control =
  "min-h-11 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm";
const secondary =
  "min-h-11 rounded-full px-3 py-2 text-xs font-medium text-ink-soft underline-offset-2 hover:bg-cream-200 hover:text-ink focus-visible:outline-2 focus-visible:outline-forest disabled:opacity-50 disabled:no-underline";

export interface GuestListProps {
  guests: ListGuest[];
  /** Delegates only: shows the remaining quota next to the total. */
  quotaLimit?: number;
  canEdit: boolean;
  nameMax: number;
  link: (guest: ListGuest) => string;
  /** null disables sending (e.g. invalid draft message). */
  waHref: ((guest: ListGuest) => string) | null;
  waDisabledReason?: string;
  onSent: (guest: ListGuest) => void;
  /** Resolve to an error message, or null on success. */
  onRename: (guest: ListGuest, name: string) => Promise<string | null>;
  onCategory: (
    guest: ListGuest,
    category: string | null,
  ) => Promise<string | null>;
  onDelete?: (guest: ListGuest) => void;
  busy?: boolean;
  emptyText: string;
}

function Status({ done, yes, no }: { done: boolean; yes: string; no: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs ${
        done ? "font-medium text-forest" : "text-muted"
      }`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="size-3.5 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        {done ? (
          <path
            d="M3 8.5l3.2 3.2L13 4.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <circle cx="8" cy="8" r="5.5" />
        )}
      </svg>
      {done ? yes : no}
    </span>
  );
}

type Editing = { id: string; kind: "name" | "category" } | null;

export function GuestList(props: GuestListProps) {
  const { guests, canEdit, nameMax } = props;
  const [filters, setFilters] = useState<GuestFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  // Shown until the refreshed server data arrives; ignored once the stored value moves on.
  const [overrides, setOverrides] = useState<
    Record<
      string,
      {
        field: "guestName" | "guestGroup";
        from: string | null;
        to: string | null;
      }
    >
  >({});

  const shown = useMemo(
    () =>
      guests.map((g) => {
        const o = overrides[g.id];
        return o && g[o.field] === o.from ? { ...g, [o.field]: o.to } : g;
      }),
    [guests, overrides],
  );
  const categories = useMemo(
    () => categoryOptions(shown.map((g) => g.guestGroup)),
    [shown],
  );
  const stats = guestStats(shown);
  const filtered = useMemo(
    () => filterGuests(shown, filters),
    [shown, filters],
  );
  const view = paginate(filtered, page);
  const activeFilters = activeFilterCount(filters);

  function update(patch: Partial<GuestFilters>) {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }

  function start(guest: ListGuest, kind: "name" | "category") {
    setEditing({ id: guest.id, kind });
    setDraft(kind === "name" ? guest.guestName : (guest.guestGroup ?? ""));
    setEditError(null);
  }

  async function save(guest: ListGuest) {
    if (!editing || saving) return;
    const kind = editing.kind;
    if (kind === "name" && !draft.trim()) {
      setEditError("Nama tamu wajib diisi.");
      return;
    }
    setSaving(true);
    setEditError(null);
    const category = normalizeCategory(draft) || null;
    const error =
      kind === "name"
        ? await props.onRename(guest, draft.trim())
        : await props.onCategory(guest, category);
    setSaving(false);
    if (error) {
      setEditError(error);
      return;
    }
    setOverrides((prev) => ({
      ...prev,
      [guest.id]:
        kind === "name"
          ? { field: "guestName", from: guest.guestName, to: draft.trim() }
          : { field: "guestGroup", from: guest.guestGroup, to: category },
    }));
    setEditing(null);
    toast.success(kind === "name" ? "Nama diperbarui" : "Kategori diperbarui");
  }

  async function removeCategory(guest: ListGuest) {
    if (saving) return;
    setSaving(true);
    const error = await props.onCategory(guest, null);
    setSaving(false);
    if (error) toast.error(error);
    else {
      setOverrides((prev) => ({
        ...prev,
        [guest.id]: { field: "guestGroup", from: guest.guestGroup, to: null },
      }));
      toast.success("Kategori dihapus");
    }
  }

  async function copy(guest: ListGuest) {
    try {
      await navigator.clipboard.writeText(props.link(guest));
      toast.success("Tautan disalin");
    } catch {
      toast.error("Gagal menyalin. Salin manual dari tombol Kirim WA.");
    }
  }

  return (
    <section aria-label="Daftar Tamu" className="space-y-4">
      <div>
        <h2 className="text-lg">Daftar Tamu</h2>
        <p className="text-xs text-ink-soft" role="status">
          {props.quotaLimit
            ? `${stats.total} dari ${props.quotaLimit} tamu · sisa kuota ${Math.max(0, props.quotaLimit - stats.total)}`
            : `${stats.total} tamu`}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2" aria-label="Ringkasan">
        {(
          [
            ["Total Tamu", stats.total],
            ["Sudah Dikirim", stats.sent],
            ["Sudah Dibuka", stats.opened],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-line bg-paper p-3"
          >
            <p className="text-xl font-medium">{value}</p>
            <p className="text-xs text-ink-soft">{label}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted">
        Status terkirim dicatat saat Anda menekan Kirim WA di Ngaturi, bukan
        konfirmasi pengiriman atau dibaca dari WhatsApp. {NAME_LOCKED_MESSAGE}
      </p>

      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="search"
            value={filters.query}
            onChange={(event) => update({ query: event.target.value })}
            aria-label="Cari nama atau nomor"
            placeholder="Cari nama atau nomor"
            className={control}
          />
          <button
            type="button"
            aria-expanded={filtersOpen}
            aria-controls="guest-filters"
            onClick={() => setFiltersOpen((v) => !v)}
            className="min-h-11 shrink-0 rounded-lg border border-line px-3 text-sm hover:bg-cream-200 md:hidden"
          >
            Filter{activeFilters ? ` (${activeFilters})` : ""}
          </button>
        </div>
        <div
          id="guest-filters"
          className={`${filtersOpen ? "grid" : "hidden"} grid-cols-1 gap-2 sm:grid-cols-3 md:grid`}
        >
          <label className="text-xs text-ink-soft">
            Kategori
            <select
              value={filters.category}
              onChange={(event) =>
                update({ category: event.target.value as CategoryFilter })
              }
              className={control}
            >
              <option value="all">Semua kategori</option>
              <option value="none">Tanpa kategori</option>
              {categories.map((c) => (
                <option key={c} value={categoryFilterFor(c)}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-ink-soft">
            Pengiriman
            <select
              value={filters.sent}
              onChange={(event) =>
                update({ sent: event.target.value as StatusFilter })
              }
              className={control}
            >
              <option value="all">Semua</option>
              <option value="no">Belum dikirim</option>
              <option value="yes">Sudah dikirim</option>
            </select>
          </label>
          <label className="text-xs text-ink-soft">
            Pembukaan
            <select
              value={filters.opened}
              onChange={(event) =>
                update({ opened: event.target.value as StatusFilter })
              }
              className={control}
            >
              <option value="all">Semua</option>
              <option value="no">Belum dibuka</option>
              <option value="yes">Sudah dibuka</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-soft">
          <span role="status">
            Menampilkan {filtered.length} dari {stats.total} tamu
          </span>
          {activeFilters ? (
            <button
              type="button"
              onClick={() => {
                setFilters(DEFAULT_FILTERS);
                setPage(1);
              }}
              className={secondary}
            >
              Reset filter
            </button>
          ) : null}
        </div>
      </div>

      <ul className="space-y-2">
        {view.items.map((g) => {
          const locked = nameLocked(g);
          const isEditing = editing?.id === g.id ? editing.kind : null;
          const category = normalizeCategory(g.guestGroup);
          return (
            <li
              key={g.id}
              className="space-y-3 rounded-xl border border-line bg-paper p-4 text-sm"
            >
              <div className="min-w-0">
                <p className="break-words font-medium">{g.guestName}</p>
                <p className="text-xs text-muted">
                  {g.whatsappPhone ? `${g.whatsappPhone} · ` : ""}Maks{" "}
                  {g.maxGuests} tamu
                </p>
                {category ? (
                  <span className="mt-1.5 inline-block max-w-full truncate rounded-full bg-cream-200 px-2.5 py-0.5 text-xs text-ink-soft">
                    {category}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <Status
                  done={g.isSent}
                  yes="Sudah dikirim"
                  no="Belum dikirim"
                />
                <Status done={g.opened} yes="Sudah dibuka" no="Belum dibuka" />
              </div>

              {isEditing ? (
                <div className="space-y-2 rounded-lg bg-cream-200/60 p-3">
                  {isEditing === "name" ? (
                    <label className="block text-xs text-ink-soft">
                      Nama tamu
                      <input
                        autoFocus
                        value={draft}
                        maxLength={nameMax}
                        disabled={saving}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void save(g);
                          } else if (event.key === "Escape") setEditing(null);
                        }}
                        className={`${control} mt-1`}
                      />
                    </label>
                  ) : (
                    <CategoryCombobox
                      value={draft}
                      onChange={setDraft}
                      options={categories}
                      disabled={saving}
                    />
                  )}
                  {editError ? (
                    <p role="alert" className="text-xs text-wine">
                      {editError}
                    </p>
                  ) : null}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void save(g)}
                      className="min-h-11 rounded-full bg-forest px-4 py-2 text-xs font-medium text-cream disabled:opacity-60"
                    >
                      {saving ? "Menyimpan…" : "Simpan"}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setEditing(null)}
                      className="min-h-11 rounded-full border border-line px-4 py-2 text-xs"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void copy(g)}
                  className="min-h-11 rounded-full border border-line px-4 py-2 hover:bg-cream-200"
                >
                  Salin link
                </button>
                {props.waHref ? (
                  <a
                    href={props.waHref(g)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => props.onSent(g)}
                    className="inline-flex min-h-11 items-center rounded-full bg-forest px-4 py-2 font-medium text-cream"
                  >
                    Kirim WA
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    title={props.waDisabledReason}
                    className="min-h-11 rounded-full bg-forest px-4 py-2 font-medium text-cream opacity-50"
                  >
                    Kirim WA
                  </button>
                )}
              </div>
              {canEdit || props.onDelete ? (
                <div className="-mx-2 flex flex-wrap gap-x-1">
                  {canEdit ? (
                    <>
                      <button
                        type="button"
                        disabled={locked || saving}
                        title={locked ? NAME_LOCKED_MESSAGE : undefined}
                        onClick={() => start(g, "name")}
                        className={secondary}
                      >
                        Edit nama
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => start(g, "category")}
                        className={secondary}
                      >
                        Ubah kategori
                      </button>
                      {category ? (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void removeCategory(g)}
                          className={secondary}
                        >
                          Hapus kategori
                        </button>
                      ) : null}
                    </>
                  ) : null}
                  {props.onDelete ? (
                    <button
                      type="button"
                      onClick={() => props.onDelete!(g)}
                      disabled={props.busy}
                      className={`${secondary} text-wine`}
                    >
                      Hapus
                    </button>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
        {guests.length === 0 ? (
          <li className="rounded-xl border border-dashed border-line p-6 text-center text-muted">
            {props.emptyText}
          </li>
        ) : filtered.length === 0 ? (
          <li className="space-y-2 rounded-xl border border-dashed border-line p-6 text-center text-muted">
            <p>Tidak ada tamu yang cocok dengan pencarian atau filter.</p>
            <button
              type="button"
              onClick={() => {
                setFilters(DEFAULT_FILTERS);
                setPage(1);
              }}
              className={secondary}
            >
              Reset filter
            </button>
          </li>
        ) : null}
      </ul>

      {view.pageCount > 1 ? (
        <nav
          aria-label="Halaman daftar tamu"
          className="flex items-center justify-between gap-2 text-sm"
        >
          <button
            type="button"
            disabled={view.page <= 1}
            onClick={() => setPage(view.page - 1)}
            className="min-h-11 rounded-full border border-line px-4 py-2 hover:bg-cream-200 disabled:opacity-50"
          >
            Sebelumnya
          </button>
          <span className="text-xs text-ink-soft" aria-live="polite">
            Halaman {view.page} dari {view.pageCount}
          </span>
          <button
            type="button"
            disabled={view.page >= view.pageCount}
            onClick={() => setPage(view.page + 1)}
            className="min-h-11 rounded-full border border-line px-4 py-2 hover:bg-cream-200 disabled:opacity-50"
          >
            Berikutnya
          </button>
        </nav>
      ) : null}
    </section>
  );
}

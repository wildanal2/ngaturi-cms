"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

// 16px on phones: Safari zooms into any smaller focused field.
const control =
  "min-h-11 w-full rounded-lg border border-line bg-paper px-3 py-2 text-base sm:text-sm";
const secondary =
  "min-h-11 rounded-full px-3 py-2 text-xs font-medium text-ink-soft underline-offset-2 hover:bg-cream-200 hover:text-ink focus-visible:outline-2 focus-visible:outline-forest disabled:opacity-50 disabled:no-underline";
const menuItem =
  "flex min-h-11 w-full items-center rounded-lg px-3 py-2 text-left text-sm hover:bg-cream-200 focus-visible:outline-2 focus-visible:outline-forest disabled:opacity-50";

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
type Override = {
  field: "guestName" | "guestGroup";
  from: string | null;
  to: string | null;
};

export function GuestList(props: GuestListProps) {
  const { guests, canEdit, nameMax } = props;
  const [filters, setFilters] = useState<GuestFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const triggers = useRef(new Map<string, HTMLButtonElement>());
  const editorRef = useRef<HTMLDivElement>(null);
  // Shown until the refreshed server data arrives; ignored once the stored value
  // moves on, so it can never overwrite newer server data.
  const [overrides, setOverrides] = useState<Record<string, Override>>({});

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

  // Keep a freshly opened editor on screen above the on-screen keyboard.
  const editingId = editing?.id;
  useEffect(() => {
    if (editingId) editorRef.current?.scrollIntoView({ block: "nearest" });
  }, [editingId]);

  // An open menu closes on any outside click or Escape (it lives in the card, so
  // it can never be clipped by a container).
  useEffect(() => {
    if (!menuFor) return;
    const close = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest("[data-card-menu]")) setMenuFor(null);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuFor]);

  // Move focus into a menu once, when it opens.
  useEffect(() => {
    if (!menuFor) return;
    document
      .querySelector<HTMLButtonElement>(
        `#menu-${CSS.escape(menuFor)} [role=menuitem]:not([aria-disabled=true])`,
      )
      ?.focus();
  }, [menuFor]);

  function update(patch: Partial<GuestFilters>) {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }

  function focusTrigger(id: string) {
    requestAnimationFrame(() => triggers.current.get(id)?.focus());
  }

  function start(guest: ListGuest, kind: "name" | "category") {
    setMenuFor(null);
    setConfirmDelete(null);
    setEditing({ id: guest.id, kind });
    setDraft(kind === "name" ? guest.guestName : (guest.guestGroup ?? ""));
    setEditError(null);
  }

  function stop(id: string) {
    setEditing(null);
    setEditError(null);
    focusTrigger(id);
  }

  /** Runs a server mutation; always restores the loading state and never double-submits. */
  async function run(
    task: () => Promise<string | null>,
  ): Promise<string | null> {
    if (savingRef.current) return "busy";
    savingRef.current = true;
    setSaving(true);
    try {
      return await task();
    } catch {
      return "Koneksi bermasalah. Periksa jaringan lalu coba lagi.";
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function save(guest: ListGuest) {
    if (!editing) return;
    const kind = editing.kind;
    const value = draft.trim();
    if (kind === "name" && !value) {
      setEditError("Nama tamu wajib diisi.");
      return;
    }
    if (kind === "name" && nameLocked(guest)) return;
    setEditError(null);
    const category = normalizeCategory(draft) || null;
    const error = await run(() =>
      kind === "name"
        ? props.onRename(guest, value)
        : props.onCategory(guest, category),
    );
    if (error === "busy") return;
    if (error) {
      // The draft stays in the field so nothing typed is lost.
      setEditError(error);
      return;
    }
    setOverrides((prev) => ({
      ...prev,
      [guest.id]:
        kind === "name"
          ? { field: "guestName", from: guest.guestName, to: value }
          : { field: "guestGroup", from: guest.guestGroup, to: category },
    }));
    toast.success(kind === "name" ? "Nama diperbarui" : "Kategori diperbarui");
    stop(guest.id);
  }

  async function removeCategory(guest: ListGuest) {
    setMenuFor(null);
    const error = await run(() => props.onCategory(guest, null));
    if (error === "busy") return;
    if (error) return void toast.error(error);
    setOverrides((prev) => ({
      ...prev,
      [guest.id]: { field: "guestGroup", from: guest.guestGroup, to: null },
    }));
    toast.success("Kategori dihapus");
    focusTrigger(guest.id);
  }

  async function copy(guest: ListGuest) {
    try {
      await navigator.clipboard.writeText(props.link(guest));
      toast.success("Tautan disalin");
    } catch {
      toast.error("Gagal menyalin. Salin manual dari tombol Kirim WA.");
    }
  }

  function menuKeys(event: React.KeyboardEvent<HTMLUListElement>, id: string) {
    const items = [
      ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
        "[role=menuitem]:not([aria-disabled=true])",
      ),
    ];
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    const go = (i: number) => {
      event.preventDefault();
      items[(i + items.length) % items.length]?.focus();
    };
    if (event.key === "ArrowDown") go(at + 1);
    else if (event.key === "ArrowUp") go(at - 1);
    else if (event.key === "Home") go(0);
    else if (event.key === "End") go(items.length - 1);
    else if (event.key === "Escape") {
      event.preventDefault();
      setMenuFor(null);
      focusTrigger(id);
    } else if (event.key === "Tab") setMenuFor(null);
  }

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  };

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
            ["Dikirim", stats.sent],
            ["Dibuka", stats.opened],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label}
            className="min-w-0 rounded-xl border border-line bg-paper p-3"
          >
            <p className="text-xl font-medium">{value}</p>
            <p className="truncate text-xs text-ink-soft">{label}</p>
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
            className={`${control} min-w-0`}
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
            {activeFilters ? ` · ${activeFilters} filter aktif` : ""}
          </span>
          {activeFilters ? (
            <button type="button" onClick={resetFilters} className={secondary}>
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
          const menuOpen = menuFor === g.id;
          const deleting = confirmDelete === g.id;
          const hasMenu = canEdit || !!props.onDelete;
          return (
            <li
              key={g.id}
              className="space-y-3 rounded-xl border border-line bg-paper p-4 text-sm"
            >
              <div className="min-w-0">
                <p className="[overflow-wrap:anywhere] font-medium">
                  {g.guestName}
                </p>
                <p className="[overflow-wrap:anywhere] text-xs text-muted">
                  {g.whatsappPhone ? `${g.whatsappPhone} · ` : ""}Maks{" "}
                  {g.maxGuests} tamu
                </p>
                {category ? (
                  <span className="mt-1.5 inline-block max-w-full truncate rounded-full bg-cream-200 px-2.5 py-0.5 align-top text-xs text-ink-soft">
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
                <div
                  ref={editorRef}
                  className="space-y-2 rounded-lg bg-cream-200/60 p-3"
                >
                  {isEditing === "name" ? (
                    <label className="block text-xs text-ink-soft">
                      Nama tamu
                      <input
                        autoFocus
                        value={draft}
                        maxLength={nameMax}
                        disabled={saving}
                        enterKeyHint="done"
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void save(g);
                          } else if (event.key === "Escape") stop(g.id);
                        }}
                        className={`${control} mt-1`}
                      />
                    </label>
                  ) : (
                    <CategoryCombobox
                      autoFocus
                      value={draft}
                      onChange={setDraft}
                      options={categories}
                      disabled={saving}
                    />
                  )}
                  {isEditing === "name" && locked ? (
                    <p role="alert" className="text-xs text-wine">
                      {NAME_LOCKED_MESSAGE} Status terbaru sudah ditampilkan;
                      teks yang Anda ketik masih ada di kolom ini sampai Anda
                      menekan Batal.
                    </p>
                  ) : editError ? (
                    <p role="alert" className="text-xs text-wine">
                      {editError}
                    </p>
                  ) : null}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={saving || (isEditing === "name" && locked)}
                      onClick={() => void save(g)}
                      className="min-h-11 rounded-full bg-forest px-5 py-2 text-sm font-medium text-cream disabled:opacity-60"
                    >
                      {saving ? "Menyimpan…" : "Simpan"}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => stop(g.id)}
                      className="min-h-11 rounded-full border border-line px-5 py-2 text-sm"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : null}

              {deleting ? (
                <div
                  role="alertdialog"
                  aria-label={`Hapus ${g.guestName}?`}
                  className="space-y-2 rounded-lg border border-wine/30 bg-wine/5 p-3"
                >
                  <p className="text-xs">
                    Hapus <strong>{g.guestName}</strong>? Tautan personalnya
                    berhenti berfungsi dan tindakan ini tidak dapat dibatalkan.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      autoFocus
                      onClick={() => {
                        setConfirmDelete(null);
                        focusTrigger(g.id);
                      }}
                      className="min-h-11 rounded-full border border-line px-5 py-2 text-sm"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      disabled={props.busy}
                      onClick={() => {
                        setConfirmDelete(null);
                        props.onDelete?.(g);
                      }}
                      className="min-h-11 rounded-full bg-wine px-5 py-2 text-sm font-medium text-cream disabled:opacity-60"
                    >
                      Ya, hapus
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2">
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
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-forest px-4 py-2 font-medium text-cream"
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

              {hasMenu ? (
                <div data-card-menu>
                  <button
                    type="button"
                    ref={(el) => {
                      if (el) triggers.current.set(g.id, el);
                      else triggers.current.delete(g.id);
                    }}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    aria-controls={`menu-${g.id}`}
                    aria-label={`Tindakan lain untuk ${g.guestName}`}
                    onClick={() => {
                      setConfirmDelete(null);
                      setMenuFor(menuOpen ? null : g.id);
                    }}
                    className={`${secondary} -ml-1 inline-flex items-center gap-1`}
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                      className="size-4"
                      fill="currentColor"
                    >
                      <circle cx="3" cy="8" r="1.4" />
                      <circle cx="8" cy="8" r="1.4" />
                      <circle cx="13" cy="8" r="1.4" />
                    </svg>
                    Lainnya
                  </button>
                  {menuOpen ? (
                    <ul
                      id={`menu-${g.id}`}
                      role="menu"
                      aria-label={`Tindakan untuk ${g.guestName}`}
                      onKeyDown={(event) => menuKeys(event, g.id)}
                      className="mt-1 space-y-0.5 rounded-xl border border-line bg-paper p-1"
                    >
                      {canEdit ? (
                        <>
                          <li role="none">
                            <button
                              type="button"
                              role="menuitem"
                              aria-disabled={locked || saving}
                              onClick={() => !locked && start(g, "name")}
                              className={`${menuItem} ${locked ? "text-muted" : ""}`}
                            >
                              Edit nama
                            </button>
                            {locked ? (
                              <p className="px-3 pb-1 text-xs text-muted">
                                {NAME_LOCKED_MESSAGE}
                              </p>
                            ) : null}
                          </li>
                          <li role="none">
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => start(g, "category")}
                              className={menuItem}
                            >
                              Ubah kategori
                            </button>
                          </li>
                          {category ? (
                            <li role="none">
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => void removeCategory(g)}
                                className={menuItem}
                              >
                                Hapus kategori
                              </button>
                            </li>
                          ) : null}
                        </>
                      ) : null}
                      {props.onDelete ? (
                        <li role="none">
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setMenuFor(null);
                              setConfirmDelete(g.id);
                            }}
                            className={`${menuItem} text-wine`}
                          >
                            Hapus tamu
                          </button>
                        </li>
                      ) : null}
                    </ul>
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
            <button type="button" onClick={resetFilters} className={secondary}>
              Reset filter
            </button>
          </li>
        ) : null}
      </ul>

      {view.pageCount > 1 ? (
        <nav
          aria-label="Halaman daftar tamu"
          className="flex items-center justify-between gap-2 pb-[env(safe-area-inset-bottom)] text-sm"
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

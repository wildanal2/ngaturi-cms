"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  CATEGORY_MAX,
  categoryKey,
  normalizeCategory,
} from "@/lib/invitation/guest-list";

type Option =
  | { kind: "none" }
  | { kind: "existing"; label: string }
  | { kind: "create"; label: string };

/**
 * Searchable single-category input (ARIA combobox + listbox). The text itself is
 * the value, so typing a new name creates a category; choosing "Tanpa kategori"
 * clears it. The server stores the existing spelling when the name matches one
 * case-insensitively.
 */
export function CategoryCombobox({
  value,
  onChange,
  options,
  label = "Kategori Tamu",
  disabled,
  name,
  compact,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  label?: string;
  disabled?: boolean;
  /** Renders a hidden input so the value travels with a plain form post. */
  name?: string;
  compact?: boolean;
  autoFocus?: boolean;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const pointerDown = useRef(false);
  const [open, setOpen] = useState(false);
  // null = follow the default (best match); set once the user moves with the arrows.
  const [cursor, setCursor] = useState<number | null>(null);

  const list = useMemo<Option[]>(() => {
    const q = categoryKey(value);
    const matches = options.filter((o) => !q || categoryKey(o).includes(q));
    const exact = options.some((o) => categoryKey(o) === q);
    return [
      { kind: "none" },
      ...matches.map((label): Option => ({ kind: "existing", label })),
      ...(q && !exact
        ? [{ kind: "create", label: normalizeCategory(value) } as Option]
        : []),
    ];
  }, [options, value]);

  const active = Math.min(
    list.length - 1,
    cursor ?? (value.trim() && list.length > 1 ? 1 : 0),
  );

  // The list sits in the page flow (never over the Simpan/Tambah buttons). Closing it
  // shifts the layout, so a pointer press must finish its click before it closes:
  // outside clicks close it after delivery, keyboard blur closes it at once.
  useEffect(() => {
    if (!open) return;
    const down = () => {
      pointerDown.current = true;
    };
    const click = (event: MouseEvent) => {
      pointerDown.current = false;
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("click", click, true);
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("click", click, true);
    };
  }, [open]);

  function pick(option: Option | undefined) {
    if (!option) return;
    onChange(option.kind === "none" ? "" : option.label);
    setOpen(false);
    setCursor(null);
  }

  const optionLabel = (o: Option) =>
    o.kind === "none"
      ? "Tanpa kategori"
      : o.kind === "create"
        ? `Buat kategori “${o.label}”`
        : o.label;

  return (
    <div ref={root} className="min-w-0">
      {compact ? null : (
        <label
          htmlFor={`${id}-in`}
          className="mb-1 block text-xs text-ink-soft"
        >
          {label}
        </label>
      )}
      <input
        id={`${id}-in`}
        role="combobox"
        aria-label={compact ? label : undefined}
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={open ? `${id}-o${active}` : undefined}
        autoComplete="off"
        autoFocus={autoFocus}
        enterKeyHint="done"
        disabled={disabled}
        maxLength={CATEGORY_MAX}
        value={value}
        placeholder="Pilih atau ketik kategori"
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setCursor(null);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          if (!pointerDown.current) setOpen(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setCursor(Math.min(list.length - 1, active + 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setCursor(Math.max(0, active - 1));
          } else if (event.key === "Enter" && open) {
            event.preventDefault();
            pick(list[active]);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        className="min-h-11 w-full rounded-lg border border-line bg-paper px-3 py-2 text-base sm:text-sm"
      />
      {name ? (
        <input type="hidden" name={name} value={normalizeCategory(value)} />
      ) : null}
      {open ? (
        <ul
          id={`${id}-list`}
          role="listbox"
          aria-label={label}
          className="mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-line bg-paper py-1 text-sm"
        >
          {list.map((option, index) => (
            <li
              key={`${option.kind}-${"label" in option ? option.label : ""}`}
              id={`${id}-o${index}`}
              role="option"
              aria-selected={index === active}
              // mousedown fires before the input blur that would close the list
              onMouseDown={(event) => {
                event.preventDefault();
                pick(option);
              }}
              className={`min-h-11 cursor-pointer px-3 py-2.5 ${
                index === active ? "bg-cream-200" : ""
              } ${option.kind === "none" ? "text-muted" : ""}`}
            >
              {optionLabel(option)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

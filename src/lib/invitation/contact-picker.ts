interface Contact {
  name?: string[];
  tel?: string[];
}

export interface ContactPicker {
  select(
    properties: ("name" | "tel")[],
    options: { multiple: false },
  ): Promise<Contact[]>;
}

export function getContactPicker(): ContactPicker | null {
  if (
    typeof window === "undefined" ||
    !window.isSecureContext ||
    window.top !== window
  )
    return null;
  const picker = (navigator as Navigator & { contacts?: ContactPicker })
    .contacts;
  return typeof picker?.select === "function" ? picker : null;
}

/** Comparison only; leave stored numbers and the existing WA sender untouched. */
export function contactPhoneKey(phone: string): string {
  return phone.replace(/[^0-9]/g, "").replace(/^0/, "62");
}

export function isDuplicateContactPhone(
  phone: string,
  existing: (string | null)[],
): boolean {
  const key = contactPhoneKey(phone);
  return (
    !!key &&
    existing.some((value) => value != null && contactPhoneKey(value) === key)
  );
}

export async function pickGuestContact(picker: ContactPicker) {
  try {
    // Call before any await to preserve the click's transient activation.
    const [contact] = await picker.select(["name", "tel"], { multiple: false });
    if (!contact) return null;
    const phones = (contact.tel ?? [])
      .map((phone) => phone.trim().slice(0, 50))
      .filter((phone) => contactPhoneKey(phone));
    return {
      name:
        (contact.name ?? [])
          .find((name) => name.trim())
          ?.trim()
          .slice(0, 200) || "",
      phones: phones.filter(
        (phone, index) =>
          phones.findIndex(
            (other) => contactPhoneKey(other) === contactPhoneKey(phone),
          ) === index,
      ),
    };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "AbortError"
    )
      return null;
    throw error;
  }
}

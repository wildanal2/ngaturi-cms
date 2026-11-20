const fmt = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Fixed zone keeps server HTML and hydrated client text identical. */
export const formatDelegateDate = (iso: string) =>
  `${fmt.format(new Date(iso))} WIB`;

export const DELEGATE_FAILURE_COPY = {
  invalid: {
    title: "Tautan tidak valid",
    body: "Tautan ini tidak dikenali. Periksa kembali tautan yang Anda terima atau minta tautan baru kepada pembuat undangan.",
  },
  expired: {
    title: "Tautan sudah kedaluwarsa",
    body: "Masa berlaku akses ini telah berakhir. Minta tautan baru kepada pembuat undangan.",
  },
  revoked: {
    title: "Akses telah dicabut",
    body: "Pembuat undangan telah mencabut akses ini. Tautan undangan tamu yang sudah dibagikan tetap dapat dipakai.",
  },
  rate_limited: {
    title: "Terlalu banyak permintaan",
    body: "Silakan tunggu beberapa menit lalu muat ulang halaman ini.",
  },
  unavailable: {
    title: "Layanan sedang bermasalah",
    body: "Data belum dapat dimuat. Silakan coba lagi beberapa saat lagi.",
  },
} as const;

export const RSVP_LABEL = {
  attending: "Hadir",
  not_attending: "Tidak hadir",
  maybe: "Belum pasti",
  pending: "Belum pasti",
} as const;

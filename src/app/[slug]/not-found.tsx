import Link from "next/link";

export default function InvitationNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="font-[family-name:var(--font-fraunces)] text-3xl">
        Undangan tidak ditemukan
      </h1>
      <p className="text-gray-500">
        Tautan mungkin salah, atau undangan sudah tidak aktif.
      </p>
      <Link href="/" className="mt-2 text-forest underline">
        Ke halaman utama
      </Link>
    </main>
  );
}

"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "@/lib/auth/client";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    setLoading(true);
    await signIn.social({ provider: "google", callbackURL: next });
    // redirect ditangani Better Auth; kalau gagal:
    setLoading(false);
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Masuk ke Ngaturi</h1>
          <p className="text-sm text-zinc-500">
            Buat undangan digital yang cantik dalam hitungan menit.
          </p>
        </div>
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:opacity-60"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.4 5.4 2.5 13.3l7.8 6C12.2 13.2 17.6 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.5 2.9-2.1 5.3-4.6 7l7.1 5.5C43.6 37.4 46.5 31.5 46.5 24.5z" />
            <path fill="#FBBC05" d="M10.3 28.7c-.5-1.4-.7-2.9-.7-4.7s.3-3.3.7-4.7l-7.8-6C.9 16.5 0 20.1 0 24s.9 7.5 2.5 10.7l7.8-6z" />
            <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.1-5.5c-2 1.3-4.6 2.1-8.1 2.1-6.4 0-11.8-3.7-13.7-9.8l-7.8 6C6.4 42.6 14.6 48 24 48z" />
          </svg>
          {loading ? "Menghubungkan…" : "Lanjutkan dengan Google"}
        </button>
        <p className="text-xs text-zinc-400">
          Dengan masuk, kamu setuju dengan Syarat &amp; Kebijakan Privasi kami.
        </p>
      </div>
    </main>
  );
}

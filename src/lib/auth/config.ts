import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { redis } from "@/lib/redis";
import { env } from "@/lib/env";

/**
 * Better Auth — Google OAuth ONLY (no email/password).
 * Sessions disimpan di Redis (secondaryStorage).
 */
export const auth = betterAuth({
  appName: "Ngaturi",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,

  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
    schema,
  }),

  secondaryStorage: {
    get: (key) => redis.get(key),
    set: (key, value, ttl) =>
      ttl ? redis.set(key, value, "EX", ttl) : redis.set(key, value),
    delete: (key) => redis.del(key).then(() => undefined),
    getAndDelete: async (key) => {
      const value = await redis.get(key);
      if (value !== null) await redis.del(key);
      return value;
    },
    increment: (key) => redis.incr(key),
  },

  emailAndPassword: { enabled: false },

  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      // minta refresh_token dari Google (disimpan di tabel accounts) supaya
      // access token Google bisa di-refresh tanpa login ulang
      accessType: "offline",
      prompt: "select_account consent",
    },
  },

  user: {
    additionalFields: {
      role: { type: "string", input: false, defaultValue: "user" },
      status: { type: "string", input: false, defaultValue: "active" },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 60, // 60 hari
    updateAge: 60 * 60 * 24, // rolling: tiap kunjungan >1 hari, sesi diperpanjang lagi
    // cache sesi di cookie bertanda tangan → sebagian besar request tidak
    // perlu menyentuh Redis, jadi sesi tidak "hilang" saat Redis lambat
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },

  advanced: {
    useSecureCookies: env.NODE_ENV === "production",
    defaultCookieAttributes: {
      sameSite: "lax",
      path: "/",
    },
  },

  trustedOrigins: [env.BETTER_AUTH_URL, env.NEXT_PUBLIC_APP_URL].filter(
    (v, i, a) => v && a.indexOf(v) === i,
  ),

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Pastikan tiap user punya row user_profiles.
          await db
            .insert(schema.userProfiles)
            .values({ userId: user.id })
            .onConflictDoNothing();
        },
      },
    },
  },

  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;

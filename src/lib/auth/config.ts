import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { redis } from "@/lib/redis";
import { env } from "@/lib/env";

const secureAuthOrigin =
  env.NODE_ENV === "production" ||
  new URL(env.BETTER_AUTH_URL).protocol === "https:";

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
    set: (key, value, ttl) => redis.set(key, value, ttl),
    delete: (key) => redis.delete(key),
    getAndDelete: (key) => redis.getAndDelete(key),
    increment: (key, ttl) => redis.incrementWithTtl(key, ttl),
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

  rateLimit: {
    enabled: secureAuthOrigin,
    storage: "secondary-storage",
  },

  advanced: {
    useSecureCookies: secureAuthOrigin,
    // OAuth/callback URLs come from the canonical static baseURL. Do not let
    // client-controlled forwarded headers redefine the authentication origin.
    trustedProxyHeaders: false,
    ipAddress: {
      // Cloudflare supplies CF-Connecting-IP at the Worker boundary. Keep the
      // standard header as the Node/local fallback.
      ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"],
    },
    defaultCookieAttributes: {
      sameSite: "lax",
      path: "/",
    },
  },

  trustedOrigins: [new URL(env.BETTER_AUTH_URL).origin],

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

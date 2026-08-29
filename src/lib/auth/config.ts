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
    },
  },

  user: {
    additionalFields: {
      role: { type: "string", input: false, defaultValue: "user" },
      status: { type: "string", input: false, defaultValue: "active" },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 hari
    updateAge: 60 * 60 * 24, // refresh tiap 1 hari
  },

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

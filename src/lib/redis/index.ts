import Redis from "ioredis";
import { env } from "@/lib/env";

declare global {
   
  var __redisClient: Redis | undefined;
}

export const redis =
  globalThis.__redisClient ??
  new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3, lazyConnect: false });

if (env.NODE_ENV !== "production") globalThis.__redisClient = redis;

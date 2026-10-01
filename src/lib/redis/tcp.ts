import Redis from "ioredis";
import { INCREMENT_WITH_TTL } from "./scripts";
import type { RedisStore } from "./types";

declare global {
  var __redisTcpClient: Redis | undefined;
}

export interface RedisTcpConfig {
  url?: string;
  cacheClient?: boolean;
}

export function createRedisTcpAdapter(config: RedisTcpConfig): RedisStore {
  let redisClient: Redis | undefined;

  function client(): Redis {
    if (!config.url) {
      throw new Error(
        "Redis TCP is not configured for the Node runtime; set REDIS_URL",
      );
    }

    const existing = config.cacheClient
      ? globalThis.__redisTcpClient
      : redisClient;
    if (existing) return existing;

    const created = new Redis(config.url, {
      maxRetriesPerRequest: 3,
      // Avoid opening sockets during module evaluation and Next.js builds.
      lazyConnect: true,
    });
    if (config.cacheClient) {
      globalThis.__redisTcpClient = created;
    } else {
      redisClient = created;
    }
    return created;
  }

  return {
    get(key) {
      return client().get(key);
    },
    async set(key, value, ttl) {
      if (ttl) {
        await client().set(key, value, "EX", ttl);
      } else {
        await client().set(key, value);
      }
    },
    async delete(key) {
      await client().del(key);
    },
    getAndDelete(key) {
      return client().getdel(key);
    },
    increment(key) {
      return client().incr(key);
    },
    async incrementWithTtl(key, ttl) {
      const result = await client().eval(INCREMENT_WITH_TTL, 1, key, ttl);
      return Number(result);
    },
  };
}

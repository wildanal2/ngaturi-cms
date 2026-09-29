import { Redis } from "@upstash/redis";
import { INCREMENT_WITH_TTL } from "./scripts";
import type { RedisStore } from "./types";

export interface RedisRestConfig {
  url?: string;
  token?: string;
}

export function createRedisRestAdapter(config: RedisRestConfig): RedisStore {
  let redisClient: Redis | undefined;

  function client(): Redis {
    if (!config.url || !config.token) {
      throw new Error(
        "Redis REST is not configured; set REDIS_REST_URL and REDIS_REST_TOKEN",
      );
    }

    redisClient ??= new Redis({
      url: config.url,
      token: config.token,
    });
    return redisClient;
  }

  return {
    get(key) {
      return client().get<string>(key);
    },
    async set(key, value, ttl) {
      if (ttl) {
        await client().set(key, value, { ex: ttl });
      } else {
        await client().set(key, value);
      }
    },
    async delete(key) {
      await client().del(key);
    },
    getAndDelete(key) {
      return client().getdel<string>(key);
    },
    increment(key) {
      return client().incr(key);
    },
    incrementWithTtl(key, ttl) {
      return client().eval<[number], number>(INCREMENT_WITH_TTL, [key], [ttl]);
    },
  };
}

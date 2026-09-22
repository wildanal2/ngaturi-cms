import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

const INCREMENT_WITH_TTL = `
local value = redis.call("INCR", KEYS[1])
if value == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
return value
`;

function client(): Redis {
  if (!env.REDIS_REST_URL || !env.REDIS_REST_TOKEN) {
    throw new Error("Redis REST is not configured");
  }
  return new Redis({
    url: env.REDIS_REST_URL,
    token: env.REDIS_REST_TOKEN,
  });
}

/** Fetch-based Redis operations safe for Node and Workers. */
export const redis = {
  get(key: string): Promise<string | null> {
    return client().get<string>(key);
  },
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await client().set(key, value, { ex: ttl });
    } else {
      await client().set(key, value);
    }
  },
  async delete(key: string): Promise<void> {
    await client().del(key);
  },
  getAndDelete(key: string): Promise<string | null> {
    return client().getdel<string>(key);
  },
  increment(key: string): Promise<number> {
    return client().incr(key);
  },
  incrementWithTtl(key: string, ttl: number): Promise<number> {
    return client().eval<[number], number>(INCREMENT_WITH_TTL, [key], [ttl]);
  },
};

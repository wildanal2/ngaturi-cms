import { env } from "@/lib/env";
import { createRuntimeRedisAdapter } from "@/lib/redis/runtime";
import type { RedisStore } from "@/lib/redis/types";

/** Shared Redis interface; transport is selected by the runtime build. */
let adapter: RedisStore | undefined;
function getAdapter(): RedisStore {
  adapter ??= createRuntimeRedisAdapter(env);
  return adapter;
}

export const redis: RedisStore = {
  get: (key) => getAdapter().get(key),
  set: (key, value, ttl) => getAdapter().set(key, value, ttl),
  delete: (key) => getAdapter().delete(key),
  getAndDelete: (key) => getAdapter().getAndDelete(key),
  increment: (key) => getAdapter().increment(key),
  incrementWithTtl: (key, ttl) => getAdapter().incrementWithTtl(key, ttl),
};

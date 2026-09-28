import { createRedisTcpAdapter } from "./tcp";
import type { RedisStore } from "./types";

export interface RuntimeRedisConfig {
  REDIS_URL?: string;
  NODE_ENV?: string;
}

export const runtimeRedisTransport = "tcp" as const;

/** Node.js/PM2 runtime adapter. Replaced at build time by vinext for Workers. */
export function createRuntimeRedisAdapter(
  config: RuntimeRedisConfig,
): RedisStore {
  return createRedisTcpAdapter({
    url: config.REDIS_URL,
    cacheClient: config.NODE_ENV !== "test",
  });
}

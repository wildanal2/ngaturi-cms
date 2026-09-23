import { createRedisRestAdapter } from "./rest";
import type { RedisStore } from "./types";

export interface RuntimeRedisConfig {
  REDIS_REST_URL?: string;
  REDIS_REST_TOKEN?: string;
}

export const runtimeRedisTransport = "rest" as const;

/** Cloudflare Worker adapter selected by the vinext Vite build alias. */
export function createRuntimeRedisAdapter(
  config: RuntimeRedisConfig,
): RedisStore {
  return createRedisRestAdapter({
    url: config.REDIS_REST_URL,
    token: config.REDIS_REST_TOKEN,
  });
}

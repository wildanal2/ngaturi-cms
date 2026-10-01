import { createRedisTcpAdapter } from "./tcp";
import { createRedisRestAdapter } from "./rest";
import type { RedisStore } from "./types";

export interface RuntimeRedisConfig {
  REDIS_TRANSPORT?: "rest" | "tcp";
  REDIS_REST_URL?: string;
  REDIS_REST_TOKEN?: string;
  REDIS_URL?: string;
  NODE_ENV?: string;
}

/** REST is primary. TCP requires an explicit, unmixed legacy configuration. */
export function createRuntimeRedisAdapter(
  config: RuntimeRedisConfig,
): RedisStore {
  if (config.REDIS_TRANSPORT !== "tcp") {
    if (!config.REDIS_REST_URL || !config.REDIS_REST_TOKEN) {
      throw new Error(
        "Node Redis REST requires REDIS_REST_URL and REDIS_REST_TOKEN; TCP fallback must be explicitly selected with REDIS_TRANSPORT=tcp",
      );
    }
    return createRedisRestAdapter({
      url: config.REDIS_REST_URL,
      token: config.REDIS_REST_TOKEN,
    });
  }
  if (config.REDIS_REST_URL || config.REDIS_REST_TOKEN) {
    throw new Error(
      "REDIS_TRANSPORT=tcp cannot be combined with Redis REST credentials",
    );
  }
  if (!config.REDIS_URL) {
    throw new Error("REDIS_TRANSPORT=tcp requires REDIS_URL");
  }
  return createRedisTcpAdapter({
    url: config.REDIS_URL,
    cacheClient: config.NODE_ENV !== "test",
  });
}

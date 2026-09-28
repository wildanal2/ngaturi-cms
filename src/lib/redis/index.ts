import { env } from "@/lib/env";
import { createRuntimeRedisAdapter } from "@/lib/redis/runtime";

/** Shared Redis interface; transport is selected by the runtime build. */
export const redis = createRuntimeRedisAdapter(env);

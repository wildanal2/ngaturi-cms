import { redis } from "@/lib/redis";

/**
 * Fixed-window rate limiter backed by Redis.
 * @returns true jika request masih diizinkan.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const redisKey = `rl:${key}`;
  const count = await redis.incrementWithTtl(redisKey, windowSeconds);
  return count <= limit;
}

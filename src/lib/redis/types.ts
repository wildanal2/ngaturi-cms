export interface RedisStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  getAndDelete(key: string): Promise<string | null>;
  increment(key: string): Promise<number>;
  incrementWithTtl(key: string, ttl: number): Promise<number>;
}

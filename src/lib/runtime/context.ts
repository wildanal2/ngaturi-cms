import { AsyncLocalStorage } from "node:async_hooks";

export interface HyperdriveBinding {
  connectionString: string;
}

export interface R2ObjectBody {
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface R2BucketBinding {
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | ReadableStream,
    options?: {
      httpMetadata?: {
        contentType?: string;
        cacheControl?: string;
      };
    },
  ): Promise<unknown>;
  get(key: string): Promise<R2ObjectBody | null>;
}

export interface ImagesBinding {
  info(input: ReadableStream<Uint8Array>): Promise<{
    width?: number;
    height?: number;
  }>;
  input(input: ReadableStream<Uint8Array>): ImagesTransform;
}

export interface ImagesTransform {
  transform(options: Record<string, unknown>): ImagesTransform;
  output(options: {
    format: string;
    quality?: number;
  }): Promise<{ response(): Response }>;
}

export interface NgaturiWorkerEnv {
  HYPERDRIVE?: HyperdriveBinding;
  MEDIA_BUCKET?: R2BucketBinding;
  IMAGES?: ImagesBinding;
  ASSETS?: { fetch(request: Request): Promise<Response> };
  R2_PUBLIC_URL?: string;
  REDIS_REST_URL?: string;
  REDIS_REST_TOKEN?: string;
  [key: string]: unknown;
}

interface InvocationContext {
  env: NgaturiWorkerEnv;
  values: Map<symbol, unknown>;
}

const invocationStorage = new AsyncLocalStorage<InvocationContext>();

function isR2CustomDomain(value: string): boolean {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return (
      url.protocol === "https:" &&
      hostname !== "r2.dev" &&
      !hostname.endsWith(".r2.dev")
    );
  } catch {
    return false;
  }
}

/** Fail closed before application code runs with an incomplete Worker setup. */
export function assertWorkerRuntimeContract(env: NgaturiWorkerEnv): void {
  const missing: string[] = [];
  if (!env.HYPERDRIVE?.connectionString) missing.push("HYPERDRIVE");
  if (!env.MEDIA_BUCKET) missing.push("MEDIA_BUCKET");
  if (!env.R2_PUBLIC_URL) missing.push("R2_PUBLIC_URL");
  if (!env.IMAGES) missing.push("IMAGES");
  if (!env.ASSETS) missing.push("ASSETS");
  if (!env.REDIS_REST_URL) missing.push("REDIS_REST_URL");
  if (!env.REDIS_REST_TOKEN) missing.push("REDIS_REST_TOKEN");

  if (missing.length > 0) {
    throw new Error(
      `Worker runtime configuration is incomplete; missing: ${missing.join(", ")}`,
    );
  }

  if (!isR2CustomDomain(env.R2_PUBLIC_URL!)) {
    throw new Error(
      "Worker runtime configuration is invalid; R2_PUBLIC_URL must be an HTTPS R2 custom domain",
    );
  }
}

/** Run application work with bindings that belong to one Worker invocation. */
export function runWithInvocationContext<T>(
  env: NgaturiWorkerEnv,
  callback: () => T,
): T {
  return invocationStorage.run({ env, values: new Map() }, callback);
}

export function getWorkerEnv(): NgaturiWorkerEnv | undefined {
  return invocationStorage.getStore()?.env;
}

/** Lazily allocate a value once per fetch/scheduled invocation. */
export function getInvocationValue<T>(
  key: symbol,
  factory: () => T,
): T | undefined {
  const store = invocationStorage.getStore();
  if (!store) return undefined;

  if (!store.values.has(key)) {
    store.values.set(key, factory());
  }
  return store.values.get(key) as T;
}

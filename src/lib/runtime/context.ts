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
  HYPERDRIVE: HyperdriveBinding;
  MEDIA_BUCKET: R2BucketBinding;
  IMAGES: ImagesBinding;
  [key: string]: unknown;
}

interface InvocationContext {
  env: NgaturiWorkerEnv;
  values: Map<symbol, unknown>;
}

const invocationStorage = new AsyncLocalStorage<InvocationContext>();

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

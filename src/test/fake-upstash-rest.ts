import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

/**
 * Minimal Upstash REST protocol emulator (GET/SET/DEL/GETDEL/INCR/EVAL, TTLs,
 * base64 response encoding) so the real @upstash/redis client — including its
 * automatic JSON deserialization — runs unmodified in tests.
 */
export interface FakeUpstash {
  url: string;
  token: string;
  store: Map<string, { value: string; expiresAt: number | null }>;
  /** Make every following request fail like a Redis outage (HTTP 500). */
  failing: boolean;
  /** Pretend time moved forward so TTLs lapse. */
  advance(ms: number): void;
  close(): Promise<void>;
}

const b64 = (v: unknown): unknown =>
  typeof v === "string"
    ? Buffer.from(v, "utf8").toString("base64")
    : Array.isArray(v)
      ? v.map(b64)
      : v;

export async function startFakeUpstash(): Promise<FakeUpstash> {
  let offset = 0;
  const now = () => Date.now() + offset;
  const store: FakeUpstash["store"] = new Map();
  const live = (key: string) => {
    const e = store.get(key);
    if (e?.expiresAt != null && e.expiresAt <= now()) store.delete(key);
    return store.get(key);
  };
  const state = { failing: false };

  const run = (cmd: unknown[]): unknown => {
    const [name, ...a] = cmd.map((x, i) =>
      i === 0 ? String(x).toUpperCase() : x,
    );
    const key = String(a[0]);
    switch (name) {
      case "GET":
        return live(key)?.value ?? null;
      case "SET": {
        const opt = String(a[2] ?? "").toUpperCase();
        const ttl =
          opt === "EX"
            ? Number(a[3]) * 1000
            : opt === "PX"
              ? Number(a[3])
              : null;
        store.set(key, {
          value: String(a[1]),
          expiresAt: ttl ? now() + ttl : null,
        });
        return "OK";
      }
      case "DEL": {
        let n = 0;
        for (const k of a) if (live(String(k)) && store.delete(String(k))) n++;
        return n;
      }
      case "GETDEL": {
        const v = live(key)?.value ?? null;
        store.delete(key);
        return v;
      }
      case "INCR": {
        const e = live(key);
        const next = Number(e?.value ?? 0) + 1;
        store.set(key, {
          value: String(next),
          expiresAt: e?.expiresAt ?? null,
        });
        return next;
      }
      case "EVAL": {
        // INCREMENT_WITH_TTL: KEYS[1], ARGV[1] = ttl seconds
        const k = String(cmd[3]);
        const ttl = Number(cmd[4]);
        const e = live(k);
        const next = Number(e?.value ?? 0) + 1;
        store.set(k, {
          value: String(next),
          expiresAt: next === 1 ? now() + ttl * 1000 : (e?.expiresAt ?? null),
        });
        return next;
      }
      default:
        throw new Error(`ERR unknown command ${name}`);
    }
  };

  const server: Server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      res.setHeader("content-type", "application/json");
      if (state.failing) {
        res.statusCode = 500;
        return res.end(JSON.stringify({ error: "ERR simulated outage" }));
      }
      const encode = req.headers["upstash-encoding"] === "base64";
      const one = (cmd: unknown[]) => {
        try {
          const result = run(cmd);
          return { result: encode ? b64(result) : result };
        } catch (e) {
          return { error: String((e as Error).message) };
        }
      };
      const payload = JSON.parse(body);
      // The client auto-pipelines: /pipeline and /multi-exec carry an array of commands.
      if (/\/(pipeline|multi-exec)$/.test(req.url ?? "")) {
        return res.end(JSON.stringify((payload as unknown[][]).map(one)));
      }
      const out = one(payload);
      if ("error" in out) res.statusCode = 400;
      res.end(JSON.stringify(out));
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    token: "fake-token",
    store,
    get failing() {
      return state.failing;
    },
    set failing(v: boolean) {
      state.failing = v;
    },
    advance: (ms) => void (offset += ms),
    close: () => new Promise((r) => server.close(() => r())),
  };
}

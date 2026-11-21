/**
 * 手元の definy サーバーだけの能力 (`LocalIoHost`): `wasi.io` のプログラムを動かし (`definy_run_io`),
 * シークレットの値を `<data-dir>/secrets.json` に置く (docs/local-server.md「I/O をするプログラムの実行」)
 */
import { chmod, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  fetchHandler,
  formatWasiIoStep,
  runWasiIo,
  type WasiSecretValue,
} from "../src/wasi_io.ts";
import type { LocalIoHost, SecretInfo } from "../worker/service_io.ts";

/** `secrets.json` の 1 つ (ID ごと) */
type StoredSecret = {
  readonly label: string;
  readonly value: string;
  readonly allowedUrlPrefixes: ReadonlyArray<string>;
  readonly updatedMs: number;
};

type StoredSecrets = Readonly<Record<string, StoredSecret>>;

/**
 * 手元のサーバーの `LocalIoHost` を作る
 * @param dataDir シークレット (`secrets.json`, パーミッション 600) を置くフォルダ
 * @param fetchFn プログラムの HTTP リクエストを送る fetch
 * @param now 今の時刻 (ミリ秒)
 */
export function createLocalIoHost(options: {
  readonly dataDir: string;
  readonly fetchFn?: typeof fetch;
  readonly now?: () => number;
}): LocalIoHost {
  const path = join(options.dataDir, "secrets.json");
  const now = options.now ?? Date.now;

  const load = async (): Promise<StoredSecrets> => {
    try {
      return JSON.parse(await readFile(path, "utf8")) as StoredSecrets;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return {};
      }
      throw error;
    }
  };

  return {
    runWasiIo: async (wasm, parts) => {
      const secrets = await load();
      const steps: string[] = [];
      try {
        const message = await runWasiIo(
          new WebAssembly.Module(wasm as Uint8Array<ArrayBuffer>),
          {
            handle: fetchHandler(options.fetchFn ?? fetch),
            getPart: (id) => parts.get(id),
            getSecret: (id): WasiSecretValue | undefined => {
              const stored = secrets[id];
              return stored === undefined
                ? undefined
                : {
                    value: stored.value,
                    allowedUrlPrefixes: stored.allowedUrlPrefixes,
                  };
            },
            onStep: (step) => {
              steps.push(formatWasiIoStep(step));
            },
          },
        );
        return { ok: true, message, steps };
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : String(error),
          steps,
        };
      }
    },
    readSecrets: async () =>
      Object.entries(await load())
        .map(([id, secret]): SecretInfo => ({
          id,
          label: secret.label,
          allowedUrlPrefixes: secret.allowedUrlPrefixes,
          updatedMs: secret.updatedMs,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    writeSecret: async ({ id, label, value, allowedUrlPrefixes }) => {
      if (id === "") {
        return false;
      }
      const { [id]: _old, ...others } = await load();
      const next: StoredSecrets =
        value === ""
          ? others
          : {
              ...others,
              [id]: {
                label,
                value,
                allowedUrlPrefixes: allowedUrlPrefixes.filter(
                  (prefix) => prefix !== "",
                ),
                updatedMs: now(),
              },
            };
      await writeFile(path, JSON.stringify(next, null, 2), { mode: 0o600 });
      await chmod(path, 0o600);
      return true;
    },
  };
}

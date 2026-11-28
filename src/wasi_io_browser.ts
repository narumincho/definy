/**
 * ブラウザで `wasi.io` のプログラムを動かすときの設定, シークレットの値と使用履歴, サーバーでの実行.
 *
 * - シークレット (`Secret` 型) の値は, そのシークレットのパーツのページで利用者が入れ, localStorage にだけ保存する.
 *   入れたときの「送ってよい URL の先頭」も一緒に保存し, 送るときはパーツの式ではなく保存したほうで確かめる
 *   (他人が同じ ID で宛先を変えたシークレットを書いても, 値はその宛先に送られない)
 * - プログラムはブラウザ (HTTP はブラウザの `fetch`. CORS で読めなければ `error`) か, サーバー (`RunService/RunIo`.
 *   HTTP もシークレットもサーバーのもの) で最後まで動かす. サーバーで動かせるのはサーバーの管理者だけ.
 *   どちらで動かすかは実行パネルと設定画面で決める
 *
 * 詳細は docs/run-location.md, docs/wasi-io.md, docs/secret.md
 */
import type { AccountCredentials } from "./auth.ts";
import { bytesToBase64 } from "./base64.ts";
import { encodeCborItem } from "./cbor.ts";
import { createRpcAuthorization } from "./rpc_auth.ts";
import type { ServerRunProgram, ServerRunResult } from "./run_expression.ts";
import type { WasiSecretUse, WasiSecretValue } from "./wasi_io.ts";

/** `wasi.io` のプログラムを動かす場所 */
export type RunLocation = "browser" | "server";

type WasiIoSettings = {
  readonly runLocation: RunLocation;
};

const SETTINGS_KEY = "definy.wasi-io-settings";
const SECRETS_KEY = "definy.secrets";
const SECRET_USAGE_KEY = "definy.secret-usage";
/** 使用履歴はこれより古いものから消す */
const MAX_SECRET_USAGE = 500;

export const RUN_OPTIONS_PATH = "/definy.v1.RunService/GetRunOptions";
export const RUN_IO_PATH = "/definy.v1.RunService/RunIo";

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 保存できない環境 (プライベートモードなど) では保存しない
  }
}

export function loadWasiIoSettings(): WasiIoSettings {
  const json = readJson(SETTINGS_KEY) as {
    readonly runLocation?: unknown;
  } | null;
  return { runLocation: json?.runLocation === "server" ? "server" : "browser" };
}

export function saveWasiIoSettings(settings: WasiIoSettings): void {
  writeJson(SETTINGS_KEY, settings);
}

export type StoredSecret = WasiSecretValue & {
  readonly label: string;
  readonly updatedAt: string;
};

function loadSecrets(): Readonly<Record<string, StoredSecret>> {
  const json = readJson(SECRETS_KEY);
  return json !== null && typeof json === "object" && !Array.isArray(json)
    ? (json as Record<string, StoredSecret>)
    : {};
}

function isStoredSecret(stored: StoredSecret | undefined): boolean {
  return (
    stored !== undefined &&
    typeof stored.value === "string" &&
    Array.isArray(stored.allowedUrlPrefixes)
  );
}

/** 入れてあるシークレットの値 (無ければ `undefined`) */
export function loadSecret(id: string): StoredSecret | undefined {
  const stored = loadSecrets()[id];
  return isStoredSecret(stored) ? stored : undefined;
}

/** このブラウザに入れてあるすべてのシークレットの値 (ID → 値. 設定画面の一覧用) */
export function loadAllSecrets(): Readonly<Record<string, StoredSecret>> {
  return Object.fromEntries(
    Object.entries(loadSecrets()).filter(([, stored]) =>
      isStoredSecret(stored),
    ),
  );
}

/** シークレットの値と, 送ってよい URL の先頭を保存する */
export function saveSecret(
  id: string,
  secret: Omit<StoredSecret, "updatedAt">,
): void {
  writeJson(SECRETS_KEY, {
    ...loadSecrets(),
    [id]: { ...secret, updatedAt: new Date().toISOString() },
  });
}

export function deleteSecret(id: string): void {
  const { [id]: _removed, ...rest } = loadSecrets();
  writeJson(SECRETS_KEY, rest);
}

/** シークレットの使用履歴の 1 件 */
export type SecretUsageEntry = {
  readonly secretId: string;
  readonly label: string;
  readonly url: string;
  readonly sent: boolean;
  /** 実行したパーツ (`module.name`) */
  readonly partName: string;
  readonly time: string;
};

/** シークレットの使用履歴 (新しい順) */
export function loadSecretUsage(
  secretId: string,
): ReadonlyArray<SecretUsageEntry> {
  const json = readJson(SECRET_USAGE_KEY);
  return (Array.isArray(json) ? (json as SecretUsageEntry[]) : [])
    .filter((entry) => entry.secretId === secretId)
    .reverse();
}

/** シークレットごとの最後に使った (使おうとした) 記録 */
export function loadLatestSecretUsage(): ReadonlyMap<string, SecretUsageEntry> {
  const json = readJson(SECRET_USAGE_KEY);
  const latest = new Map<string, SecretUsageEntry>();
  for (const entry of Array.isArray(json) ? (json as SecretUsageEntry[]) : []) {
    latest.set(entry.secretId, entry);
  }
  return latest;
}

export function recordSecretUse(use: WasiSecretUse, partName: string): void {
  const json = readJson(SECRET_USAGE_KEY);
  const entries = Array.isArray(json) ? (json as SecretUsageEntry[]) : [];
  const entry: SecretUsageEntry = {
    secretId: use.secret.id,
    label: use.secret.label,
    url: use.url,
    sent: use.sent,
    partName,
    time: new Date().toISOString(),
  };
  writeJson(SECRET_USAGE_KEY, [...entries, entry].slice(-MAX_SECRET_USAGE));
}

/** 1 行に 1 つの URL の先頭 (空行は飛ばす) */
export function parseUrlPrefixes(text: string): ReadonlyArray<string> {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

/** 署名付きで JSON の RPC を送る */
async function signedRpc(
  path: string,
  request: unknown,
  credentials: AccountCredentials | null,
  fetchFn: typeof fetch,
): Promise<Response> {
  const body = JSON.stringify(request);
  return await fetchFn(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(credentials === null
        ? {}
        : {
            Authorization: await createRpcAuthorization(
              credentials,
              "POST",
              path,
              body,
            ),
          }),
    },
    body,
  });
}

/** `RunService/GetRunOptions` の応答 */
export type RunOptions = {
  /** このアカウントがサーバーの管理者 (`DEFINY_ADMIN_ACCOUNT_IDS`) か */
  readonly administrator: boolean;
  /** サーバーがプログラムを実行できるか (Node.js の definy サーバーだけ. Cloudflare Workers はできない) */
  readonly serverRun: boolean;
};

/**
 * このアカウントがどこでプログラムを動かせるか (`RunService/GetRunOptions`). `credentials` が `null` なら署名しない.
 * 聞けなければどちらも false
 */
export async function fetchRunOptions(
  credentials: AccountCredentials | null,
  fetchFn: typeof fetch = fetch,
): Promise<RunOptions> {
  try {
    const response = await signedRpc(
      RUN_OPTIONS_PATH,
      {},
      credentials,
      fetchFn,
    );
    if (!response.ok) {
      return { administrator: false, serverRun: false };
    }
    const json = (await response.json()) as Partial<RunOptions>;
    return {
      administrator: json.administrator === true,
      serverRun: json.serverRun === true,
    };
  } catch {
    return { administrator: false, serverRun: false };
  }
}

/**
 * コンパイルした `wasi.io` のプログラムをサーバーで最後まで動かす (`RunService/RunIo`. 管理者だけ).
 * パーツの式はストアの中身と同じ CBOR (Base64) で送る. サーバーに断られたときも `ok: false` の結果にする
 */
export async function runIoOnServer(
  program: ServerRunProgram,
  credentials: AccountCredentials,
  fetchFn: typeof fetch = fetch,
): Promise<ServerRunResult> {
  try {
    const response = await signedRpc(
      RUN_IO_PATH,
      {
        wasmBase64: bytesToBase64(program.wasm),
        parts: program.parts.map((part) => ({
          id: part.id,
          cbor: bytesToBase64(encodeCborItem(part.expression)),
        })),
      },
      credentials,
      fetchFn,
    );
    if (!response.ok) {
      const text = await response.text();
      let message = text;
      try {
        message =
          (JSON.parse(text) as { readonly message?: string }).message ?? text;
      } catch {
        // JSON でなければ本文のまま
      }
      return {
        ok: false,
        message: `サーバーで実行できませんでした (${response.status}): ${message}`,
        steps: [],
      };
    }
    const json = (await response.json()) as ServerRunResult;
    return { ok: json.ok, message: json.message, steps: json.steps };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : String(e),
      steps: [],
    };
  }
}

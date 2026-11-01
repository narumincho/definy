/**
 * ブラウザで `wasi.io` のプログラムを動かすときの設定, シークレットの値と使用履歴, HTTP の送り方.
 *
 * - シークレット (`Secret` 型) の値は, そのシークレットのパーツのページで利用者が入れ, localStorage にだけ保存する.
 *   入れたときの「送ってよい URL の先頭」も一緒に保存し, 送るときはパーツの式ではなく保存したほうで確かめる
 *   (他人が同じ ID で宛先を変えたシークレットを書いても, 値はその宛先に送られない)
 * - 「CORS エラーのときサーバーで仲介する」は設定画面で決める
 * - HTTP リクエストはまずブラウザの `fetch` で送り, 失敗したとき (CORS で読めないときも `TypeError` になる) に
 *   仲介が有効ならサーバーの `HttpProxyService/Fetch` に署名付きで送り直す. 仲介は許可されたアカウントだけが使える
 *
 * 詳細は docs/wasi-io.md, docs/secret.md
 */
import type { AccountCredentials } from "./auth.ts";
import { base64ToBytes, bytesToBase64 } from "./cbor.ts";
import { createRpcAuthorization } from "./rpc_auth.ts";
import {
  fetchHandler,
  type WasiHttpHeader,
  type WasiIoHost,
  type WasiSecretUse,
  type WasiSecretValue,
} from "./wasi_io.ts";

type WasiIoSettings = {
  readonly relayOnCorsError: boolean;
};

const SETTINGS_KEY = "definy.wasi-io-settings";
const SECRETS_KEY = "definy.secrets";
const SECRET_USAGE_KEY = "definy.secret-usage";
/** 使用履歴はこれより古いものから消す */
const MAX_SECRET_USAGE = 500;

export const HTTP_PROXY_PATH = "/definy.v1.HttpProxyService/Fetch";

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
    readonly relayOnCorsError?: unknown;
  } | null;
  return { relayOnCorsError: json?.relayOnCorsError === true };
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

/** サーバーの `HttpProxyService/Fetch` で HTTP リクエストを送る `WasiIoHost["handle"]` */
function relayHandler(
  credentials: AccountCredentials,
  fetchFn: typeof fetch = fetch,
): WasiIoHost["handle"] {
  return async (request) => {
    try {
      const body = JSON.stringify({
        method: request.method,
        url: request.url,
        headers: request.headers,
        bodyBase64: bytesToBase64(request.body),
      });
      const response = await fetchFn(HTTP_PROXY_PATH, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: await createRpcAuthorization(
            credentials,
            "POST",
            HTTP_PROXY_PATH,
            body,
          ),
        },
        body,
      });
      if (!response.ok) {
        return {
          error: `サーバーの仲介に失敗しました (${response.status}): ${await response.text()}`,
        };
      }
      const json = (await response.json()) as {
        readonly status: number;
        readonly headers: ReadonlyArray<WasiHttpHeader>;
        readonly bodyBase64: string;
      };
      return {
        ok: {
          status: json.status,
          headers: json.headers,
          body: base64ToBytes(json.bodyBase64),
        },
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  };
}

/**
 * ブラウザの `fetch` で送り, 失敗したら (仲介が有効で署名できるアカウントがあれば) サーバーの仲介で送り直す
 */
export function browserWasiIoHandler(
  settings: WasiIoSettings,
  credentials: AccountCredentials | null,
  fetchFn: typeof fetch = fetch,
): WasiIoHost["handle"] {
  const direct = fetchHandler(fetchFn);
  const relay =
    settings.relayOnCorsError && credentials !== null
      ? relayHandler(credentials, fetchFn)
      : null;
  return async (request) => {
    const result = await direct(request);
    if (!("error" in result) || relay === null) {
      return result;
    }
    return relay(request);
  };
}

/**
 * ブラウザで `wasi.io` のプログラムを動かすときの設定と HTTP の送り方.
 *
 * - 環境変数 (`get_environment` で渡す) と「CORS エラーのときサーバーで仲介する」は設定画面で決め, localStorage に保存する
 * - HTTP リクエストはまずブラウザの `fetch` で送り, 失敗したとき (CORS で読めないときも `TypeError` になる) に
 *   仲介が有効ならサーバーの `HttpProxyService/Fetch` に署名付きで送り直す. 仲介は許可されたアカウントだけが使える
 *
 * 詳細は docs/wasi-io.md
 */
import type { AccountCredentials } from "./auth.ts";
import { base64ToBytes, bytesToBase64 } from "./cbor.ts";
import { createRpcAuthorization } from "./rpc_auth.ts";
import {
  fetchHandler,
  type WasiHttpHeader,
  type WasiIoHost,
} from "./wasi_io.ts";

export type WasiIoSettings = {
  readonly environment: ReadonlyArray<WasiHttpHeader>;
  readonly relayOnCorsError: boolean;
};

const STORAGE_KEY = "definy.wasi-io-settings";

export const HTTP_PROXY_PATH = "/definy.v1.HttpProxyService/Fetch";

export const defaultWasiIoSettings: WasiIoSettings = {
  environment: [],
  relayOnCorsError: false,
};

export function loadWasiIoSettings(): WasiIoSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return defaultWasiIoSettings;
    const json = JSON.parse(raw) as {
      readonly environment?: unknown;
      readonly relayOnCorsError?: unknown;
    };
    return {
      environment: Array.isArray(json.environment)
        ? (
            json.environment as ReadonlyArray<{
              readonly name?: unknown;
              readonly value?: unknown;
            }>
          ).map((entry) => ({
            name: String(entry.name ?? ""),
            value: String(entry.value ?? ""),
          }))
        : [],
      relayOnCorsError: json.relayOnCorsError === true,
    };
  } catch {
    return defaultWasiIoSettings;
  }
}

export function saveWasiIoSettings(settings: WasiIoSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // 保存できない環境 (プライベートモードなど) では, このページを開いている間だけ使う
  }
}

/** `NAME=value` の行を環境変数にする. 空行と `#` で始まる行は飛ばす */
export function parseEnvironmentText(
  text: string,
): ReadonlyArray<WasiHttpHeader> {
  const environment: WasiHttpHeader[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index <= 0) continue;
    environment.push({
      name: trimmed.slice(0, index).trim(),
      value: trimmed.slice(index + 1).trim(),
    });
  }
  return environment;
}

export function formatEnvironmentText(
  environment: ReadonlyArray<WasiHttpHeader>,
): string {
  return environment.map((entry) => `${entry.name}=${entry.value}`).join("\n");
}

/** サーバーの `HttpProxyService/Fetch` で HTTP リクエストを送る `WasiIoHost["handle"]` */
export function relayHandler(
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

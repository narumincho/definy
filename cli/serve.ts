/**
 * 手元の definy サーバー (`definy serve`). Worker と同じ処理 (`handleWorkerRequest`, 中身は definy の service wasm) を
 * Node.js の HTTP サーバーで動かす. ストアは手元の SQLite, 書き込みの署名は手元の鍵 (docs/local-server.md)
 */
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  type AccountCredentials,
  generateAccountCredentials,
  importAccountCredentials,
} from "../src/auth.ts";
import { bytesToBase64 } from "../src/base64.ts";
import { handleWorkerRequest, WorkerStore } from "../worker/index.ts";
import { createSqliteD1Database } from "../worker/sqlite_d1.ts";
import type { Env, SeedBundle } from "../worker/types.ts";
import { checkLocalRequest } from "./local_security.ts";

/** データを置くフォルダ. `DEFINY_HOME` が無ければ `~/.definy` */
export function defaultDataDir(): string {
  return process.env["DEFINY_HOME"] ?? join(homedir(), ".definy");
}

/** ファイルが無ければ undefined */
async function readOptionalFile(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

/** 本人だけが読めるファイルに書く */
async function writePrivateFile(path: string, text: string): Promise<void> {
  await writeFile(path, text, { mode: 0o600 });
  await chmod(path, 0o600);
}

/** 手元のアカウントの鍵 (`account.json`). 無ければ作る */
export async function loadOrCreateAccount(
  dataDir: string,
  accountName: string,
): Promise<AccountCredentials> {
  const path = join(dataDir, "account.json");
  const text = await readOptionalFile(path);
  if (text !== undefined) {
    const saved = JSON.parse(text) as {
      readonly accountName: string;
      readonly secretKeyBase64: string;
    };
    return importAccountCredentials(saved.secretKeyBase64, saved.accountName);
  }
  const credentials = await generateAccountCredentials(accountName);
  await writePrivateFile(
    path,
    JSON.stringify(
      {
        accountName: credentials.accountName,
        secretKeyBase64: credentials.secretKeyBase64,
      },
      null,
      2,
    ) + "\n",
  );
  return credentials;
}

/** `/mcp` のトークン (`mcp-token`). 無ければ作る (MCP クライアントの設定が再起動後もそのまま使えるように保存する) */
export async function loadOrCreateToken(dataDir: string): Promise<string> {
  const path = join(dataDir, "mcp-token");
  const text = (await readOptionalFile(path))?.trim();
  if (text !== undefined && text !== "") {
    return text;
  }
  const token = bytesToBase64(crypto.getRandomValues(new Uint8Array(32)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  await writePrivateFile(path, token + "\n");
  return token;
}

/** ビルド済みの seed バンドル (`npm run build:seeds` が作る) */
async function readSeedBundle(): Promise<SeedBundle> {
  const url = new URL("../public/__definy_seed_bundle.json", import.meta.url);
  let text: string;
  try {
    text = await readFile(url, "utf8");
  } catch {
    throw new Error(
      "the seed bundle public/__definy_seed_bundle.json is missing. Run `npm run build:seeds` first",
    );
  }
  return JSON.parse(text) as SeedBundle;
}

/** Node.js のリクエストを fetch の Request にする */
async function toRequest(
  incoming: IncomingMessage,
  fallbackHost: string,
): Promise<Request> {
  const headers = new Headers();
  for (const [name, value] of Object.entries(incoming.headers)) {
    if (Array.isArray(value)) {
      for (const v of value) headers.append(name, v);
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }
  const method = incoming.method ?? "GET";
  let body: Uint8Array<ArrayBuffer> | undefined;
  if (method !== "GET" && method !== "HEAD") {
    const chunks: Buffer[] = [];
    for await (const chunk of incoming) {
      chunks.push(chunk as Buffer);
    }
    body = new Uint8Array(Buffer.concat(chunks));
  }
  return new Request(
    `http://${headers.get("Host") ?? fallbackHost}${incoming.url ?? "/"}`,
    body === undefined ? { method, headers } : { method, headers, body },
  );
}

/** fetch の Response を Node.js のレスポンスに書く */
async function writeResponse(
  response: Response,
  outgoing: ServerResponse,
): Promise<void> {
  const headers: Record<string, string[]> = {};
  response.headers.forEach((value, name) => {
    (headers[name] ??= []).push(value);
  });
  outgoing.writeHead(response.status, headers);
  outgoing.end(Buffer.from(await response.arrayBuffer()));
}

export type LocalServer = {
  /** `http://127.0.0.1:port` */
  readonly origin: string;
  readonly port: number;
  /** `/mcp` の Authorization: Bearer のトークン */
  readonly token: string;
  readonly account: AccountCredentials;
  readonly close: () => Promise<void>;
};

/**
 * 手元の definy サーバーを起動する
 * @param options.dataDir ストア (`store.sqlite`), 鍵 (`account.json`), トークン (`mcp-token`) を置くフォルダ
 * @param options.port 待ち受けるポート (0 なら空いているもの)
 * @param options.accountName 鍵を新しく作るときのアカウントの名前
 * @param options.fetchFn 外への HTTP (MCP の fetch ツールなど) に使う fetch
 */
export async function startLocalServer(options: {
  readonly dataDir: string;
  readonly port: number;
  readonly accountName?: string;
  readonly fetchFn?: typeof fetch;
}): Promise<LocalServer> {
  await mkdir(options.dataDir, { recursive: true, mode: 0o700 });
  const account = await loadOrCreateAccount(
    options.dataDir,
    options.accountName ?? "local",
  );
  const token = await loadOrCreateToken(options.dataDir);
  const db = createSqliteD1Database(join(options.dataDir, "store.sqlite"));
  const store = new WorkerStore();
  await store.seedD1(db, await readSeedBundle());
  const env: Env = {
    DB: db,
    DEFINY_MCP_ACCOUNT_SECRET_KEY: account.secretKeyBase64,
    DEFINY_MCP_ACCOUNT_NAME: account.accountName,
  };
  const fetchFn = options.fetchFn ?? fetch;

  let port = options.port;
  const server = createServer((incoming, outgoing) => {
    void (async () => {
      try {
        const request = await toRequest(incoming, `127.0.0.1:${port}`);
        const rejected = checkLocalRequest(request, { port, token });
        await writeResponse(
          rejected ??
            (await handleWorkerRequest(
              request,
              env,
              store,
              fetchFn,
              undefined,
            )),
          outgoing,
        );
      } catch (error) {
        outgoing.writeHead(500, {
          "Content-Type": "text/plain; charset=utf-8",
        });
        outgoing.end(error instanceof Error ? error.message : String(error));
      }
    })();
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  if (address !== null && typeof address === "object") {
    port = address.port;
  }
  return {
    origin: `http://127.0.0.1:${port}`,
    port,
    token,
    account,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

/**
 * `/mcp` の書き込みツールの専用アカウント (`read_mcp_account` / `sign_mcp_account`. docs/mcp.md).
 * 秘密鍵は Worker の secret にあり, definy には渡さない. 何に署名するかは definy が決める
 */
import {
  importAccountCredentials,
  importPrivateKeyFromSecretKey,
} from "../src/auth.ts";
import type { McpAccount } from "./service_io.ts";
import type { Env } from "./types.ts";

type LoadedAccount = {
  readonly account: McpAccount;
  readonly key: CryptoKey;
};

/** 秘密鍵ごとに読み込んだ鍵を isolate の中で使い回す */
const loaded = new Map<string, Promise<LoadedAccount>>();

function loadAccount(env: Env): Promise<LoadedAccount> | null {
  const secretKey = env.DEFINY_MCP_ACCOUNT_SECRET_KEY?.trim() ?? "";
  const name = env.DEFINY_MCP_ACCOUNT_NAME?.trim() ?? "";
  if (secretKey === "" || name === "") {
    return null;
  }
  const cacheKey = `${secretKey}\n${name}`;
  let account = loaded.get(cacheKey);
  if (account === undefined) {
    account = (async () => {
      const credentials = await importAccountCredentials(secretKey, name);
      return {
        account: {
          accountId: credentials.accountId,
          accountName: credentials.accountName,
        },
        key: await importPrivateKeyFromSecretKey(credentials.secretKeyBase64),
      };
    })();
    loaded.set(cacheKey, account);
  }
  return account;
}

/** `handleRequestInDefiny` に渡す MCP のアカウントの能力 */
export function createMcpAccountHost(env: Env): {
  readonly readMcpAccount: () => Promise<McpAccount | null>;
  readonly signMcpAccount: (message: Uint8Array) => Promise<Uint8Array | null>;
} {
  return {
    readMcpAccount: async () => (await loadAccount(env))?.account ?? null,
    signMcpAccount: async (message) => {
      const account = loadAccount(env);
      if (account === null) {
        return null;
      }
      const { key } = await account;
      return new Uint8Array(
        await crypto.subtle.sign(
          { name: "Ed25519" },
          key,
          message as unknown as BufferSource,
        ),
      );
    },
  };
}

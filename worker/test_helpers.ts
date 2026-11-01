import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { bytesToBase64 } from "../src/base64.ts";
import { sha256EventHashId } from "../src/sha256.ts";
import {
  type AccountCredentials,
  createSignedAccountEvent,
  generateAccountCredentials,
} from "../src/auth.ts";
import { createRpcAuthorization } from "../src/rpc_auth.ts";
import type {
  D1Database,
  D1ExecResult,
  D1PreparedStatement,
  D1Result,
} from "./types.ts";

export const adminCredentials = await generateAccountCredentials("admin");

/** 指定アカウントの Ed25519 署名付き Authorization ヘッダーを付けた POST リクエストを作る */
export async function signedPost(
  url: string,
  body: unknown,
  credentials: AccountCredentials = adminCredentials,
): Promise<Request> {
  const text = JSON.stringify(body);
  return new Request(url, {
    method: "POST",
    headers: {
      Authorization: await createRpcAuthorization(
        credentials,
        "POST",
        new URL(url).pathname,
        text,
      ),
    },
    body: text,
  });
}

/** CAS にアップロードできる（ハッシュが中身と一致する）コンテンツ */
export async function casItem(
  bytes: Uint8Array,
): Promise<{ readonly contentHash: string; readonly contentBytes: string }> {
  return {
    contentHash: await sha256EventHashId(bytes),
    contentBytes: bytesToBase64(bytes),
  };
}

/** 新しいアカウントの署名済み CreateAccount イベント */
export async function newSignedAccountEvent(): Promise<string> {
  const creds = await generateAccountCredentials("tester");
  return (await createSignedAccountEvent(creds)).signedEventBytes;
}

export function createSqliteD1Database(): D1Database {
  const sqlite = new DatabaseSync(":memory:");

  const createStmt = (
    query: string,
    boundValues: ReadonlyArray<unknown> = [],
  ): D1PreparedStatement => {
    const normalizeParams = (): SQLInputValue[] =>
      boundValues.map((v) => (v === undefined ? null : (v as SQLInputValue)));

    return {
      bind(...values: ReadonlyArray<unknown>): D1PreparedStatement {
        return createStmt(query, values);
      },
      first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
        const stmt = sqlite.prepare(query);
        const row = stmt.get(...normalizeParams()) as
          Record<string, unknown> | undefined;
        if (!row) {
          return Promise.resolve(null);
        }
        if (colName) {
          return Promise.resolve((row[colName] as T) ?? null);
        }
        return Promise.resolve({ ...row } as unknown as T);
      },
      run<T = Record<string, unknown>>(): Promise<D1Result<T>> {
        const stmt = sqlite.prepare(query);
        const res = stmt.run(...normalizeParams());
        return Promise.resolve({
          results: [],
          success: true,
          meta: {
            changes: Number(res.changes),
            last_row_id: Number(res.lastInsertRowid),
          },
        });
      },
      all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
        const stmt = sqlite.prepare(query);
        const isSelect = query.trim().toUpperCase().startsWith("SELECT");
        if (!isSelect) {
          const res = stmt.run(...normalizeParams());
          return Promise.resolve({
            results: [],
            success: true,
            meta: {
              changes: Number(res.changes),
              last_row_id: Number(res.lastInsertRowid),
            },
          });
        }
        const rows = stmt.all(...normalizeParams()) as ReadonlyArray<
          Record<string, unknown>
        >;
        return Promise.resolve({
          results: rows.map((r) => ({ ...r }) as unknown as T),
          success: true,
        });
      },
    };
  };

  return {
    prepare(query: string): D1PreparedStatement {
      return createStmt(query);
    },
    async batch<T = Record<string, unknown>>(
      statements: ReadonlyArray<D1PreparedStatement>,
    ): Promise<ReadonlyArray<D1Result<T>>> {
      const results: D1Result<T>[] = [];
      for (const stmt of statements) {
        results.push(await stmt.all<T>());
      }
      return results;
    },
    exec(query: string): Promise<D1ExecResult> {
      sqlite.exec(query);
      return Promise.resolve({ count: 1, duration: 0 });
    },
  };
}

/**
 * node:sqlite の上の D1 互換のデータベース. テストではメモリ上, 手元の definy サーバー (cli/) ではファイルに置く
 */
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import type {
  D1Database,
  D1ExecResult,
  D1PreparedStatement,
  D1Result,
} from "./types.ts";

/** `path` の SQLite ファイル (既定はメモリ上) を D1 のように使う */
export function createSqliteD1Database(path = ":memory:"): D1Database {
  const sqlite = new DatabaseSync(path);

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

import { useEffect, useState } from "react";
import type { AccountState } from "../types.ts";
import { fetchRunOptions, type RunOptions } from "../wasi_io_browser.ts";

/** アカウント ID → サーバーに確かめた結果. ページを開いている間は聞き直さない */
const cache = new Map<string, Promise<RunOptions>>();

const NONE: RunOptions = { administrator: false, serverRun: false };

/**
 * ログインしているアカウントがサーバーの管理者か, サーバーでプログラムを実行できるか (`RunService/GetRunOptions`).
 * 確かめるまでと, 秘密鍵が無い (署名できない) ときはどちらも false.
 * 実行パネルの「サーバーで実行」と, アカウントのダイアログの「管理者」のバッジに使う (docs/run-location.md)
 */
export function useRunOptions(account: AccountState | null): RunOptions {
  const [result, setResult] = useState<{
    readonly accountId: string;
    readonly options: RunOptions;
  } | null>(null);
  const accountId = account?.accountId;
  const accountName = account?.accountName;
  const secretKeyBase64 = account?.secretKeyBase64;

  useEffect(() => {
    if (
      accountId === undefined ||
      accountName === undefined ||
      secretKeyBase64 === undefined
    ) {
      return;
    }
    let promise = cache.get(accountId);
    if (promise === undefined) {
      promise = fetchRunOptions({ accountId, accountName, secretKeyBase64 });
      cache.set(accountId, promise);
    }
    let cancelled = false;
    void promise.then((options) => {
      if (!cancelled) {
        setResult({ accountId, options });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [accountId, accountName, secretKeyBase64]);

  return result !== null && result.accountId === accountId
    ? result.options
    : NONE;
}

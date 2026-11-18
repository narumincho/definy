import { useEffect, useState } from "react";
import type { AccountState } from "../types.ts";
import { checkIsAdministrator } from "../wasi_io_browser.ts";

/** アカウント ID → サーバーに確かめた結果. ページを開いている間は聞き直さない */
const cache = new Map<string, Promise<boolean>>();

/**
 * ログインしているアカウントがサーバーの管理者か. 確かめるまでと, 秘密鍵が無い (署名できない) ときは false.
 * 管理者だけが使える CORS の仲介のチェックや, アカウントのダイアログのバッジに使う
 */
export function useIsAdministrator(account: AccountState | null): boolean {
  const [result, setResult] = useState<{
    readonly accountId: string;
    readonly isAdministrator: boolean;
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
      promise = checkIsAdministrator({
        accountId,
        accountName,
        secretKeyBase64,
      }).catch((): boolean => false);
      cache.set(accountId, promise);
    }
    let cancelled = false;
    void promise.then((isAdministrator) => {
      if (!cancelled) {
        setResult({ accountId, isAdministrator });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [accountId, accountName, secretKeyBase64]);

  return result !== null && result.accountId === accountId
    ? result.isAdministrator
    : false;
}

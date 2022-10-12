import * as indexedDb from "../indexedDB";
import { useCallback, useEffect, useState } from "react";
import { zodType } from "../../deno-lib/npm";

export type UseAccountTokenResult = {
  readonly setAccountToken: (
    accountToken: zodType.AccountToken
  ) => Promise<void>;
  readonly deleteAccountToken: () => Promise<void>;
  /**
   * `null` は indexedDBに保存されているか確認中
   */
  readonly accountToken: zodType.AccountToken | undefined | null;
};

/**
 * context ではないので, ページコンポーネントで1回だけ使う.
 */
export const useAccountToken = (): UseAccountTokenResult => {
  /**
   * アカウントトークンのキャッシュ
   * `null` は indexedDBに保存されているか確認中
   */
  const [accountToken, setAccountToken] = useState<
    zodType.AccountToken | undefined | null
  >(undefined);

  useEffect(() => {
    indexedDb.getAccountToken().then((accountTokenFromIndexedDb) => {
      setAccountToken(accountTokenFromIndexedDb);
    });
  }, []);

  return {
    accountToken,
    setAccountToken: useCallback(async (newAccountToken) => {
      setAccountToken(newAccountToken);
      await indexedDb.setAccountToken(newAccountToken);
    }, []),
    deleteAccountToken: useCallback(async () => {
      setAccountToken(undefined);
      await indexedDb.deleteAccountToken();
    }, []),
  };
};

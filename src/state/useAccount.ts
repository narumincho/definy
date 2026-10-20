import { useCallback, useEffect, useState } from "react";
import type { AccountState } from "../types.ts";
import {
  createSignedAccountEvent,
  generateAccountCredentials,
  importAccountCredentials,
  submitSignedEvent,
} from "../auth.ts";

const STORAGE_KEY_ACCOUNT = "definy.account.v1";

export type AccountParams = {
  readonly accountNames: ReadonlyMap<string, string>;
  readonly refreshEvents: () => Promise<void>;
};

export type AccountOperations = {
  readonly currentAccount: AccountState | null;
  readonly setCurrentAccount: (account: AccountState | null) => void;
  readonly loginWithSecretKey: (
    secretKeyBase64: string,
    fallbackName?: string,
  ) => Promise<void>;
  readonly createAccountAndLogin: (
    accountName: string,
  ) => Promise<{ readonly secretKeyBase64: string }>;
  readonly logout: () => void;
};

export function useAccount({
  accountNames,
  refreshEvents,
}: AccountParams): AccountOperations {
  const [currentAccount, setCurrentAccountState] =
    useState<AccountState | null>(null);

  // Load stored account on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY_ACCOUNT);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as AccountState;
          if (parsed && typeof parsed.accountId === "string") {
            setCurrentAccountState(parsed);
          }
        } catch {
          // Ignore invalid stored account
        }
      }
    }
  }, []);

  const setCurrentAccount = useCallback((acc: AccountState | null) => {
    setCurrentAccountState(acc);
    if (typeof window !== "undefined") {
      if (acc) {
        localStorage.setItem(STORAGE_KEY_ACCOUNT, JSON.stringify(acc));
      } else {
        localStorage.removeItem(STORAGE_KEY_ACCOUNT);
      }
    }
  }, []);

  const loginWithSecretKey = useCallback(
    async (secretKeyBase64: string, fallbackName?: string): Promise<void> => {
      const creds = await importAccountCredentials(
        secretKeyBase64,
        fallbackName,
      );
      const existingName = accountNames.get(creds.accountId);
      const acc: AccountState = {
        accountId: creds.accountId,
        accountName: existingName ?? creds.accountName,
        secretKeyBase64: creds.secretKeyBase64,
      };
      setCurrentAccount(acc);
    },
    [accountNames, setCurrentAccount],
  );

  const createAccountAndLogin = useCallback(
    async (
      accountName: string,
    ): Promise<{ readonly secretKeyBase64: string }> => {
      const creds = await generateAccountCredentials(accountName);
      const { signedEventBytes } = await createSignedAccountEvent(creds);
      const res = await submitSignedEvent(signedEventBytes);
      if (res.status !== "accepted") {
        throw new Error(`Failed to create account: ${res.status}`);
      }
      const acc: AccountState = {
        accountId: creds.accountId,
        accountName: creds.accountName,
        secretKeyBase64: creds.secretKeyBase64,
      };
      setCurrentAccount(acc);
      await refreshEvents();
      return { secretKeyBase64: creds.secretKeyBase64 };
    },
    [refreshEvents, setCurrentAccount],
  );

  const logout = useCallback(() => {
    setCurrentAccount(null);
  }, [setCurrentAccount]);

  return {
    currentAccount,
    setCurrentAccount,
    loginWithSecretKey,
    createAccountAndLogin,
    logout,
  };
}

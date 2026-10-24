import {
  createContext,
  useContext,
  useMemo,
  type JSX,
  type ReactNode,
} from "react";
import type {
  AccountState,
  ConnectionStatus,
  EventRecord,
  LanguageCode,
  ModuleSnapshot,
  PartChange,
  PartSnapshot,
  WorkingChanges,
} from "./types.ts";
import type { SelfHostedTypeCheckOutcome } from "./self_hosted_type_check.ts";
import type { DefinyValue } from "./stage1_compiler.ts";
import { AccountModal } from "./components/AccountModal.tsx";
import { useUiState } from "./state/useUiState.ts";
import { useEvents, type DecodedCommitEvent } from "./state/useEvents.ts";
import { useAccount } from "./state/useAccount.ts";
import {
  useWorkingChanges,
  type CommitWorkingChangesParams,
} from "./state/useWorkingChanges.ts";
import { useTypeCheck, type CommitTypeError } from "./state/useTypeCheck.ts";

export type { CommitWorkingChangesParams, CommitTypeError };

export type DefinyContextValue = {
  readonly language: LanguageCode;
  readonly setLanguage: (lang: LanguageCode) => void;
  readonly events: ReadonlyArray<EventRecord>;
  readonly refreshEvents: () => Promise<void>;
  readonly modules: ReadonlyArray<ModuleSnapshot>;
  readonly parts: ReadonlyArray<PartSnapshot>;
  readonly partNames: ReadonlyMap<string, string>;
  /**
   * パーツ ID (`partIdHash`, URL-safe Base64) → パーツ. 全コミットのパーツを ID ごとに最新で持つ.
   * `parts` は `module.name` ごとに最新の 1 つだけなので, 別アカウントの同名モジュールのパーツへの
   * `PartReference` はこちらで解決する
   */
  readonly partsByIdHash: ReadonlyMap<string, PartSnapshot>;
  readonly accountNames: ReadonlyMap<string, string>;
  /** 署名の正しいモジュールコミットのイベントと, デコードした中身 */
  readonly decodedCommits: ReadonlyArray<DecodedCommitEvent>;
  readonly workingChanges: WorkingChanges;
  readonly updateWorkingPart: (partId: string, change: PartChange) => void;
  readonly discardWorkingPart: (partId: string) => void;
  readonly discardAllWorkingChanges: () => void;
  readonly connectionStatus: ConnectionStatus;
  readonly currentAccount: AccountState | null;
  readonly setCurrentAccount: (account: AccountState | null) => void;
  readonly accountModalOpen: boolean;
  readonly setAccountModalOpen: (open: boolean) => void;
  readonly loginWithSecretKey: (
    secretKeyBase64: string,
    fallbackName?: string,
  ) => Promise<void>;
  readonly createAccountAndLogin: (
    accountName: string,
  ) => Promise<{ readonly secretKeyBase64: string }>;
  readonly logout: () => void;
  readonly commitWorkingChanges: (
    params: CommitWorkingChangesParams,
  ) => Promise<string>;
  /**
   * `moduleName` に作業中の変更をコミットしたときのパーツを, サーバーの `SubmitEvent` と同じ
   * definy 製の型チェッカーで検査する. ログインしていなければ空
   */
  readonly checkCommitTypes: (
    moduleName: string,
  ) => Promise<ReadonlyArray<CommitTypeError>>;
  /**
   * コミット済みのパーツを definy 製の型チェッカーで検査した結果 (キーはパーツ ID = `partIdHash`).
   * 取得済みのイベントが変わると裏で検査し直す. 検査が終わっていないパーツは入っていない
   */
  readonly partTypeCheckResults: ReadonlyMap<
    string,
    SelfHostedTypeCheckOutcome
  >;
  /**
   * 1 つのパーツ (編集中のものなど) を, コミット済みのパーツの型環境で検査する.
   * `partIdHash` があれば型環境のそのパーツを `partType` / `expression` で置き換える
   */
  readonly checkPartType: (part: {
    readonly partIdHash: string | null;
    readonly partType: unknown;
    readonly expression: unknown;
  }) => Promise<SelfHostedTypeCheckOutcome>;
  /**
   * 式 (`{"Hole": {"probe": true}}` を 1 つ含む) のその位置で期待する型 (`core.type-ast` の値) を,
   * コミット済みのパーツの型環境で definy 製の型チェッカーに聞く. 分からなければ `null`
   */
  readonly findExpectedType: (part: {
    readonly partType: unknown;
    readonly expression: unknown;
  }) => Promise<DefinyValue | null>;
  /**
   * 型エラーの理由を 1 行にする (型の中のパーツ参照はパーツ名にする). 問題なければ `null`.
   * `partName` が `null` ならパーツ名を付けない
   */
  readonly typeCheckMessage: (
    partName: string | null,
    outcome: SelfHostedTypeCheckOutcome,
  ) => string | null;
  readonly sidebarOpen: boolean;
  readonly toggleSidebar: () => void;
  readonly setSidebarOpen: (open: boolean) => void;
  readonly commandPaletteOpen: boolean;
  readonly setCommandPaletteOpen: (open: boolean) => void;
};

const DefinyContext = createContext<DefinyContextValue | null>(null);

export function DefinyProvider({
  children,
}: {
  readonly children: ReactNode;
}): JSX.Element {
  const ui = useUiState();
  const events = useEvents();
  const account = useAccount({
    accountNames: events.accountNames,
    refreshEvents: events.refreshEvents,
  });
  const working = useWorkingChanges({
    currentAccount: account.currentAccount,
    modules: events.modules,
    refreshEvents: events.refreshEvents,
  });
  const typeCheck = useTypeCheck({
    committedParts: events.committedParts,
    partNames: events.partNames,
    currentAccount: account.currentAccount,
    buildCommitParts: working.buildCommitParts,
  });

  const value = useMemo<DefinyContextValue>(
    () => ({
      language: ui.language,
      setLanguage: ui.setLanguage,
      events: events.events,
      refreshEvents: events.refreshEvents,
      modules: events.modules,
      parts: events.parts,
      partNames: events.partNames,
      partsByIdHash: events.partsByIdHash,
      accountNames: events.accountNames,
      decodedCommits: events.decodedCommits,
      workingChanges: working.workingChanges,
      updateWorkingPart: working.updateWorkingPart,
      discardWorkingPart: working.discardWorkingPart,
      discardAllWorkingChanges: working.discardAllWorkingChanges,
      connectionStatus: events.connectionStatus,
      currentAccount: account.currentAccount,
      setCurrentAccount: account.setCurrentAccount,
      accountModalOpen: ui.accountModalOpen,
      setAccountModalOpen: ui.setAccountModalOpen,
      loginWithSecretKey: account.loginWithSecretKey,
      createAccountAndLogin: account.createAccountAndLogin,
      logout: account.logout,
      commitWorkingChanges: working.commitWorkingChanges,
      checkCommitTypes: typeCheck.checkCommitTypes,
      partTypeCheckResults: typeCheck.partTypeCheckResults,
      checkPartType: typeCheck.checkPartType,
      findExpectedType: typeCheck.findExpectedType,
      typeCheckMessage: typeCheck.typeCheckMessage,
      sidebarOpen: ui.sidebarOpen,
      toggleSidebar: ui.toggleSidebar,
      setSidebarOpen: ui.setSidebarOpen,
      commandPaletteOpen: ui.commandPaletteOpen,
      setCommandPaletteOpen: ui.setCommandPaletteOpen,
    }),
    [
      ui.language,
      ui.setLanguage,
      ui.sidebarOpen,
      ui.toggleSidebar,
      ui.setSidebarOpen,
      ui.commandPaletteOpen,
      ui.setCommandPaletteOpen,
      ui.accountModalOpen,
      ui.setAccountModalOpen,
      events.events,
      events.refreshEvents,
      events.modules,
      events.parts,
      events.partNames,
      events.partsByIdHash,
      events.accountNames,
      events.decodedCommits,
      events.connectionStatus,
      account.currentAccount,
      account.setCurrentAccount,
      account.loginWithSecretKey,
      account.createAccountAndLogin,
      account.logout,
      working.workingChanges,
      working.updateWorkingPart,
      working.discardWorkingPart,
      working.discardAllWorkingChanges,
      working.commitWorkingChanges,
      typeCheck.checkCommitTypes,
      typeCheck.partTypeCheckResults,
      typeCheck.checkPartType,
      typeCheck.findExpectedType,
      typeCheck.typeCheckMessage,
    ],
  );

  return (
    <DefinyContext.Provider value={value}>
      {children}
      <AccountModal
        open={ui.accountModalOpen}
        onClose={() => {
          ui.setAccountModalOpen(false);
        }}
      />
    </DefinyContext.Provider>
  );
}

export function useDefiny(): DefinyContextValue {
  const ctx = useContext(DefinyContext);
  if (!ctx) {
    throw new Error("useDefiny must be used within a DefinyProvider");
  }
  return ctx;
}

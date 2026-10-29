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
  ProjectSnapshot,
  WorkingChanges,
} from "./types.ts";
import type { SelfHostedTypeCheckOutcome } from "./self_hosted_type_check.ts";
import type { DefinyValue } from "./stage1_compiler.ts";
import type { CommitTarget } from "./branches.ts";
import type { Visibility } from "./event_content.ts";
import type { VisibilityTarget } from "./visibility.ts";
import { AccountModal } from "./components/AccountModal.tsx";
import { useUiState, type PageUndoControls } from "./state/useUiState.ts";
import type { SidebarView } from "./sidebar_view.ts";
import { useEvents, type DecodedCommitEvent } from "./state/useEvents.ts";
import { useAccount } from "./state/useAccount.ts";
import {
  useWorkingChanges,
  type CommitWorkingChangesParams,
} from "./state/useWorkingChanges.ts";
import { useTypeCheck, type CommitTypeError } from "./state/useTypeCheck.ts";

export type { CommitWorkingChangesParams, CommitTypeError, PageUndoControls };

export type DefinyContextValue = {
  readonly language: LanguageCode;
  readonly setLanguage: (lang: LanguageCode) => void;
  readonly events: ReadonlyArray<EventRecord>;
  readonly refreshEvents: () => Promise<void>;
  /** 各プロジェクトの表示しているブランチの最新のコミット (docs/project.md) */
  readonly projects: ReadonlyArray<ProjectSnapshot>;
  readonly modules: ReadonlyArray<ModuleSnapshot>;
  readonly parts: ReadonlyArray<PartSnapshot>;
  readonly partNames: ReadonlyMap<string, string>;
  /**
   * パーツ ID (`partIdHash`, URL-safe Base64) → パーツ. 各モジュールの表示しているブランチのパーツを ID ごとに最新で持つ.
   * `PartReference` の解決に使う
   */
  readonly partsByIdHash: ReadonlyMap<string, PartSnapshot>;
  /** パーツ ID → 参照されるパーツとしての公開/非公開 (docs/visibility.md) */
  readonly visibilityTargets: ReadonlyMap<string, VisibilityTarget>;
  readonly accountNames: ReadonlyMap<string, string>;
  /** 署名の正しいプロジェクトのコミットのイベントと, デコードした中身 */
  readonly decodedCommits: ReadonlyArray<DecodedCommitEvent>;
  readonly workingChanges: WorkingChanges;
  readonly updateWorkingPart: (partId: string, change: PartChange) => void;
  readonly discardWorkingPart: (partId: string) => void;
  readonly discardAllWorkingChanges: () => void;
  /** 新しいモジュール `moduleName` を入れるプロジェクトを決める (まだ無いプロジェクトならコミットで作る. docs/project.md) */
  readonly setNewModuleProject: (
    moduleName: string,
    projectName: string,
  ) => void;
  /** モジュールの公開/非公開を作業中の変更として変える (docs/visibility.md) */
  readonly setModuleVisibility: (
    moduleName: string,
    visibility: Visibility,
  ) => void;
  /** モジュールが入っている (新しいモジュールなら入れる) プロジェクト. 分からなければ `undefined` */
  readonly projectOfModule: (moduleName: string) => string | undefined;
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
  /** `projectName` へコミットする先 (自分のブランチ / 新しいブランチ / 新しいプロジェクト. docs/branch.md). ログインしていなければ `null` */
  readonly commitTargetFor: (projectName: string) => CommitTarget | null;
  /** プロジェクト `projectName` で表示するブランチを選ぶ. モジュール・パーツ・型環境はそのブランチのものになる */
  readonly selectBranch: (projectName: string, branch: string) => void;
  /** 読んでいないイベント (古いコミットなど) を 1 件読んで `events` に足す. 見つからなければ `false` */
  readonly loadEvent: (eventHash: string) => Promise<boolean>;
  /** プロジェクトのコミットを読んで (読んでいなければ `GetEvent` で) デコードする. 無い・不正なら `null` */
  readonly fetchCommit: (
    eventHash: string,
  ) => Promise<DecodedCommitEvent | null>;
  /** 他のブランチの取り込みを始める (取り込んだ後のパーツへの変更を作業中の変更にする. docs/branch.md「取り込み」) */
  readonly startMerge: (
    projectName: string,
    mergedCommitHash: string,
    changes: ReadonlyMap<string, PartChange>,
  ) => void;
  /** 取り込みをやめる (そのプロジェクトの作業中の変更も捨てる) */
  readonly cancelMerge: (projectName: string) => void;
  /**
   * `projectName` に作業中の変更をコミットしたときのパーツを, サーバーの `SubmitEvent` と同じ
   * definy 製の型チェッカーで検査する. ログインしていなければ空
   */
  readonly checkCommitTypes: (
    projectName: string,
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
   * 式 (`{"#hole": {"probe": true}}` を 1 つ含む) のその位置で期待する型 (`core.type-ast` の値) を,
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
  /** 左端のアクティビティバーで選んでいる, サイドバーの欄 (src/sidebar_view.ts) */
  readonly sidebarView: SidebarView;
  readonly toggleSidebar: () => void;
  readonly setSidebarOpen: (open: boolean) => void;
  readonly commandPaletteOpen: boolean;
  readonly setCommandPaletteOpen: (open: boolean) => void;
  /** ショートカットキー一覧 (docs/key.md) を出しているか */
  readonly shortcutListOpen: boolean;
  readonly setShortcutListOpen: (open: boolean) => void;
  /** 実行パネル (docs/run-panel.md) を出しているか */
  readonly runPanelOpen: boolean;
  readonly setRunPanelOpen: (open: boolean) => void;
  readonly toggleRunPanel: () => void;
  /** 今のページの Undo / Redo (ヘッダーのボタンが使う). 持たないページでは `null` */
  readonly pageUndo: PageUndoControls | null;
  readonly setPageUndo: (controls: PageUndoControls | null) => void;
};

const DefinyContext = createContext<DefinyContextValue | null>(null);
/**
 * 表示言語だけのコンテキスト. `DefinyContext` は式を変えるたびに変わるので, 言語だけを使う多くの部品
 * (`Link` など) はこちらを使い, 描き直さないようにする (#762)
 */
const LanguageContext = createContext<LanguageCode>("en");

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
    projects: events.projects,
    modules: events.modules,
    branchesByProject: events.branchesByProject,
    displayedBranches: events.displayedBranches,
    selectBranch: events.selectBranch,
    refreshEvents: events.refreshEvents,
  });
  const typeCheck = useTypeCheck({
    committedParts: events.committedParts,
    visibilityTargets: events.visibilityTargets,
    partNames: events.partNames,
    currentAccount: account.currentAccount,
    buildCommitModules: working.buildCommitModules,
  });

  const value = useMemo<DefinyContextValue>(
    () => ({
      language: ui.language,
      setLanguage: ui.setLanguage,
      events: events.events,
      refreshEvents: events.refreshEvents,
      projects: events.projects,
      modules: events.modules,
      parts: events.parts,
      partNames: events.partNames,
      partsByIdHash: events.partsByIdHash,
      visibilityTargets: events.visibilityTargets,
      accountNames: events.accountNames,
      decodedCommits: events.decodedCommits,
      workingChanges: working.workingChanges,
      updateWorkingPart: working.updateWorkingPart,
      discardWorkingPart: working.discardWorkingPart,
      discardAllWorkingChanges: working.discardAllWorkingChanges,
      setNewModuleProject: working.setNewModuleProject,
      setModuleVisibility: working.setModuleVisibility,
      projectOfModule: working.projectOfModule,
      connectionStatus: events.connectionStatus,
      currentAccount: account.currentAccount,
      setCurrentAccount: account.setCurrentAccount,
      accountModalOpen: ui.accountModalOpen,
      setAccountModalOpen: ui.setAccountModalOpen,
      loginWithSecretKey: account.loginWithSecretKey,
      createAccountAndLogin: account.createAccountAndLogin,
      logout: account.logout,
      commitWorkingChanges: working.commitWorkingChanges,
      commitTargetFor: working.commitTargetFor,
      selectBranch: events.selectBranch,
      loadEvent: events.loadEvent,
      fetchCommit: events.fetchCommit,
      startMerge: working.startMerge,
      cancelMerge: working.cancelMerge,
      checkCommitTypes: typeCheck.checkCommitTypes,
      partTypeCheckResults: typeCheck.partTypeCheckResults,
      checkPartType: typeCheck.checkPartType,
      findExpectedType: typeCheck.findExpectedType,
      typeCheckMessage: typeCheck.typeCheckMessage,
      sidebarOpen: ui.sidebarOpen,
      sidebarView: ui.sidebarView,
      toggleSidebar: ui.toggleSidebar,
      setSidebarOpen: ui.setSidebarOpen,
      commandPaletteOpen: ui.commandPaletteOpen,
      setCommandPaletteOpen: ui.setCommandPaletteOpen,
      shortcutListOpen: ui.shortcutListOpen,
      setShortcutListOpen: ui.setShortcutListOpen,
      runPanelOpen: ui.runPanelOpen,
      setRunPanelOpen: ui.setRunPanelOpen,
      toggleRunPanel: ui.toggleRunPanel,
      pageUndo: ui.pageUndo,
      setPageUndo: ui.setPageUndo,
    }),
    [
      ui.language,
      ui.setLanguage,
      ui.sidebarOpen,
      ui.sidebarView,
      ui.toggleSidebar,
      ui.setSidebarOpen,
      ui.commandPaletteOpen,
      ui.setCommandPaletteOpen,
      ui.shortcutListOpen,
      ui.setShortcutListOpen,
      ui.runPanelOpen,
      ui.setRunPanelOpen,
      ui.toggleRunPanel,
      ui.pageUndo,
      ui.setPageUndo,
      ui.accountModalOpen,
      ui.setAccountModalOpen,
      events.events,
      events.refreshEvents,
      events.projects,
      events.modules,
      events.parts,
      events.partNames,
      events.partsByIdHash,
      events.visibilityTargets,
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
      working.setNewModuleProject,
      working.setModuleVisibility,
      working.projectOfModule,
      working.commitWorkingChanges,
      working.commitTargetFor,
      events.selectBranch,
      events.loadEvent,
      events.fetchCommit,
      working.startMerge,
      working.cancelMerge,
      typeCheck.checkCommitTypes,
      typeCheck.partTypeCheckResults,
      typeCheck.checkPartType,
      typeCheck.findExpectedType,
      typeCheck.typeCheckMessage,
    ],
  );

  return (
    <DefinyContext.Provider value={value}>
      <LanguageContext.Provider value={ui.language}>
        {children}
      </LanguageContext.Provider>
      <AccountModal
        open={ui.accountModalOpen}
        onClose={() => {
          ui.setAccountModalOpen(false);
        }}
      />
    </DefinyContext.Provider>
  );
}

/** 表示言語 (`useDefiny().language` と同じ. 言語が変わったときだけ描き直す) */
export function useLanguage(): LanguageCode {
  return useContext(LanguageContext);
}

export function useDefiny(): DefinyContextValue {
  const ctx = useContext(DefinyContext);
  if (!ctx) {
    throw new Error("useDefiny must be used within a DefinyProvider");
  }
  return ctx;
}

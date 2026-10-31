import { useCallback, useEffect, useRef, useState } from "react";
import type { AccountState } from "../types.ts";
import type { CommitModulesResult } from "./useWorkingChanges.ts";
import {
  bytesToUrlSafeBase64NoPad,
  deriveModuleIdBytesSync,
  deriveModulePartIdSync,
} from "../cbor.ts";
import {
  checkModuleCommitParts,
  checkParts,
  createTypeCheckSession,
  outcomeErrorMessage,
  typeEnvFromParts,
  typeEnvKey,
  type LatestPart,
  type SelfHostedTypeCheckOutcome,
  type TypeCheckSession,
} from "../self_hosted_type_check.ts";
import type { DefinyValue } from "../stage1_compiler.ts";
import { loadTypeChecker } from "../type_checker_browser.ts";
import { loadVisibilityChecker } from "../visibility_checker_browser.ts";
import { onRebuiltCompilerChange } from "../rebuilt_compiler.ts";
import { DEFAULT_VISIBILITY } from "../event_content.ts";
import {
  checkReferenceVisibility,
  visibilityViolationMessage,
  type VisibilityTarget,
} from "../visibility.ts";

/** コミット前の型検査で見つかった問題 (1 パーツ 1 件) */
export type CommitTypeError = {
  readonly partName: string;
  readonly message: string;
};

/** 裏で全パーツを検査するとき, 続けて検査する時間 (1 パーツ数 ms). これを超えたらブラウザに処理を返す */
const BACKGROUND_CHECK_SLICE_MS = 30;

/**
 * ブラウザに処理を返す. `setTimeout(0)` は裏のタブで 1 秒ほどに間引かれるので `MessageChannel` を使う
 */
function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      resolve();
    };
    channel.port2.postMessage(null);
  });
}

export type TypeCheckParams = {
  readonly committedParts: ReadonlyMap<string, LatestPart>;
  /**
   * コミット済みのパーツに作業中の変更を重ねたもの (src/working_parts.ts). 式エディタの検査・型の問い合わせの型環境にする.
   * コミットしていない新しいパーツの参照も型が分かる
   */
  readonly workingParts: ReadonlyMap<string, LatestPart>;
  /** `workingParts` の型環境が変わったかを比べる文字列 (`workingTypeEnvSignature`) */
  readonly workingEnvSignature: string;
  /** パーツ ID → 参照されるパーツとしての公開/非公開 (docs/visibility.md) */
  readonly visibilityTargets: ReadonlyMap<string, VisibilityTarget>;
  readonly partNames: ReadonlyMap<string, string>;
  readonly currentAccount: AccountState | null;
  readonly buildCommitModules: (projectName: string) => CommitModulesResult;
};

export type TypeCheckOperations = {
  readonly partTypeCheckResults: ReadonlyMap<
    string,
    SelfHostedTypeCheckOutcome
  >;
  readonly checkPartType: (part: {
    readonly partIdHash: string | null;
    readonly partType: unknown;
    readonly expression: unknown;
  }) => Promise<SelfHostedTypeCheckOutcome>;
  readonly checkCommitTypes: (
    projectName: string,
  ) => Promise<ReadonlyArray<CommitTypeError>>;
  readonly findExpectedType: (part: {
    readonly partType: unknown;
    readonly expression: unknown;
  }) => Promise<DefinyValue | null>;
  /**
   * 未確定の型引数を, コミット済みのパーツの型環境で型チェッカーが推論した型で埋めた式.
   * 推論できない未入力があれば `null` (docs/type-arguments.md「未確定の型引数」)
   */
  readonly fillTypeArguments: (part: {
    readonly partType: unknown;
    readonly expression: unknown;
  }) => Promise<unknown>;
  /**
   * 式の probe の未入力が型引数の位置なら, コミット済みのパーツの型環境で型チェッカーが推論した型引数.
   * 分からなければ `null`
   */
  readonly findInferredTypeArgument: (part: {
    readonly partType: unknown;
    readonly expression: unknown;
  }) => Promise<DefinyValue | null>;
  readonly typeCheckMessage: (
    partName: string | null,
    outcome: SelfHostedTypeCheckOutcome,
  ) => string | null;
};

export function useTypeCheck({
  committedParts,
  workingParts,
  workingEnvSignature,
  visibilityTargets,
  partNames,
  currentAccount,
  buildCommitModules,
}: TypeCheckParams): TypeCheckOperations {
  const typeCheckMessage = useCallback(
    (partName: string | null, outcome: SelfHostedTypeCheckOutcome) =>
      outcomeErrorMessage(partName, outcome, (partId) => partNames.get(partId)),
    [partNames],
  );

  // コミット済みの全パーツを裏で検査する. 型環境 (全パーツの型) も式も変わっていないパーツは前の結果を使う.
  // 描画を止めないよう数パーツずつ区切ってブラウザに処理を返す
  const [partTypeCheckResults, setPartTypeCheckResults] = useState<
    ReadonlyMap<string, SelfHostedTypeCheckOutcome>
  >(new Map());
  const partTypeCheckCache = useRef<
    Map<
      string,
      {
        readonly envKey: string;
        readonly expressionKey: string | null;
        readonly outcome: SelfHostedTypeCheckOutcome;
      }
    >
  >(new Map());

  // 式エディタで選んだ位置の期待する型を聞くセッション. 選択を変えるたびに呼ばれるので,
  // 型環境 (コミット済みの全パーツ) が同じ間は使い回す
  const expectedTypeSession = useRef<{
    readonly parts: ReadonlyMap<string, LatestPart>;
    readonly signature: string;
    readonly session: TypeCheckSession;
  } | null>(null);

  // 実行パネルでコンパイラ (と型チェッカー) を作り直したら, 前の結果を捨てて検査し直す
  const [typeCheckerVersion, setTypeCheckerVersion] = useState(0);
  useEffect(
    () =>
      onRebuiltCompilerChange(() => {
        partTypeCheckCache.current = new Map();
        expectedTypeSession.current = null;
        setTypeCheckerVersion((version) => version + 1);
      }),
    [],
  );

  useEffect(() => {
    if (committedParts.size === 0) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const envKey = typeEnvKey(committedParts.values());
      const cache = partTypeCheckCache.current;
      const results = new Map<string, SelfHostedTypeCheckOutcome>();
      const pending: Array<LatestPart> = [];
      for (const part of committedParts.values()) {
        if (part.expression == null || part.partType == null) {
          continue;
        }
        const cached = cache.get(part.partId);
        if (
          cached !== undefined &&
          cached.envKey === envKey &&
          cached.expressionKey === part.expressionKey
        ) {
          results.set(part.partId, cached.outcome);
        } else {
          pending.push(part);
        }
      }
      if (pending.length === 0) {
        setPartTypeCheckResults(results);
        return;
      }
      // 最初の描画とイベントの読み込みの邪魔をしないよう, 少し待ってから始める
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (cancelled) {
        return;
      }
      const session = createTypeCheckSession({
        typeChecker: await loadTypeChecker(),
        env: typeEnvFromParts(committedParts.values()),
      });
      // 30ms ずつ検査してはブラウザに処理を返す
      let sliceStarted = performance.now();
      for (const part of pending) {
        if (performance.now() - sliceStarted > BACKGROUND_CHECK_SLICE_MS) {
          await yieldToBrowser();
          if (cancelled) {
            return;
          }
          sliceStarted = performance.now();
        }
        const outcome = session.check(part);
        results.set(part.partId, outcome);
        cache.set(part.partId, {
          envKey,
          expressionKey: part.expressionKey,
          outcome,
        });
      }
      // 結果はコンテキストを使う全コンポーネントを描画し直すので, 最後に 1 度だけ反映する
      setPartTypeCheckResults(results);
    })().catch((e: unknown) => {
      console.error("background type check failed", e);
    });
    return () => {
      cancelled = true;
    };
  }, [committedParts, typeCheckerVersion]);

  const checkPartType = useCallback(
    async (part: {
      readonly partIdHash: string | null;
      readonly partType: unknown;
      readonly expression: unknown;
    }): Promise<SelfHostedTypeCheckOutcome> => {
      const typeChecker = await loadTypeChecker();
      const parts = new Map(workingParts);
      const working =
        part.partIdHash === null ? undefined : parts.get(part.partIdHash);
      if (working !== undefined) {
        parts.set(working.partId, {
          ...working,
          partType: part.partType,
          expression: part.expression,
        });
      }
      return (
        checkParts({
          typeChecker,
          parts: [{ partType: part.partType, expression: part.expression }],
          env: typeEnvFromParts(parts.values()),
        })[0] ?? { kind: "checker_failed", message: "no result" }
      );
    },
    [workingParts],
  );

  /**
   * 作業中のパーツの型環境のセッション (型環境が変わるまで使い回す).
   * 値のパーツの式を書き換えただけなら型環境は変わらないので作り直さない
   */
  const committedSession = useCallback(async () => {
    const typeChecker = await loadTypeChecker();
    if (
      expectedTypeSession.current?.parts !== committedParts ||
      expectedTypeSession.current.signature !== workingEnvSignature
    ) {
      expectedTypeSession.current = {
        parts: committedParts,
        signature: workingEnvSignature,
        session: createTypeCheckSession({
          typeChecker,
          env: typeEnvFromParts(workingParts.values()),
        }),
      };
    }
    return expectedTypeSession.current.session;
  }, [committedParts, workingParts, workingEnvSignature]);

  const findExpectedType = useCallback(
    async (part: {
      readonly partType: unknown;
      readonly expression: unknown;
    }): Promise<DefinyValue | null> =>
      (await committedSession()).findExpectedType(part),
    [committedSession],
  );

  const fillTypeArguments = useCallback(
    async (part: {
      readonly partType: unknown;
      readonly expression: unknown;
    }): Promise<unknown> => (await committedSession()).fillTypeArguments(part),
    [committedSession],
  );

  const findInferredTypeArgument = useCallback(
    async (part: {
      readonly partType: unknown;
      readonly expression: unknown;
    }): Promise<DefinyValue | null> =>
      (await committedSession()).findInferredTypeArgument(part),
    [committedSession],
  );

  const checkCommitTypes = useCallback(
    async (projectName: string): Promise<ReadonlyArray<CommitTypeError>> => {
      if (!currentAccount) {
        return [];
      }
      const { project, modules, changedModuleNames } =
        buildCommitModules(projectName);
      if (modules.length === 0) {
        return [];
      }
      const typeChecker = await loadTypeChecker();
      const moduleIdOf = (name: string): string =>
        bytesToUrlSafeBase64NoPad(deriveModuleIdBytesSync(name));
      const committed = modules.flatMap((module) => {
        const moduleIdBytes = deriveModuleIdBytesSync(module.name);
        const moduleId = bytesToUrlSafeBase64NoPad(moduleIdBytes);
        const changed = changedModuleNames.has(module.name);
        return module.parts.map((part) => {
          const partId = deriveModulePartIdSync(moduleIdBytes, part.name);
          return {
            partId,
            moduleId,
            name: `${module.name}.${part.name}`,
            moduleName: module.name,
            visibility: part.visibility ?? DEFAULT_VISIBILITY,
            moduleVisibility: module.visibility ?? DEFAULT_VISIBILITY,
            partType: part.partType ?? null,
            expression: part.expression ?? null,
            // 変更の無いモジュールのパーツは型環境のパーツと同じキーにする (型が変わらなければ検査しない).
            // 変更のあるモジュールのパーツは, 型環境のパーツのキー (イベントごと) と比べられないので検査する
            expressionKey: changed
              ? null
              : (committedParts.get(partId)?.expressionKey ?? null),
          };
        });
      });
      // 参照できない (非公開の) パーツへの参照はサーバーと同じく型より先に出す (docs/visibility.md)
      const violations = checkReferenceVisibility(
        await loadVisibilityChecker(),
        {
          projectName,
          committed,
          environment: visibilityTargets,
        },
      );
      if (violations.length > 0) {
        return violations.map((violation) => ({
          partName: violation.partName,
          message: visibilityViolationMessage(violation),
        }));
      }
      return checkModuleCommitParts({
        typeChecker,
        replacedModuleIds: new Set([
          ...modules.map((module) => moduleIdOf(module.name)),
          ...(project?.moduleNames ?? []).map(moduleIdOf),
        ]),
        committed,
        latestParts: committedParts,
      }).flatMap(({ name, outcome }) => {
        const message = typeCheckMessage(name, outcome);
        return message === null ? [] : [{ partName: name, message }];
      });
    },
    [
      currentAccount,
      buildCommitModules,
      committedParts,
      visibilityTargets,
      typeCheckMessage,
    ],
  );

  return {
    partTypeCheckResults,
    checkPartType,
    checkCommitTypes,
    findExpectedType,
    fillTypeArguments,
    findInferredTypeArgument,
    typeCheckMessage,
  };
}

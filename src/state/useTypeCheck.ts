import { useCallback, useEffect, useRef, useState } from "react";
import type { AccountState } from "../types.ts";
import type { DecodedPart } from "../cbor.ts";
import {
  base64ToBytes,
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
  readonly partNames: ReadonlyMap<string, string>;
  readonly currentAccount: AccountState | null;
  readonly buildCommitParts: (moduleName: string) => {
    readonly partsList: ReadonlyArray<DecodedPart>;
  };
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
    moduleName: string,
  ) => Promise<ReadonlyArray<CommitTypeError>>;
  readonly findExpectedType: (part: {
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
  partNames,
  currentAccount,
  buildCommitParts,
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
  }, [committedParts]);

  const checkPartType = useCallback(
    async (part: {
      readonly partIdHash: string | null;
      readonly partType: unknown;
      readonly expression: unknown;
    }): Promise<SelfHostedTypeCheckOutcome> => {
      const typeChecker = await loadTypeChecker();
      const parts = new Map(committedParts);
      const committed =
        part.partIdHash === null ? undefined : parts.get(part.partIdHash);
      if (committed !== undefined) {
        parts.set(committed.partId, {
          ...committed,
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
    [committedParts],
  );

  // 式エディタで選んだ位置の期待する型を聞くセッション. 選択を変えるたびに呼ばれるので,
  // 型環境 (コミット済みの全パーツ) が同じ間は使い回す
  const expectedTypeSession = useRef<{
    readonly parts: ReadonlyMap<string, LatestPart>;
    readonly session: TypeCheckSession;
  } | null>(null);
  const findExpectedType = useCallback(
    async (part: {
      readonly partType: unknown;
      readonly expression: unknown;
    }): Promise<DefinyValue | null> => {
      const typeChecker = await loadTypeChecker();
      if (expectedTypeSession.current?.parts !== committedParts) {
        expectedTypeSession.current = {
          parts: committedParts,
          session: createTypeCheckSession({
            typeChecker,
            env: typeEnvFromParts(committedParts.values()),
          }),
        };
      }
      return expectedTypeSession.current.session.findExpectedType(part);
    },
    [committedParts],
  );

  const checkCommitTypes = useCallback(
    async (moduleName: string): Promise<ReadonlyArray<CommitTypeError>> => {
      if (!currentAccount) {
        return [];
      }
      const { partsList } = buildCommitParts(moduleName);
      if (partsList.length === 0) {
        return [];
      }
      const typeChecker = await loadTypeChecker();
      const moduleIdBytes = deriveModuleIdBytesSync(
        base64ToBytes(currentAccount.accountId),
        moduleName,
      );
      const moduleId = bytesToUrlSafeBase64NoPad(moduleIdBytes);
      const committed: ReadonlyArray<LatestPart> = partsList.map((part) => ({
        partId: deriveModulePartIdSync(moduleIdBytes, part.name),
        moduleId,
        name: part.name,
        partType: part.partType ?? null,
        expression: part.expression ?? null,
        // 型環境のパーツのキー (イベントごと) とは比べられないので, 変更の有無にかかわらず検査する
        expressionKey: null,
      }));
      return checkModuleCommitParts({
        typeChecker,
        moduleId,
        committed,
        latestParts: committedParts,
        // 式の無いパーツ・コンパイラ組み込みを受け入れるか (システムアカウントか) はサーバーが決めるので,
        // ここでは型エラーと型チェッカーの失敗だけを出す
        allowBuiltinParts: true,
      }).flatMap(({ name, outcome }) => {
        const message = typeCheckMessage(name, outcome);
        return message === null ? [] : [{ partName: name, message }];
      });
    },
    [currentAccount, buildCommitParts, committedParts, typeCheckMessage],
  );

  return {
    partTypeCheckResults,
    checkPartType,
    checkCommitTypes,
    findExpectedType,
    typeCheckMessage,
  };
}

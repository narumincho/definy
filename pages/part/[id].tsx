import { useState, useCallback, useEffect, type JSX } from "react";
import { useParams } from "@void/react";
import { Link } from "../../src/components/Link.tsx";
import { label, localizedText, withLocalizedText } from "../../src/language.ts";
import { useDefiny } from "../../src/state.tsx";
import { usePageTitle } from "../../src/page_title.ts";
import { findSecretUsages, secretLiteralOf } from "../../src/secret.ts";
import { SecretPanel } from "../../src/components/SecretPanel.tsx";
import { PartDefinitionTree } from "../../src/tree_layout/PartDefinitionTree.tsx";
import type { ExpressionTypeError } from "../../src/tree_layout/ExpressionTreeEditor.tsx";
import { isTextInput } from "../../src/tree_layout/keyboard.ts";
import type { PartChange } from "../../src/types.ts";
import {
  emptyUndoHistory,
  recordUndo,
  redo,
  undo,
  undoKeyFromEvent,
  type UndoHistory,
} from "../../src/undo_history.ts";

export default function PartDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  // パーツを切り替えたら作り直し, 選択中の行・式や Undo の履歴を前のパーツから持ち越さない
  return <PartDetail key={id ?? ""} id={id} />;
}

function PartDetail({ id }: { readonly id: string | undefined }): JSX.Element {
  const {
    language,
    parts,
    workingChanges,
    updateWorkingPart,
    discardWorkingPart,
    checkPartType,
    typeCheckMessage,
    setPageUndo,
  } = useDefiny();

  const part = parts.find(
    (p) =>
      p.partId === id || p.name === id || `${p.moduleName}.${p.name}` === id,
  ) ?? {
    partId: id ?? "unknown",
    moduleId: "core",
    moduleName: "core",
    name: id ? id.slice(0, 16) : "unknown",
    description: [],
    partType: null,
    expression: { "#number": 0 },
    updatedAtMs: Date.now(),
  };

  const change = workingChanges.parts.get(part.partId);
  const hasChange = change !== undefined;
  const currentName = change?.name ?? part.name;
  usePageTitle(`${part.moduleName}.${currentName}`);
  const currentDescription = change?.description ?? part.description;
  // 作業中の変更の型 (null は型指定なし) を優先する
  const currentPartType =
    change !== undefined ? change.partType : part.partType;
  const currentExpression =
    change?.expression !== undefined ? change.expression : part.expression;

  // 元に戻す (Undo) / やり直す (Redo). このパーツの作業中の変更 (無ければ undefined) を変える前ごとに積む.
  // 履歴はこのページを開いている間だけ持つ (別のパーツへ移ると消える)
  const [history, setHistory] =
    useState<UndoHistory<PartChange | undefined>>(emptyUndoHistory);

  const applyChange = useCallback(
    (next: PartChange | undefined): void => {
      if (next === undefined) {
        discardWorkingPart(part.partId);
      } else {
        updateWorkingPart(part.partId, next);
      }
    },
    [discardWorkingPart, part.partId, updateWorkingPart],
  );

  /** 作業中の変更を変え, 変える前の値を履歴に積む. 入力欄で続けて打った変更は `mergeKey` で 1 つにまとめる */
  const changePart = (
    next: PartChange | undefined,
    mergeKey: string | null,
  ): void => {
    setHistory((prev) => recordUndo(prev, change, mergeKey, Date.now()));
    applyChange(next);
  };

  const editPart = (
    fields: Partial<
      Pick<PartChange, "name" | "description" | "partType" | "expression">
    >,
    mergeKey: string | null,
  ): void => {
    changePart(
      {
        moduleDefinitionEventHash: part.moduleId,
        partDefinitionEventHash: part.partId,
        name: currentName,
        description: currentDescription,
        partType: currentPartType,
        expression: currentExpression,
        ...fields,
      },
      mergeKey,
    );
  };

  const handleUndoKey = useCallback(
    (key: "undo" | "redo"): void => {
      const result = (key === "undo" ? undo : redo)(history, change);
      if (result === null) {
        return;
      }
      setHistory(result.history);
      applyChange(result.value);
    },
    [applyChange, change, history],
  );

  // ヘッダー (definy のロゴの右) の元に戻す・やり直すボタンにこのパーツの履歴をつなぐ
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;
  useEffect(() => {
    setPageUndo({
      canUndo,
      canRedo,
      undo: () => {
        handleUndoKey("undo");
      },
      redo: () => {
        handleUndoKey("redo");
      },
    });
  }, [canUndo, canRedo, handleUndoKey, setPageUndo]);
  useEffect(
    () => () => {
      setPageUndo(null);
    },
    [setPageUndo],
  );

  // Ctrl / Cmd + Z で元に戻す, Ctrl / Cmd + Shift + Z と Ctrl + Y でやり直す.
  // 入力欄の中ではブラウザの入力欄の Undo に任せる. 実行パネルの式はパーツではないので対象にしない
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      const key = undoKeyFromEvent(e);
      if (
        key === null ||
        isTextInput(e.target) ||
        (e.target instanceof Element && e.target.closest(".run-panel") !== null)
      ) {
        return;
      }
      e.preventDefault();
      handleUndoKey(key);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [handleUndoKey]);

  // 編集中の式を, 編集が 500ms 止まってから definy 製の型チェッカーで検査し (コミット済みの型環境を使う),
  // 型エラーはエラーのある式の横に出す. 検査できない式 (未入力・コンパイラ組み込み) には何も出さない.
  // 検査した後に式を編集したら, 検査し直すまで出さない (エラーの式が見つからずルートに出てしまうため)
  const partIdHash = "partIdHash" in part ? (part.partIdHash ?? null) : null;
  const secret = secretLiteralOf(currentExpression);
  const [typeCheckResult, setTypeCheckResult] = useState<{
    readonly expression: unknown;
    readonly error: ExpressionTypeError | null;
  } | null>(null);
  const typeError =
    typeCheckResult !== null && typeCheckResult.expression === currentExpression
      ? typeCheckResult.error
      : null;
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      checkPartType({
        partIdHash,
        partType: currentPartType,
        expression: currentExpression,
      }).then(
        (outcome) => {
          if (cancelled) return;
          setTypeCheckResult({
            expression: currentExpression,
            error:
              outcome.kind === "type_error" || outcome.kind === "checker_failed"
                ? {
                    expression:
                      outcome.kind === "type_error" ? outcome.expression : null,
                    message: typeCheckMessage(null, outcome) ?? "",
                  }
                : null,
          });
        },
        (e: unknown) => {
          if (!cancelled) {
            setTypeCheckResult({
              expression: currentExpression,
              error: {
                expression: null,
                message: e instanceof Error ? e.message : String(e),
              },
            });
          }
        },
      );
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    checkPartType,
    typeCheckMessage,
    partIdHash,
    currentPartType,
    currentExpression,
  ]);

  return (
    <div className="part-detail-view">
      <div className="part-header card">
        <div className="breadcrumb">
          <Link href={`/module/${part.moduleName}`} className="breadcrumb-link">
            {part.moduleName}
          </Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{currentName}</span>
          {hasChange && (
            <span
              className="badge badge-warning"
              style={{
                marginLeft: "0.4rem",
                background: "var(--yellow-bg-strong)",
                color: "var(--yellow)",
                border: "1px solid var(--yellow-border)",
              }}
            >
              ● {label(language, "Modified", "編集中の変更あり", "Modifita")}
            </span>
          )}
        </div>

        <div
          className="part-actions"
          style={{ display: "flex", gap: "0.5rem" }}
        >
          {hasChange && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                changePart(undefined, null);
              }}
            >
              {label(
                language,
                "Discard Changes",
                "変更を破棄",
                "Malfari ŝanĝojn",
              )}
            </button>
          )}
        </div>
      </div>

      {secret !== null && (
        <SecretPanel
          key={secret.id}
          language={language}
          secret={secret}
          usages={findSecretUsages(
            parts,
            { partId: part.partId, partIdHash },
            secret.id,
          )}
          onChange={(next) => {
            editPart({ expression: { "#secret": next } }, "secret");
          }}
        />
      )}

      <PartDefinitionTree
        name={currentName}
        moduleName={part.moduleName}
        description={localizedText(currentDescription, language)}
        partType={currentPartType}
        expression={currentExpression}
        editable={true}
        typeError={typeError}
        onNameChange={(newName) => {
          editPart({ name: newName }, "name");
        }}
        onDescriptionChange={(newDesc) => {
          editPart(
            {
              description: withLocalizedText(
                currentDescription,
                language,
                newDesc,
              ),
            },
            "description",
          );
        }}
        onPartTypeChange={(newPartType) => {
          editPart({ partType: newPartType }, null);
        }}
        onExpressionChange={(newExpr, newPartType, mergeKey) => {
          editPart(
            newPartType === undefined
              ? { expression: newExpr }
              : { expression: newExpr, partType: newPartType },
            mergeKey ?? null,
          );
        }}
      />
    </div>
  );
}

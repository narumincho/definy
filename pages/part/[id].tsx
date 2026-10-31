import { partIdHashOf } from "../../src/working_parts.ts";
import {
  retargetPartChange,
  retargetReferencesOf,
} from "../../src/rename_part.ts";
import { useState, useCallback, useEffect, useMemo, type JSX } from "react";
import { useParams, useRouter } from "@void/react";
import { HierarchyBreadcrumb } from "../../src/components/HierarchyBreadcrumb.tsx";
import {
  label,
  localizedText,
  withLanguage,
  withLocalizedText,
} from "../../src/language.ts";
import { useDefiny } from "../../src/state.tsx";
import { usePageTitle } from "../../src/page_title.ts";
import { findSecretUsages, secretLiteralOf } from "../../src/secret.ts";
import { SecretPanel } from "../../src/components/SecretPanel.tsx";
import { VisibilitySelect } from "../../src/components/Visibility.tsx";
import { PartDefinitionTree } from "../../src/tree_layout/PartDefinitionTree.tsx";
import type { ExpressionTypeError } from "../../src/tree_layout/ExpressionTreeEditor.tsx";
import { isTextInput } from "../../src/tree_layout/keyboard.ts";
import type { PartChange, PartSnapshot } from "../../src/types.ts";
import {
  newPartSnapshot,
  partsReferencing,
  workingExpressionResolver,
} from "../../src/new_part.ts";
import {
  parameterRenames,
  renameCallArguments,
  renameCallersOf,
  renameRootParameters,
} from "../../src/tree_layout/rename_arguments.ts";
import type { DefinitionView } from "../../src/tree_layout/definition_rows.ts";
import {
  decodePartDefinition,
  partDefinitionExpression,
  partDefinitionType,
} from "../../src/part_definition.ts";
import { cachedDefinition } from "../../src/content_store.ts";
import { evaluateDefinition } from "../../src/definition_evaluator.ts";
import { loadDefinitionEvaluator } from "../../src/definition_evaluator_browser.ts";
import {
  isPartContent,
  partContentFromValue,
} from "../../src/event_content.ts";
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
  const { language, parts, workingChanges, connectionStatus } = useDefiny();
  const committed = parts.find(
    (p) =>
      p.partId === id || p.name === id || `${p.moduleName}.${p.name}` === id,
  );
  // コミットしていない新しいパーツ (作業中の変更だけにある. docs/ui.md「パーツの作成と削除」)
  const newChange =
    committed === undefined && id !== undefined
      ? workingChanges.parts.get(id)
      : undefined;
  const part: PartSnapshot | undefined =
    committed ??
    (newChange !== undefined && id !== undefined
      ? newPartSnapshot(id, newChange)
      : undefined);

  if (part === undefined) {
    // 読み込み前に仮のパーツを出すと, 編集して本物のパーツを上書きしてしまう (#764)
    return (
      <div className="part-detail-view">
        <div className="empty-state">
          {connectionStatus === "connecting" ? (
            <>
              <span className="spinner" />
              <p>
                {label(
                  language,
                  "Loading part...",
                  "パーツを読み込み中...",
                  "Ŝargante parton...",
                )}
              </p>
            </>
          ) : (
            <p>
              {label(
                language,
                "Part not found",
                "パーツが見つかりません",
                "Parto ne trovita",
              )}
            </p>
          )}
        </div>
      </div>
    );
  }
  // パーツを切り替えたら作り直し, 選択中の行・式や Undo の履歴を前のパーツから持ち越さない
  return <PartDetail key={part.partId} part={part} />;
}

function PartDetail({ part }: { readonly part: PartSnapshot }): JSX.Element {
  const {
    language,
    parts,
    workingChanges,
    updateWorkingPart,
    discardWorkingPart,
    checkPartType,
    typeCheckMessage,
    setPageUndo,
    projectOfModule,
    partsByIdHash,
  } = useDefiny();
  const router = useRouter();
  const isNewPart = !parts.some((p) => p.partId === part.partId);

  const change = workingChanges.parts.get(part.partId);
  const hasChange = change !== undefined;
  const currentName = change?.name ?? part.name;
  // パーツ ID はモジュール名とパーツ名から決まる. 名前を変えたパーツは, 参照も新しい名前の ID に付け替えている
  // (src/rename_part.ts) ので, 今の名前の ID を使う
  const partIdHash = partIdHashOf(part.moduleName, currentName);
  usePageTitle(`${part.moduleName}.${currentName}`);
  const currentDescription = change?.description ?? part.description;
  // 作業中の変更の型 (null は型指定なし) を優先する
  const currentPartType =
    change !== undefined ? change.partType : part.partType;
  const currentExpression =
    change?.expression !== undefined ? change.expression : part.expression;
  const currentVisibility = change?.visibility ?? part.visibility;

  // パーツの定義の式 (docs/part-definition.md). エディタで書いたもの, コミット済みのその場で評価できない定義の式
  // (ユーザーが作った定義のパーツの呼び出しなど), 無ければ今の中身から作る `core.define-part(...)` の順
  const committedDefinition =
    change === undefined && part.contentHash !== null
      ? cachedDefinition(part.contentHash)
      : undefined;
  const currentDefinition = useMemo(
    () =>
      change?.definition ??
      committedDefinition ??
      partDefinitionExpression({
        description: currentDescription,
        visibility: currentVisibility,
        partType: currentPartType,
        expression: currentExpression,
      }),
    [
      change?.definition,
      committedDefinition,
      currentDescription,
      currentVisibility,
      currentPartType,
      currentExpression,
    ],
  );
  // core.define-part / core.define-type の呼び出しでない (その場で評価できない) 定義の式
  const isCustomDefinition = useMemo(
    () => decodePartDefinition(currentDefinition) === undefined,
    [currentDefinition],
  );
  const [view, setView] = useState<DefinitionView>(() =>
    isCustomDefinition ? "definition" : "fields",
  );

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

  const isDeleted = change?.deleted === true;

  /**
   * コミット済みのパーツは削除の作業中の変更にする. 新しいパーツは作業中の変更を捨てる.
   * 参照しているパーツがあれば先に確かめる (削除するとそれらは型エラーになる)
   */
  const handleDelete = (): void => {
    const referencing = partsReferencing(
      partIdHash,
      part.partId,
      parts,
      workingChanges,
    );
    if (
      referencing.length > 0 &&
      !window.confirm(
        `${label(
          language,
          "These parts refer to this part and will have type errors:",
          "次のパーツがこのパーツを参照していて, 型エラーになります:",
          "Ĉi tiuj partoj referencas ĉi tiun parton:",
        )}\n${referencing.join("\n")}`,
      )
    ) {
      return;
    }
    if (isNewPart) {
      discardWorkingPart(part.partId);
      router.visit(withLanguage(`/module/${part.moduleName}`, language));
      return;
    }
    editPart({ deleted: true }, null);
  };

  const editPart = (
    fields: Partial<
      Pick<
        PartChange,
        | "name"
        | "description"
        | "partType"
        | "expression"
        | "deleted"
        | "visibility"
        | "definition"
      >
    >,
    mergeKey: string | null,
  ): void => {
    // 中身 (説明・型・式・公開/非公開) を項目ごとに変えたら, 書いた定義の式は使わない
    // (コミットで core.define-part(...) の形になる. docs/part-definition.md)
    const keepsDefinition =
      fields.definition !== undefined ||
      (fields.description === undefined &&
        fields.partType === undefined &&
        fields.expression === undefined &&
        fields.visibility === undefined);
    const definition = keepsDefinition
      ? (fields.definition ?? change?.definition ?? committedDefinition)
      : undefined;
    const { definition: _, ...contentFields } = fields;
    const next: PartChange = {
      moduleDefinitionEventHash: part.moduleId,
      partDefinitionEventHash: part.partId,
      name: currentName,
      description: currentDescription,
      partType: currentPartType,
      expression: currentExpression,
      ...(change?.visibility !== undefined
        ? { visibility: change.visibility }
        : {}),
      ...(isDeleted ? { deleted: true } : {}),
      ...contentFields,
      ...(definition !== undefined ? { definition } : {}),
    };
    // 名前を変えたら, このパーツ自身 (再帰呼び出し) と他のパーツの参照を新しい名前の ID に付け替える.
    // 他のパーツの変更は作業中の変更に入れるだけで, このページの Undo では戻さない
    if (fields.name !== undefined && fields.name !== currentName) {
      const renamedId = partIdHashOf(part.moduleName, fields.name);
      for (const [key, retargeted] of retargetReferencesOf(
        parts,
        workingChanges,
        partIdHash,
        renamedId,
        part.partId,
      )) {
        updateWorkingPart(key, retargeted);
      }
      changePart(retargetPartChange(next, partIdHash, renamedId), mergeKey);
      return;
    }
    // 引数名を変えたら, このパーツ自身 (再帰呼び出し) と他のパーツの呼び出しの引数名も合わせて変える.
    // 他のパーツの変更は作業中の変更に入れるだけで, このページの Undo では戻さない
    const renames =
      fields.partType === undefined
        ? new Map<string, string>()
        : parameterRenames(currentPartType, fields.partType);
    if (renames.size > 0) {
      for (const caller of renameCallersOf(
        parts,
        workingChanges,
        partIdHash,
        renames,
        part.partId,
      )) {
        updateWorkingPart(caller.partDefinitionEventHash, caller);
      }
    }
    changePart(
      {
        ...next,
        expression: renameCallArguments(
          // 型の行で引数名を変えたときは, 式の根の関数の引数名も合わせる
          fields.expression === undefined
            ? renameRootParameters(next.expression, renames)
            : next.expression,
          partIdHash,
          renames,
        ),
      },
      mergeKey,
    );
  };

  /**
   * 定義の式を変える. `core.define-part(...)` などその場で評価できるものは, 評価した中身を説明・型・式にも入れる.
   * それ以外は評価器で評価してから入れる (下の useEffect)
   */
  const changeDefinition = (
    definition: unknown,
    mergeKey: string | null,
  ): void => {
    const content = decodePartDefinition(definition);
    editPart(
      content === undefined
        ? { definition }
        : {
            definition,
            description: content.description,
            visibility: content.visibility ?? currentVisibility,
            partType: content.partType,
            expression: content.expression,
          },
      mergeKey,
    );
  };

  // その場で評価できない定義の式は definy 製の評価器 (core.eval-value) で評価する. 参照するパーツの式は作業中の変更を優先する.
  // 書いた定義の式なら, 評価した中身を作業中の変更の説明・型・式に入れる (Undo の履歴には積まない)
  const [definitionEvaluation, setDefinitionEvaluation] = useState<{
    readonly definition: unknown;
    readonly ok: boolean;
  } | null>(null);
  useEffect(() => {
    if (!isCustomDefinition) {
      return;
    }
    let cancelled = false;
    loadDefinitionEvaluator().then(
      (evaluator) => {
        if (cancelled) return;
        const value = evaluateDefinition(
          evaluator,
          currentDefinition,
          workingExpressionResolver(partsByIdHash, workingChanges),
        );
        const content =
          value !== undefined && isPartContent(value)
            ? partContentFromValue(value)
            : undefined;
        setDefinitionEvaluation({
          definition: currentDefinition,
          ok: content !== undefined,
        });
        if (
          content !== undefined &&
          change !== undefined &&
          change.definition === currentDefinition
        ) {
          const next: PartChange = {
            ...change,
            description: content.description,
            visibility: content.visibility ?? currentVisibility,
            partType: content.partType,
            expression: content.expression,
          };
          if (
            JSON.stringify([
              next.description,
              next.visibility,
              next.partType,
              next.expression,
            ]) !==
            JSON.stringify([
              change.description,
              change.visibility,
              change.partType,
              change.expression,
            ])
          ) {
            updateWorkingPart(part.partId, next);
          }
        }
      },
      (e: unknown) => {
        console.error("failed to load the definition evaluator", e);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [
    isCustomDefinition,
    currentDefinition,
    change,
    partsByIdHash,
    workingChanges,
    part.partId,
    updateWorkingPart,
    currentVisibility,
  ]);
  const definitionEvaluated =
    definitionEvaluation !== null &&
    definitionEvaluation.definition === currentDefinition
      ? definitionEvaluation.ok
      : undefined;
  const definitionNotice = !isCustomDefinition
    ? null
    : definitionEvaluated === false
      ? label(
          language,
          "This definition expression cannot be evaluated to a core.part-content. Committing it will be rejected.",
          "この定義の式は評価して core.part-content になりません。このままではコミットできません。",
          "Ĉi tiu difina esprimo ne donas core.part-content.",
        )
      : view === "fields"
        ? label(
            language,
            "This part is defined by a definition expression. Editing the fields replaces it with core.define-part(...).",
            "このパーツは定義の式で定義されています。項目を編集すると core.define-part(...) の形に置き換わります。",
            "Ĉi tiu parto estas difinita per difina esprimo.",
          )
        : null;

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
  const secret = secretLiteralOf(currentExpression);
  const [typeCheckResult, setTypeCheckResult] = useState<{
    readonly expression: unknown;
    readonly error: ExpressionTypeError | null;
  } | null>(null);
  // ユーザーが作った定義のパーツで書いた定義の式は, core.part-content 型の式として検査する.
  // core.define-part(...) などその場で評価できる定義の式は, 評価した型と式を検査する
  // (型チェッカーは quote の中の関数の引数の型を推論できないため. エラーの式は定義の式の quote の中に出る)
  const checksDefinition = view === "definition" && isCustomDefinition;
  const checkedPartType = checksDefinition
    ? partDefinitionType()
    : currentPartType;
  const checkedExpression = checksDefinition
    ? currentDefinition
    : currentExpression;
  const typeError =
    typeCheckResult !== null && typeCheckResult.expression === checkedExpression
      ? typeCheckResult.error
      : null;
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      checkPartType({
        partIdHash: checksDefinition ? null : partIdHash,
        partType: checkedPartType,
        expression: checkedExpression,
      }).then(
        (outcome) => {
          if (cancelled) return;
          setTypeCheckResult({
            expression: checkedExpression,
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
              expression: checkedExpression,
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
    checksDefinition,
    checkedPartType,
    checkedExpression,
  ]);

  return (
    <div className="part-detail-view">
      <div className="part-header card">
        <HierarchyBreadcrumb
          projectName={projectOfModule(part.moduleName) ?? ""}
          moduleName={part.moduleName}
          partName={currentName}
        >
          {hasChange && (
            <span className="badge badge-warning part-modified-badge">
              ● {label(language, "Modified", "編集中の変更あり", "Modifita")}
            </span>
          )}
        </HierarchyBreadcrumb>

        <div
          className="part-actions"
          style={{ display: "flex", gap: "0.5rem" }}
        >
          <VisibilitySelect
            id="part-visibility-select"
            language={language}
            value={currentVisibility}
            disabled={isDeleted}
            onChange={(visibility) => {
              editPart({ visibility }, null);
            }}
          />
          {hasChange && !isNewPart && (
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
          {!isDeleted && (
            <button
              type="button"
              className="btn btn-danger btn-sm part-delete-button"
              onClick={handleDelete}
            >
              {isNewPart
                ? label(
                    language,
                    "Discard New Part",
                    "新しいパーツを破棄",
                    "Forĵeti novan parton",
                  )
                : label(
                    language,
                    "Delete Part",
                    "パーツを削除",
                    "Forigi parton",
                  )}
            </button>
          )}
        </div>
      </div>

      {isDeleted && (
        <div className="alert alert-danger part-deleted-banner" role="status">
          {label(
            language,
            "This part will be deleted from the module when you commit.",
            "このパーツはコミットするとモジュールから削除されます。",
            "Ĉi tiu parto estos forigita el la modulo kiam vi enmetos.",
          )}{" "}
          <button
            type="button"
            className="btn btn-secondary btn-xs"
            onClick={() => {
              editPart({ deleted: false }, null);
            }}
          >
            {label(language, "Restore", "削除を取り消す", "Restarigi")}
          </button>
        </div>
      )}

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
        view={view}
        onViewChange={setView}
        definition={currentDefinition}
        onDefinitionChange={(next, mergeKey) => {
          changeDefinition(next, mergeKey ?? null);
        }}
        definitionNotice={definitionNotice}
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

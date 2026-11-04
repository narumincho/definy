import { useEffect, useMemo, useState } from "react";
import { localizedText } from "../language.ts";
import type { LanguageCode, PartSnapshot } from "../types.ts";
import { findHoverTarget, type HoverTarget } from "./hover_info.ts";
import {
  findExpressionTypeAt,
  type ExpressionTypeAt,
  type TypeQuery,
} from "./type_inference.ts";
import { pathToString, type LayoutNode } from "./types.ts";

/** 式にマウスを置いてからホバーの表示を出すまでの時間 */
const HOVER_DELAY_MS = 350;

/**
 * ホバーした式の型とパーツのドキュメント (`ExpressionHoverCard` に渡すもの).
 * マウスを少し止めてから出す. 置換メニューを開いている間は出さない. 出すものが無ければ `null`
 */
export function useExpressionHover({
  hoveredId,
  isMenuOpen,
  layoutRoot,
  expression,
  mode,
  partType,
  findExpectedType,
  partsByIdHash,
  language,
}: {
  readonly hoveredId: string | null;
  readonly isMenuOpen: boolean;
  readonly layoutRoot: LayoutNode;
  readonly expression: unknown;
  readonly mode: "expression" | "type";
  readonly partType: unknown;
  readonly findExpectedType: TypeQuery;
  readonly partsByIdHash: ReadonlyMap<string, PartSnapshot>;
  readonly language: LanguageCode;
}) {
  const [shownHover, setShownHover] = useState<HoverTarget | null>(null);
  const [hoverType, setHoverType] = useState<{
    readonly key: string;
    readonly type: ExpressionTypeAt | null;
  } | null>(null);
  const hoverKey =
    shownHover === null
      ? null
      : `${shownHover.nodeId}|${pathToString(shownHover.path)}`;

  const hoverTarget = useMemo(
    () =>
      hoveredId === null || isMenuOpen
        ? null
        : findHoverTarget(layoutRoot, expression, hoveredId),
    [hoveredId, isMenuOpen, layoutRoot, expression],
  );
  useEffect(() => {
    if (hoverTarget === null) {
      setShownHover(null);
      return;
    }
    const timer = setTimeout(() => {
      setShownHover(hoverTarget);
    }, HOVER_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [hoverTarget]);

  // ホバーした式の型を definy 製の型チェッカーに聞く (型のツリーエディタでは聞かない)
  useEffect(() => {
    if (
      shownHover === null ||
      hoverKey === null ||
      mode === "type" ||
      partType == null
    ) {
      return;
    }
    let cancelled = false;
    findExpressionTypeAt(
      findExpectedType,
      partType,
      expression,
      shownHover.path,
    ).then(
      (type) => {
        if (!cancelled) {
          setHoverType({ key: hoverKey, type });
        }
      },
      (e: unknown) => {
        console.error("failed to find the type of the expression", e);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [shownHover, hoverKey, mode, partType, expression, findExpectedType]);

  return useMemo(() => {
    if (shownHover === null || hoverKey === null) {
      return null;
    }
    const part =
      shownHover.partIdHash === null
        ? undefined
        : partsByIdHash.get(shownHover.partIdHash);
    const title =
      part !== undefined
        ? `${part.moduleName}.${part.name}`
        : shownHover.variableName;
    const typeQueried = mode !== "type" && partType != null;
    const typeAt =
      hoverType !== null && hoverType.key === hoverKey ? hoverType.type : null;
    const type = !typeQueried
      ? null
      : hoverType?.key !== hoverKey
        ? ("loading" as const)
        : typeAt === null
          ? null
          : { kind: typeAt.kind, type: typeAt.type };
    const description =
      part === undefined ? "" : localizedText(part.description, language);
    if (title === null && type === null && description.length === 0) {
      return null;
    }
    return {
      nodeId: shownHover.nodeId,
      title,
      titleKind:
        part !== undefined
          ? ("part" as const)
          : title !== null
            ? ("variable" as const)
            : null,
      type,
      description,
    };
  }, [
    shownHover,
    hoverKey,
    hoverType,
    partsByIdHash,
    mode,
    partType,
    language,
  ]);
}

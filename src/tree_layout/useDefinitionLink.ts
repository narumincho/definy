import { useEffect, useMemo, useState } from "react";
import type { DefinitionTarget } from "./go_to_definition.ts";
import { findNodeById } from "./selection.ts";
import type { LayoutNode, PathStep } from "./types.ts";

/** Ctrl / Cmd を押しているか. ウィンドウのキー・マウスのイベントで追いかける */
function useModifierHeld(): boolean {
  const [modifierHeld, setModifierHeld] = useState(false);
  useEffect(() => {
    const update = (e: KeyboardEvent | MouseEvent): void => {
      setModifierHeld(e.ctrlKey || e.metaKey);
    };
    const release = (): void => {
      setModifierHeld(false);
    };
    window.addEventListener("keydown", update);
    window.addEventListener("keyup", update);
    window.addEventListener("mousemove", update);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("keydown", update);
      window.removeEventListener("keyup", update);
      window.removeEventListener("mousemove", update);
      window.removeEventListener("blur", release);
    };
  }, []);
  return modifierHeld;
}

/**
 * Ctrl / Cmd を押している間, ホバーしている名前 (子の無いノード) が定義へ移動できるなら, そのノードの ID
 * (下線を引く. VSCode と同じ). 無ければ `null`
 */
export function useDefinitionLink({
  hoveredId,
  layoutRoot,
  findDefinition,
}: {
  readonly hoveredId: string | null;
  readonly layoutRoot: LayoutNode;
  readonly findDefinition: (
    path: ReadonlyArray<PathStep>,
  ) => DefinitionTarget | null;
}): string | null {
  const modifierHeld = useModifierHeld();
  return useMemo(() => {
    if (!modifierHeld || hoveredId === null) {
      return null;
    }
    const node = findNodeById(layoutRoot, hoveredId);
    return node !== null &&
      node.children.length === 0 &&
      findDefinition(node.path) !== null
      ? hoveredId
      : null;
  }, [findDefinition, hoveredId, layoutRoot, modifierHeld]);
}

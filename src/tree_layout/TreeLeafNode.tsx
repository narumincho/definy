import { useEffect, useState, type JSX, type KeyboardEvent } from "react";
import { estimateTextWidth } from "./engine.ts";
import { nodeBadgeStyle } from "./node_badge_style.ts";
import { pathToString, type LayoutNode, type PathStep } from "./types.ts";

/** 編集中の文字列リテラルの入力欄のカーソル位置. 入力欄が作り直されたときに戻すため */
let editingStringCaret: {
  readonly path: string;
  readonly start: number;
  readonly end: number;
} | null = null;

/**
 * 子の無いノード (リテラル・名前). 選んでいて編集できるときは数値・文字列・名前の入力欄にする
 */
export function TreeLeafNode({
  node,
  isSelected,
  isLink,
  state,
  anchorName,
  inlineEdit,
  editable,
  onSelect,
  onChangeNumber,
  onChangeString,
  onClear,
  typeErrorMarker,
}: {
  readonly node: LayoutNode;
  readonly isSelected: boolean;
  /** Ctrl / Cmd を押しながらホバーしていて, クリックで定義へ移動できる */
  readonly isLink: boolean;
  readonly state: string;
  readonly anchorName?: string;
  readonly inlineEdit: boolean;
  readonly editable: boolean;
  readonly onSelect: (e: React.MouseEvent) => void;
  readonly onChangeNumber?: (
    path: ReadonlyArray<PathStep>,
    value: number,
  ) => void;
  readonly onChangeString?: (
    path: ReadonlyArray<PathStep>,
    value: string,
  ) => void;
  readonly onClear?: (path: ReadonlyArray<PathStep>) => void;
  readonly typeErrorMarker: JSX.Element | null;
}): JSX.Element {
  const isEditing = editable && isSelected && inlineEdit;

  const [localNumber, setLocalNumber] = useState(node.label);
  const [localString, setLocalString] = useState(() =>
    node.label.replace(/^"|"$/g, ""),
  );

  useEffect(() => {
    setLocalNumber(node.label);
    setLocalString(node.label.replace(/^"|"$/g, ""));
  }, [node.label]);

  function handleKeyDown(
    e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void {
    if (e.key === "Delete") {
      e.preventDefault();
      onClear?.(node.path);
      return;
    }
    if (e.key === "Backspace") {
      const val = e.currentTarget.value;
      let isAllSelected = false;
      try {
        isAllSelected =
          e.currentTarget.selectionStart === 0 &&
          e.currentTarget.selectionEnd === val.length;
      } catch {
        // ignore
      }
      if (val.length === 0 || isAllSelected || val === node.label) {
        e.preventDefault();
        onClear?.(node.path);
        return;
      }
    }
    // Escape / Enter はツリーの枠 (ExpressionTreeEditor) で受けてツリーにフォーカスを戻す
  }

  function rememberCaret(textarea: HTMLTextAreaElement): void {
    editingStringCaret = {
      path: pathToString(node.path),
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    };
  }

  let content: JSX.Element;

  if (isEditing && node.kind === "literalNumber") {
    content = (
      <input
        type="number"
        value={localNumber}
        // クリック・Enter で選んだときはすぐ入力できるようにする.
        // キーボードで移動している間は inlineEdit が false なので入力欄にならない
        autoFocus
        onFocus={(e) => {
          e.currentTarget.select();
        }}
        style={{
          background: "transparent",
          border: "none",
          outline: "none",
          boxShadow: "none",
          borderRadius: "var(--radius-full)",
          color: "inherit",
          fontFamily: "inherit",
          fontSize: "inherit",
          width: "3.5rem",
          textAlign: "center",
          padding: 0,
          margin: 0,
        }}
        onKeyDown={handleKeyDown}
        onChange={(e) => {
          setLocalNumber(e.target.value);
          const num = Number(e.target.value);
          if (!Number.isNaN(num)) {
            onChangeNumber?.(node.path, num);
          }
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      />
    );
  } else if (isEditing && node.kind === "literalString") {
    // 文字列リテラルは改行を含められる. Shift + Enter で改行し, Enter でツリーに戻る (useTreeKeyboard)
    const lines = localString.split("\n");
    content = (
      <textarea
        value={localString}
        autoFocus
        rows={lines.length}
        cols={Math.max(6, ...lines.map((line) => estimateTextWidth(line, 1)))}
        onFocus={(e) => {
          // 改行の入力などで 1 行 ⇔ 複数行のレイアウトが変わると入力欄が作り直されるので, カーソルの位置を戻す
          const caret = editingStringCaret;
          if (caret !== null && caret.path === pathToString(node.path)) {
            e.currentTarget.setSelectionRange(caret.start, caret.end);
          } else {
            e.currentTarget.select();
          }
        }}
        onSelect={(e) => {
          rememberCaret(e.currentTarget);
        }}
        onBlur={() => {
          editingStringCaret = null;
        }}
        style={{
          background: "transparent",
          border: "none",
          outline: "none",
          boxShadow: "none",
          color: "inherit",
          fontFamily: "inherit",
          fontSize: "inherit",
          lineHeight: "inherit",
          resize: "none",
          overflow: "hidden",
          width: "auto",
          minHeight: 0,
          whiteSpace: "pre",
          padding: 0,
          margin: 0,
        }}
        onKeyDown={handleKeyDown}
        onChange={(e) => {
          rememberCaret(e.currentTarget);
          setLocalString(e.target.value);
          onChangeString?.(node.path, e.target.value);
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      />
    );
  } else if (isEditing && node.kind === "parameterName") {
    content = (
      <input
        type="text"
        value={localString}
        autoFocus
        onFocus={(e) => {
          e.currentTarget.select();
        }}
        style={{
          background: "transparent",
          border: "none",
          outline: "none",
          boxShadow: "none",
          borderRadius: "var(--radius-full)",
          color: "inherit",
          fontFamily: "inherit",
          fontSize: "inherit",
          minWidth: "3.5rem",
          maxWidth: "12rem",
          padding: 0,
          margin: 0,
        }}
        onKeyDown={handleKeyDown}
        onChange={(e) => {
          setLocalString(e.target.value);
          onChangeString?.(node.path, e.target.value);
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      />
    );
  } else {
    content = (
      <>
        <span>{node.label}</span>
        {node.hint !== undefined && (
          <span className="tree-hole-hint">{node.hint}</span>
        )}
      </>
    );
  }
  // 改行を含む文字列リテラルは改行したまま複数行で出す
  const isMultiline =
    node.kind === "literalString" && node.label.includes("\n");

  return (
    <div
      className="tree-node-leaf"
      data-node-id={node.id}
      style={{
        display: "inline-flex",
        alignItems: "center",
        verticalAlign: "middle",
        margin: "0.08rem 0.12rem",
        ...(anchorName ? { anchorName } : {}),
      }}
      onClick={onSelect}
    >
      <div
        className="tree-badge"
        data-state={state}
        data-type-error={typeErrorMarker !== null ? "true" : undefined}
        data-link={isLink ? "true" : undefined}
        style={{
          ...nodeBadgeStyle(node.kind),
          // 文字列リテラルは空白・改行をそのまま見せる
          whiteSpace: node.kind === "literalString" ? "pre" : "nowrap",
          ...(isMultiline
            ? { borderRadius: "var(--radius-md)", lineHeight: 1.5 }
            : {}),
          ...(isLink
            ? { textDecoration: "underline", textUnderlineOffset: "0.15em" }
            : {}),
        }}
      >
        {content}
      </div>
      {typeErrorMarker}
    </div>
  );
}

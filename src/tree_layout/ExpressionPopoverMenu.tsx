import { useEffect, useRef, type JSX, type KeyboardEvent } from "react";
import { Link } from "../components/Link.tsx";
import type { LanguageCode } from "../types.ts";
import { label } from "../language.ts";
import type { ExpectedType } from "./type_inference.ts";
import type { PathStep } from "./types.ts";
import {
  isTypeMismatch,
  type Highlight,
  type SelectorOption,
} from "./selector_options.ts";

/**
 * 置換メニューを選択中のノードの直下に出すのに必要な
 * CSS Anchor Positioning と Popover API に対応しているか.
 * 未対応なら従来どおり式全体の下に通常のフローで表示する
 */
export function supportsAnchoredPopover(): boolean {
  return (
    typeof CSS !== "undefined" &&
    typeof HTMLElement !== "undefined" &&
    CSS.supports("position-anchor", "--a") &&
    CSS.supports("position-area", "block-end") &&
    "showPopover" in HTMLElement.prototype
  );
}

/**
 * メニューを top layer に出す. エディタの `overflow` で切り取られないようにするため.
 * 検索欄へのフォーカス (useEffect) より前に表示されている必要があるので ref コールバックで行う
 */
export function showAsPopover(element: HTMLDivElement | null): void {
  if (element !== null && !element.matches(":popover-open")) {
    element.showPopover();
  }
}

export type ExpressionPopoverMenuProps = {
  readonly language: LanguageCode;
  readonly selectedPath: ReadonlyArray<PathStep>;
  readonly selectionAnchorName: string;
  readonly currentName: string;
  readonly expectedType: ExpectedType;
  readonly searchQuery: string;
  readonly setSearchQuery: (query: string) => void;
  readonly setQueryEdited: (edited: boolean) => void;
  readonly chosenIndex: number | null;
  readonly setChosenIndex: (index: number | null) => void;
  readonly filteredOptions: ReadonlyArray<SelectorOption>;
  readonly currentOptionValue: string | null;
  readonly highlight: Highlight;
  readonly effectiveHighlightIndex: number | null;
  readonly isLiteralSelected: boolean;
  readonly menuOpenCount: number;
  readonly onClear: (path: ReadonlyArray<PathStep>) => void;
  readonly onClose: () => void;
  readonly onApplyOption: (value: string) => void;
  readonly onReturnToTree: () => void;
};

export function ExpressionPopoverMenu({
  language,
  selectedPath,
  selectionAnchorName,
  currentName: _currentName,
  expectedType,
  searchQuery,
  setSearchQuery,
  setQueryEdited,
  chosenIndex,
  setChosenIndex,
  filteredOptions,
  currentOptionValue,
  highlight,
  effectiveHighlightIndex,
  isLiteralSelected,
  menuOpenCount,
  onClear,
  onClose,
  onApplyOption,
  onReturnToTree,
}: ExpressionPopoverMenuProps): JSX.Element {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const anchoredMenu = supportsAnchoredPopover();

  // メニューを開いた直後: 検索欄 (現在の名前が入っている) を全選択し (打てば置き換わる),
  // 現在の選択肢がリストの中央に来るようにスクロールする.
  // 数値・文字列リテラルはノード上で直接編集するので検索欄にフォーカスを移さない
  useEffect(() => {
    if (menuOpenCount === 0) return;
    const input = searchInputRef.current;
    if (input && !isLiteralSelected) {
      input.focus();
      input.select();
    }
    const list = listRef.current;
    const selected = list?.querySelector<HTMLElement>('[data-current="true"]');
    if (list && selected) {
      list.scrollTop =
        selected.offsetTop - (list.clientHeight - selected.clientHeight) / 2;
    }
  }, [menuOpenCount, isLiteralSelected]);

  // キー操作でハイライトが移動したときに追従スクロールする
  useEffect(() => {
    if (chosenIndex === null) return;
    listRef.current
      ?.querySelector(`[data-index="${chosenIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [chosenIndex]);

  function handleMenuKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      if (filteredOptions.length === 0) return;
      setChosenIndex(
        effectiveHighlightIndex === null
          ? 0
          : e.key === "ArrowDown"
            ? Math.min(effectiveHighlightIndex + 1, filteredOptions.length - 1)
            : Math.max(effectiveHighlightIndex - 1, 0),
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      const chosen =
        highlight.kind === "chosen" ? filteredOptions[highlight.index] : null;
      if (chosen) {
        onApplyOption(chosen.value);
      } else {
        onReturnToTree();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onReturnToTree();
    } else if (
      (e.key === "Backspace" || e.key === "Delete") &&
      e.currentTarget.value.length === 0
    ) {
      e.preventDefault();
      e.stopPropagation();
      onClear(selectedPath);
    }
  }

  return (
    <div
      ref={anchoredMenu ? showAsPopover : undefined}
      popover={anchoredMenu ? "manual" : undefined}
      className={
        anchoredMenu
          ? "dropdown-popover-panel expression-node-dropdown"
          : "dropdown-popover-panel"
      }
      style={{
        ...(anchoredMenu
          ? { positionAnchor: selectionAnchorName }
          : {
              position: "relative",
              marginTop: "0.5rem",
              maxWidth: "26rem",
            }),
        zIndex: 100,
        maxHeight: "20rem",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.45rem",
          padding: "0.4rem 0.6rem",
          borderBottom: "1px solid var(--border)",
          fontSize: "0.76rem",
        }}
      >
        <input
          ref={searchInputRef}
          type="text"
          className="dropdown-search-input"
          placeholder={label(
            language,
            "Search expression or part...",
            "式・パーツを検索...",
            "Serĉi esprimon aŭ parton...",
          )}
          value={searchQuery}
          onFocus={(e) => {
            e.currentTarget.select();
          }}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setQueryEdited(true);
            setChosenIndex(0);
          }}
          onKeyDown={handleMenuKeyDown}
        />

        {expectedType !== "any" && (
          <span
            style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}
          >
            {label(language, "Expects:", "期待:", "Atendas:")}{" "}
            <span
              className="mono"
              style={{ color: "var(--blue-text)", fontWeight: 600 }}
            >
              {expectedType}
            </span>
          </span>
        )}
        <button
          type="button"
          className="dropdown-header-button"
          style={{ marginLeft: "auto" }}
          title={label(
            language,
            "Clear (Delete)",
            "未入力にする (Delete)",
            "Malplenigi (Delete)",
          )}
          onClick={() => {
            onClear(selectedPath);
          }}
        >
          ⌫
        </button>
        <button
          type="button"
          className="dropdown-header-button"
          title={label(language, "Deselect", "選択解除", "Malelekti")}
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      <div
        ref={listRef}
        style={{
          overflowY: "auto",
          overflowX: "hidden",
          maxHeight: "15rem",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {filteredOptions.length === 0 ? (
          <div
            style={{
              padding: "0.5rem",
              color: "var(--text-muted)",
              fontSize: "0.8rem",
            }}
          >
            {label(
              language,
              "No matches",
              "一致する候補がありません",
              "Neniuj kongruoj",
            )}
          </div>
        ) : (
          filteredOptions.map((opt, idx) => {
            const isMismatch = isTypeMismatch(opt, expectedType);
            const isFirstMismatch =
              isMismatch &&
              idx > 0 &&
              !isTypeMismatch(filteredOptions[idx - 1] ?? opt, expectedType);
            const isCurrent = opt.value === currentOptionValue;
            return (
              <OptionItem
                key={opt.value}
                option={opt}
                index={idx}
                headingBefore={
                  isFirstMismatch
                    ? label(
                        language,
                        "Other (type does not match)",
                        "その他 (型が合わない)",
                        "Aliaj (tipo ne kongruas)",
                      )
                    : null
                }
                isHighlighted={idx === effectiveHighlightIndex}
                isCurrent={isCurrent}
                isSecondary={isMismatch}
                linkTitle={label(
                  language,
                  "Open part page",
                  "パーツのページを開く",
                  "Malfermi la paĝon de la parto",
                )}
                onHighlight={() => {
                  setChosenIndex(idx);
                }}
                onSelect={() => {
                  onApplyOption(opt.value);
                }}
                onOpenLink={onClose}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function OptionItem({
  option,
  index,
  headingBefore,
  isHighlighted,
  isCurrent,
  isSecondary,
  linkTitle,
  onHighlight,
  onSelect,
  onOpenLink,
}: {
  readonly option: SelectorOption;
  readonly index: number;
  readonly headingBefore: string | null;
  readonly isHighlighted: boolean;
  readonly isCurrent: boolean;
  readonly isSecondary: boolean;
  readonly linkTitle: string;
  readonly onHighlight: () => void;
  readonly onSelect: () => void;
  readonly onOpenLink: () => void;
}): JSX.Element {
  return (
    <>
      {headingBefore !== null && (
        <div className="dropdown-option-heading">{headingBefore}</div>
      )}
      <div
        className="dropdown-option"
        data-index={index}
        data-state={
          isHighlighted ? "highlighted" : isCurrent ? "selected" : undefined
        }
        data-current={isCurrent ? "true" : undefined}
        data-secondary={isSecondary ? "true" : "false"}
        onMouseEnter={onHighlight}
      >
        <button
          type="button"
          className="dropdown-option-button"
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onClick={onSelect}
        >
          <span className="dropdown-option-check">{isCurrent ? "✓" : ""}</span>
          <span className="dropdown-option-name">{option.name}</span>
          {option.detail !== undefined && (
            <span className="dropdown-option-detail">{option.detail}</span>
          )}
          <span className="dropdown-option-category">{option.category}</span>
        </button>
        {option.partId !== undefined && (
          <Link
            href={`/part/${option.partId}`}
            className="dropdown-item-link"
            title={linkTitle}
            aria-label={`${linkTitle}: ${option.name}`}
            onClick={onOpenLink}
          >
            ↗
          </Link>
        )}
      </div>
    </>
  );
}

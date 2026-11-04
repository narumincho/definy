import { memo, type JSX } from "react";
import { Link } from "../Link.tsx";
import {
  ChevronRightIcon,
  PartsIcon,
  type IconComponent,
} from "../../icons.tsx";
import { label } from "../../language.ts";
import type { LanguageCode } from "../../types.ts";
import type { TreeLevel } from "./tree_keys.ts";

/**
 * 木の 1 行. 左の ›/⌄ で開閉し, 名前はその段の詳細のページへのリンク
 */
export function TreeRow({
  level,
  open,
  onToggle,
  href,
  icon: Icon,
  text,
  mono = false,
  detail,
  badge,
  current = false,
  typeErrorCount = 0,
  count,
  onNavigate,
  language,
}: {
  readonly level: TreeLevel;
  readonly open: boolean;
  readonly onToggle: () => void;
  readonly href: string;
  readonly icon: IconComponent;
  readonly text: string;
  readonly mono?: boolean;
  /** 名前の後ろに薄く出す補足 (ブランチの作成者, コミットのメッセージ) */
  readonly detail?: string | undefined;
  readonly badge?: string | undefined;
  readonly current?: boolean;
  readonly typeErrorCount?: number;
  readonly count?: number;
  readonly onNavigate: () => void;
  readonly language: LanguageCode;
}): JSX.Element {
  const toggleLabel = open
    ? label(language, "Collapse", "閉じる", "Faldi")
    : label(language, "Expand", "開く", "Malfaldi");
  return (
    <div className="sidebar-tree-row" data-level={level}>
      <button
        type="button"
        className="sidebar-tree-toggle"
        aria-expanded={open}
        aria-label={`${toggleLabel}: ${text}`}
        title={toggleLabel}
        onClick={onToggle}
      >
        <ChevronRightIcon
          size={14}
          className={`sidebar-chevron ${open ? "expanded" : ""}`}
        />
      </button>
      <Link
        href={href}
        className={`sidebar-tree-node ${level}-node`}
        aria-current={current ? "page" : undefined}
        onClick={onNavigate}
        title={
          detail === undefined || detail === "" ? text : `${text} — ${detail}`
        }
      >
        <Icon size={15} className={`sidebar-node-icon tree-icon-${level}`} />
        <span className={`sidebar-node-label ${mono ? "font-mono" : ""}`}>
          {text}
        </span>
        {detail !== undefined && detail !== "" && (
          <span className="sidebar-node-detail">{detail}</span>
        )}
        {badge !== undefined && <span className="sidebar-branch">{badge}</span>}
        {typeErrorCount > 0 && (
          <span
            className="sidebar-type-error-count"
            title={label(
              language,
              `${typeErrorCount} parts with type errors`,
              `型エラーのあるパーツ ${typeErrorCount} 件`,
              `${typeErrorCount} partoj kun tiperaroj`,
            )}
          >
            {typeErrorCount}
          </span>
        )}
        {count !== undefined && <span className="sidebar-count">{count}</span>}
      </Link>
    </div>
  );
}

/** 各段の先頭の「+ ○○の追加」. `level` はその段 (追加するものの段) */
export function AddRow({
  level,
  href,
  text,
  onNavigate,
}: {
  readonly level: TreeLevel;
  readonly href: string;
  readonly text: string;
  readonly onNavigate: () => void;
}): JSX.Element {
  return (
    <div className="sidebar-tree-row sidebar-add-row" data-level={level}>
      <span className="sidebar-tree-toggle-spacer" />
      <Link
        href={href}
        className="sidebar-tree-node sidebar-add-node"
        data-add={level}
        onClick={onNavigate}
      >
        <span className="sidebar-add-icon" aria-hidden="true">
          +
        </span>
        <span className="sidebar-node-label">{text}</span>
      </Link>
    </div>
  );
}

/**
 * エクスプローラーのパーツ 1 つ. 式を変えるたびに作業中の変更が変わりエクスプローラー全体を描き直すので,
 * 見た目の変わらない行は描かない (#762)
 */
export const PartNode = memo(function PartNode({
  partId,
  name,
  deleted,
  isChanged,
  typeError,
  isSelected,
  onNavigate,
}: {
  readonly partId: string;
  readonly name: string;
  readonly deleted: boolean;
  readonly isChanged: boolean;
  readonly typeError: string | null;
  readonly isSelected: boolean;
  readonly onNavigate: () => void;
}): JSX.Element {
  return (
    <div className="sidebar-tree-row" data-level="part">
      <span className="sidebar-tree-toggle-spacer" />
      <Link
        href={`/part/${partId}`}
        className={`sidebar-tree-node part-node ${isSelected ? "selected" : ""}`}
        data-deleted={deleted ? "" : undefined}
        aria-current={isSelected ? "page" : undefined}
        onClick={onNavigate}
      >
        <PartsIcon size={15} className="sidebar-node-icon tree-icon-part" />
        <span className="sidebar-node-label">{name}</span>
        {typeError !== null && (
          <span
            className="sidebar-type-error-dot"
            title={typeError}
            aria-label={typeError}
          >
            ●
          </span>
        )}
        {isChanged && (
          <span className="sidebar-dirty-dot" title="Modified">
            ●
          </span>
        )}
      </Link>
    </div>
  );
});

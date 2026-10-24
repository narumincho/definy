import type { JSX } from "react";
import { Link } from "./Link.tsx";
import {
  RedoIcon,
  SearchIcon,
  SidebarIcon,
  TerminalIcon,
  UndoIcon,
} from "../icons.tsx";
import { label, languageNativeName } from "../language.ts";
import { useDefiny } from "../state.tsx";
import type { LanguageCode } from "../types.ts";

export function Header(): JSX.Element {
  const {
    language,
    setLanguage,
    setCommandPaletteOpen,
    currentAccount,
    setAccountModalOpen,
    toggleSidebar,
    pageUndo,
    runPanelOpen,
    toggleRunPanel,
  } = useDefiny();

  const explorerLabel = label(
    language,
    "Toggle Explorer",
    "エクスプローラーの表示切替",
    "Baskuligi esplorilon",
  );

  const paletteLabel = label(
    language,
    "Search parts, modules and pages",
    "パーツ・モジュール・ページを検索",
    "Serĉi partojn, modulojn kaj paĝojn",
  );

  const undoLabel = label(language, "Undo", "元に戻す", "Malfari");
  const redoLabel = label(language, "Redo", "やり直す", "Refari");
  const runPanelLabel = label(
    language,
    "Toggle Run Panel",
    "実行パネルの表示切替",
    "Baskuligi rul-panelon",
  );

  return (
    <header className="app-header">
      {/* 狭い画面ではエクスプローラーがドロワーになるので, それを開くボタンを出す (CSS で狭い画面だけ表示) */}
      <button
        type="button"
        className="titlebar-icon-button sidebar-toggle-btn"
        title={explorerLabel}
        aria-label={explorerLabel}
        onClick={toggleSidebar}
      >
        <SidebarIcon size={17} className="titlebar-icon" />
      </button>

      <Link href="/" className="app-logo">
        <h1 className="logo-text">definy</h1>
      </Link>

      {/* 今のページ (パーツ詳細など) の元に戻す・やり直す. 持たないページでは押せない */}
      <div className="header-undo-redo">
        <button
          type="button"
          className="titlebar-icon-button header-undo"
          disabled={pageUndo === null || !pageUndo.canUndo}
          title={`${undoLabel} (Ctrl+Z)`}
          aria-label={undoLabel}
          onClick={() => {
            pageUndo?.undo();
          }}
        >
          <UndoIcon size={16} className="titlebar-icon" />
        </button>
        <button
          type="button"
          className="titlebar-icon-button header-redo"
          disabled={pageUndo === null || !pageUndo.canRedo}
          title={`${redoLabel} (Ctrl+Shift+Z)`}
          aria-label={redoLabel}
          onClick={() => {
            pageUndo?.redo();
          }}
        >
          <RedoIcon size={16} className="titlebar-icon" />
        </button>
      </div>

      <div className="header-title-container">
        <button
          type="button"
          className="header-title"
          title={`${paletteLabel} (⌘P / Ctrl+P)`}
          aria-label={paletteLabel}
          onClick={() => {
            setCommandPaletteOpen(true);
          }}
        >
          <SearchIcon size={13} className="header-title-icon" />
          <span className="header-title-text">{paletteLabel}</span>
          <kbd className="header-title-kbd">⌘P</kbd>
        </button>
      </div>

      <div className="header-actions">
        <button
          type="button"
          className={`titlebar-icon-button run-panel-toggle ${runPanelOpen ? "active" : ""}`}
          title={`${runPanelLabel} (Ctrl+\`)`}
          aria-label={runPanelLabel}
          aria-pressed={runPanelOpen}
          onClick={toggleRunPanel}
        >
          <TerminalIcon size={17} className="titlebar-icon" />
        </button>

        <div className="language-dropdown-wrapper">
          <select
            className="header-control language-select"
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value as LanguageCode);
            }}
            aria-label="Language"
          >
            <option value="en">{languageNativeName("en")}</option>
            <option value="ja">{languageNativeName("ja")}</option>
            <option value="eo">{languageNativeName("eo")}</option>
          </select>
        </div>

        {currentAccount ? (
          <button
            type="button"
            className="header-control account-badge"
            onClick={() => {
              setAccountModalOpen(true);
            }}
            title={label(
              language,
              "Account details",
              "アカウント情報",
              "Konto-detaloj",
            )}
            style={{
              cursor: "pointer",
              background: "none",
              border: "none",
              padding: 0,
            }}
          >
            <span className="account-avatar">
              {currentAccount.accountName.slice(0, 1).toUpperCase()}
            </span>
            <span className="account-name">{currentAccount.accountName}</span>
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              setAccountModalOpen(true);
            }}
          >
            {label(language, "Log In", "ログイン", "Ensaluti")}
          </button>
        )}
      </div>
    </header>
  );
}

import type { JSX } from "react";
import { Link } from "@void/react";
import { Icon } from "../icons.tsx";
import { label, languageNativeName } from "../language.ts";
import { useDefiny } from "../state.tsx";
import type { LanguageCode } from "../types.ts";

export function Header(): JSX.Element {
  const {
    language,
    setLanguage,
    toggleSidebar,
    setCommandPaletteOpen,
    currentAccount,
  } = useDefiny();

  const toggleLabel = label(
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

  return (
    <header className="app-header">
      <button
        type="button"
        className="titlebar-icon-button"
        title={toggleLabel}
        aria-label={toggleLabel}
        onClick={toggleSidebar}
      >
        <Icon kind="sidebar" className="titlebar-icon" />
      </button>

      <Link href="/" className="app-logo">
        <h1 className="logo-text">definy</h1>
      </Link>

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
          <Icon kind="search" className="header-title-icon" />
          <span className="header-title-text">{paletteLabel}</span>
          <kbd className="header-title-kbd">⌘P</kbd>
        </button>
      </div>

      <div className="header-actions">
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
          <div className="header-control account-badge">
            <span className="account-avatar">
              {currentAccount.accountName.slice(0, 1).toUpperCase()}
            </span>
            <span className="account-name">{currentAccount.accountName}</span>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              // Open login modal
            }}
          >
            {label(language, "Log In", "ログイン", "Ensaluti")}
          </button>
        )}
      </div>
    </header>
  );
}

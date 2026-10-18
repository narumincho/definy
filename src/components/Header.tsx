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
    setAccountModalOpen,
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
        <Icon kind="sidebar" size={17} className="titlebar-icon" />
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
          <Icon kind="search" size={13} className="header-title-icon" />
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

import { Fragment, useEffect, useRef, type JSX } from "react";
import { CloseIcon } from "../icons.tsx";
import { label } from "../language.ts";
import {
  SHORTCUT_GROUPS,
  formatKeyCombo,
  isMacPlatform,
  isShortcutListKey,
} from "../shortcuts.ts";
import { useDefiny } from "../state.tsx";

/**
 * ショートカットキー一覧のダイアログ (docs/key.md「ショートカットキー一覧」).
 * Cmd / Ctrl + / でどこからでも開閉でき, コマンドパレットからも開ける
 */
export function ShortcutList(): JSX.Element | null {
  const {
    language,
    shortcutListOpen,
    setShortcutListOpen,
    setCommandPaletteOpen,
  } = useDefiny();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (isShortcutListKey(e)) {
        e.preventDefault();
        setCommandPaletteOpen(false);
        setShortcutListOpen(!shortcutListOpen);
      } else if (e.key === "Escape" && shortcutListOpen) {
        e.preventDefault();
        setShortcutListOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [shortcutListOpen, setShortcutListOpen, setCommandPaletteOpen]);

  useEffect(() => {
    if (shortcutListOpen) {
      // 裏のツリーエディタにキーが届かないよう, ダイアログの中にフォーカスを移す
      closeButtonRef.current?.focus();
    }
  }, [shortcutListOpen]);

  if (!shortcutListOpen) {
    return null;
  }

  const isMac = isMacPlatform();
  const title = label(
    language,
    "Keyboard Shortcuts",
    "ショートカットキー一覧",
    "Klavkombinoj",
  );

  return (
    <>
      <div
        className="shortcut-list-backdrop"
        onClick={() => {
          setShortcutListOpen(false);
        }}
      />
      <div
        className="shortcut-list"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-list-title"
      >
        <div className="shortcut-list-header">
          <h2 id="shortcut-list-title" className="shortcut-list-title">
            {title}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="titlebar-icon-button shortcut-list-close"
            aria-label={label(language, "Close", "閉じる", "Fermi")}
            onClick={() => {
              setShortcutListOpen(false);
            }}
          >
            <CloseIcon size={15} className="titlebar-icon" />
          </button>
        </div>
        <div className="shortcut-list-body">
          {SHORTCUT_GROUPS.map((group) => (
            <section
              key={group.id}
              className="shortcut-list-group"
              data-shortcut-group={group.id}
            >
              <h3 className="shortcut-list-group-title">
                {group.title(language)}
              </h3>
              <dl className="shortcut-list-items">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.id}
                    className="shortcut-list-item"
                    data-shortcut={shortcut.id}
                  >
                    <dt className="shortcut-list-keys">
                      {shortcut.keys.map((combo, comboIndex) => (
                        <Fragment key={comboIndex}>
                          {comboIndex > 0 && (
                            <span className="shortcut-list-or">/</span>
                          )}
                          <span className="shortcut-list-combo">
                            {formatKeyCombo(combo, isMac).map((key, i) => (
                              <kbd key={i}>{key}</kbd>
                            ))}
                          </span>
                        </Fragment>
                      ))}
                    </dt>
                    <dd className="shortcut-list-description">
                      {shortcut.description(language)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}

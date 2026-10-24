import { useEffect, useState, useRef, type JSX } from "react";
import { useRouter } from "@void/react";
import {
  AboutIcon,
  AccountsIcon,
  ChangesIcon,
  EventsIcon,
  HistoryIcon,
  ModuleIcon,
  PartsIcon,
  SearchIcon,
  SettingsIcon,
  type IconComponent,
} from "../icons.tsx";
import { label, localizedText, withLanguage } from "../language.ts";
import { useDefiny } from "../state.tsx";

export type PaletteItem = {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  readonly href: string;
  readonly icon: IconComponent;
};

const MAX_RESULTS = 60;

/**
 * query に一致する候補のスコアを返す。
 *
 * 0: 名前全体の一致、または最後のセグメント（. の後）の完全一致
 * 1: 先頭一致、または最後のセグメントの先頭一致
 * 2: 区切り文字 (., -, _, 空白, /) 直後からの部分一致
 * 3: 任意位置の部分一致
 * 4: あいまい一致（クエリの全文字が順番に出現）
 */
const SEPARATOR_CHARS: ReadonlySet<string> = new Set([".", "-", "_", " ", "/"]);

export function matchScore(labelStr: string, query: string): number | null {
  const normLabel = labelStr.toLowerCase();
  const normQuery = query.toLowerCase();

  const lastDot = normLabel.lastIndexOf(".");
  const lastSegment = lastDot >= 0 ? normLabel.slice(lastDot + 1) : normLabel;

  if (normLabel === normQuery || lastSegment === normQuery) {
    return 0;
  }
  if (normLabel.startsWith(normQuery) || lastSegment.startsWith(normQuery)) {
    return 1;
  }
  const pos = normLabel.indexOf(normQuery);
  if (pos >= 0) {
    const prevChar = pos > 0 ? normLabel[pos - 1] : "";
    const isAfterSeparator = SEPARATOR_CHARS.has(prevChar ?? "");
    return isAfterSeparator ? 2 : 3;
  }

  let lIdx = 0;
  for (let qIdx = 0; qIdx < normQuery.length; qIdx++) {
    const qChar = normQuery[qIdx];
    let found = false;
    while (lIdx < normLabel.length) {
      if (normLabel[lIdx] === qChar) {
        found = true;
        lIdx++;
        break;
      }
      lIdx++;
    }
    if (!found) {
      return null;
    }
  }
  return 4;
}

/**
 * 候補一覧をスコア順・文字長順・元の順位順に並べ替えて返す
 */
export function rankItems(
  items: ReadonlyArray<PaletteItem>,
  query: string,
  maxResults = MAX_RESULTS,
): ReadonlyArray<PaletteItem> {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return items.slice(0, maxResults);
  }

  const scored: ReadonlyArray<{
    readonly score: number;
    readonly length: number;
    readonly index: number;
    readonly item: PaletteItem;
  }> = items.flatMap((item, index) => {
    const score = matchScore(item.label, trimmed);
    return score !== null
      ? [{ score, length: item.label.length, index, item }]
      : [];
  });

  const sorted = [...scored].sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    if (a.length !== b.length) return a.length - b.length;
    return a.index - b.index;
  });

  return sorted.slice(0, maxResults).map((s) => s.item);
}

export function CommandPalette(): JSX.Element | null {
  const {
    language,
    parts,
    modules,
    commandPaletteOpen,
    setCommandPaletteOpen,
  } = useDefiny();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd/Ctrl+P と Cmd/Ctrl+K でどこからでも開閉できるようにする
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      const key = e.key.toLowerCase();
      if (
        (e.metaKey || e.ctrlKey) &&
        !e.altKey &&
        !e.shiftKey &&
        (key === "p" || key === "k")
      ) {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      } else if (e.key === "Escape" && commandPaletteOpen) {
        e.preventDefault();
        setCommandPaletteOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery("");
      setSelectedIndex(0);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [commandPaletteOpen]);

  const pageDetail = label(language, "Page", "ページ", "Paĝo");
  const moduleDetail = label(language, "Module", "モジュール", "Modulo");

  const items: ReadonlyArray<PaletteItem> = [
    {
      id: "page-events",
      label: label(language, "Events", "イベント一覧", "Eventoj"),
      detail: pageDetail,
      href: "/",
      icon: EventsIcon,
    },
    {
      id: "page-parts",
      label: label(language, "Parts", "パーツ一覧", "Partoj"),
      detail: pageDetail,
      href: "/parts",
      icon: PartsIcon,
    },
    {
      id: "page-modules",
      label: label(language, "Modules", "モジュール一覧", "Moduloj"),
      detail: pageDetail,
      href: "/modules",
      icon: ModuleIcon,
    },
    {
      id: "page-changes",
      label: label(language, "Changes", "変更", "Ŝanĝoj"),
      detail: pageDetail,
      href: "/changes",
      icon: ChangesIcon,
    },
    {
      id: "page-history",
      label: label(language, "History", "履歴", "Historio"),
      detail: pageDetail,
      href: "/history",
      icon: HistoryIcon,
    },
    {
      id: "page-accounts",
      label: label(language, "Accounts", "アカウント一覧", "Kontoj"),
      detail: pageDetail,
      href: "/accounts",
      icon: AccountsIcon,
    },
    {
      id: "page-about",
      label: label(language, "About definy", "definy について", "Pri definy"),
      detail: pageDetail,
      href: "/about",
      icon: AboutIcon,
    },
    {
      id: "page-settings",
      label: label(language, "Settings", "設定", "Agordoj"),
      detail: pageDetail,
      href: "/settings",
      icon: SettingsIcon,
    },
    ...modules.map((m) => ({
      id: `module-${m.moduleId}`,
      label: m.name,
      detail: moduleDetail,
      href: `/module/${m.moduleId}`,
      icon: ModuleIcon,
    })),
    ...parts.map((p) => ({
      id: `part-${p.partId}`,
      label: `${p.moduleName}.${p.name}`,
      detail: localizedText(p.description, language).slice(0, 36) || "Part",
      href: `/part/${p.partId}`,
      icon: ModuleIcon,
    })),
  ];

  const ranked = rankItems(items, query);

  function scrollItemIntoView(idx: number): void {
    const el = document.getElementById(`command-palette-item-${idx}`);
    el?.scrollIntoView({ block: "nearest" });
  }

  function handleSelect(item: PaletteItem): void {
    setCommandPaletteOpen(false);
    router.visit(withLanguage(item.href, language));
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    const count = ranked.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (count > 0) {
        const next = (selectedIndex + 1) % count;
        setSelectedIndex(next);
        scrollItemIntoView(next);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (count > 0) {
        const prev = (selectedIndex + count - 1) % count;
        setSelectedIndex(prev);
        scrollItemIntoView(prev);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      const current = ranked[selectedIndex];
      if (current) {
        handleSelect(current);
      }
    }
  }

  if (!commandPaletteOpen) {
    return null;
  }

  const placeholder = label(
    language,
    "Search parts, modules and pages... (↑↓ to navigate, Enter to open)",
    "パーツ・モジュール・ページを検索... (↑↓ で選択、Enter で移動)",
    "Serĉi partojn, modulojn kaj paĝojn...",
  );

  return (
    <>
      <div
        className="command-palette-backdrop"
        onClick={() => {
          setCommandPaletteOpen(false);
        }}
      />
      <div
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label={placeholder}
      >
        <div className="command-palette-input">
          <SearchIcon size={14} className="command-palette-search-icon" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-results"
            aria-activedescendant={`command-palette-item-${selectedIndex}`}
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
          />
        </div>

        <div
          id="command-palette-results"
          className="command-palette-results"
          role="listbox"
        >
          {ranked.length === 0 ? (
            <div className="command-palette-empty">
              {label(
                language,
                "No results",
                "見つかりません",
                "Neniuj rezultoj",
              )}
            </div>
          ) : (
            ranked.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <a
                  key={item.href}
                  id={`command-palette-item-${idx}`}
                  className="command-palette-item"
                  role="option"
                  aria-selected={isSelected ? "true" : "false"}
                  href={withLanguage(item.href, language)}
                  style={{ textDecoration: "none", cursor: "pointer" }}
                  onClick={(e) => {
                    e.preventDefault();
                    handleSelect(item);
                  }}
                  onMouseEnter={() => {
                    setSelectedIndex(idx);
                  }}
                >
                  <item.icon size={15} className="command-palette-item-icon" />
                  <span className="command-palette-item-label">
                    {item.label}
                  </span>
                  <span className="command-palette-item-detail">
                    {item.detail}
                  </span>
                </a>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

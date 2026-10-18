import { useEffect, useState, useRef, type JSX } from "react";
import { useRouter } from "@void/react";
import { Icon } from "../icons.tsx";
import { label } from "../language.ts";
import { useDefiny } from "../state.tsx";

interface PaletteItem {
  readonly id: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly path: string;
  readonly icon: "part" | "modules" | "events" | "deploy" | "settings";
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

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if ((e.metaKey || e.ctrlKey) && e.key === "p") {
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
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [commandPaletteOpen]);

  const items: ReadonlyArray<PaletteItem> = [
    {
      id: "nav-events",
      title: label(language, "Events", "イベント", "Eventoj"),
      path: "/",
      icon: "events",
    },
    {
      id: "nav-parts",
      title: label(language, "Parts", "パーツ", "Partoj"),
      path: "/parts",
      icon: "part",
    },
    {
      id: "nav-modules",
      title: label(language, "Modules", "モジュール", "Moduloj"),
      path: "/modules",
      icon: "modules",
    },
    {
      id: "nav-deploy",
      title: label(
        language,
        "Deploy to Cloudflare",
        "Cloudflare にデプロイ",
        "Deploji al Cloudflare",
      ),
      path: "/deployments",
      icon: "deploy",
    },
    {
      id: "nav-settings",
      title: label(language, "Settings", "設定", "Agordoj"),
      path: "/settings",
      icon: "settings",
    },
    ...modules.map((m) => ({
      id: `module-${m.moduleId}`,
      title: m.name,
      subtitle: label(language, "Module", "モジュール", "Modulo"),
      path: `/module/${m.moduleId}`,
      icon: "modules" as const,
    })),
    ...parts.map((p) => ({
      id: `part-${p.partId}`,
      title: `${p.moduleName}.${p.name}`,
      subtitle: label(language, "Part", "パーツ", "Parto"),
      path: `/part/${p.partId}`,
      icon: "part" as const,
    })),
  ];

  const q = query.trim().toLowerCase();
  const filtered = q
    ? items.filter(
        (it) =>
          it.title.toLowerCase().includes(q) ||
          it.subtitle?.toLowerCase().includes(q),
      )
    : items;

  function handleSelect(item: PaletteItem): void {
    setCommandPaletteOpen(false);
    router.visit(item.path);
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev <= 0 ? Math.max(0, filtered.length - 1) : prev - 1,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const current = filtered[selectedIndex];
      if (current) {
        handleSelect(current);
      }
    }
  }

  if (!commandPaletteOpen) {
    return null;
  }

  return (
    <div
      className="command-palette-backdrop"
      onClick={() => {
        setCommandPaletteOpen(false);
      }}
    >
      <div
        className="command-palette-dialog"
        onClick={(e) => {
          e.stopPropagation();
        }}
        role="dialog"
        aria-modal="true"
      >
        <div className="command-palette-input-wrapper">
          <Icon
            kind="search"
            size={16}
            className="command-palette-search-icon"
          />
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder={label(
              language,
              "Search parts, modules and pages...",
              "パーツ・モジュール・ページを検索...",
              "Serĉi partojn, modulojn kaj paĝojn...",
            )}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
          />
        </div>

        <div className="command-palette-list">
          {filtered.length === 0 ? (
            <div className="command-palette-empty">
              {label(
                language,
                "No matches found",
                "一致する項目がありません",
                "Neniuj kongruoj trovitaj",
              )}
            </div>
          ) : (
            filtered.slice(0, 30).map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`command-palette-item ${isSelected ? "selected" : ""}`}
                  onClick={() => {
                    handleSelect(item);
                  }}
                  onMouseEnter={() => {
                    setSelectedIndex(idx);
                  }}
                >
                  <Icon
                    kind={item.icon}
                    size={15}
                    className="command-palette-item-icon"
                  />
                  <span className="command-palette-item-title">
                    {item.title}
                  </span>
                  {item.subtitle && (
                    <span className="command-palette-item-subtitle">
                      {item.subtitle}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

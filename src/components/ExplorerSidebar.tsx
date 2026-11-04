import { useRef, useState, type JSX } from "react";
import { label } from "../language.ts";
import { useDefiny } from "../state.tsx";
import { AccountList, EventList } from "./SidebarLists.tsx";
import { ExplorerProjectTree } from "./explorer/ExplorerProjectTree.tsx";
import { SidebarResizer } from "./explorer/SidebarResizer.tsx";
import { useExplorerProjectTree } from "./explorer/useExplorerProjectTree.ts";

/**
 * サイドバー. アクティビティバーで選んだ欄 (プロジェクトの木・イベント・アカウント) と, 幅を変える境界を出す
 * (docs/ui.md「サイドバーの欄」)
 */
export function ExplorerSidebar(): JSX.Element {
  const { language, sidebarView: view } = useDefiny();
  const [filterQuery, setFilterQuery] = useState("");
  const asideRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // 開閉の状態は欄を切り替えても残すので, 木を出していないときも持っておく
  const { tree, controls } = useExplorerProjectTree({ filterQuery, scrollRef });
  const { closeSidebar } = controls;

  return (
    <aside className="workbench-sidebar" ref={asideRef}>
      <div className="sidebar-filter-container" data-view={view}>
        {/* 絞り込みはプロジェクトの木だけ */}
        {view === "projects" && (
          <input
            type="search"
            className="sidebar-filter-input"
            placeholder={label(
              language,
              "Filter...",
              "絞り込み...",
              "Filtri...",
            )}
            value={filterQuery}
            onChange={(e) => {
              setFilterQuery(e.target.value);
            }}
          />
        )}
        {/* 狭い画面のドロワーを閉じる (CSS で狭い画面だけ表示) */}
        <button
          type="button"
          className="sidebar-action-btn sidebar-close-btn"
          title={label(language, "Close", "閉じる", "Fermi")}
          aria-label={label(language, "Close", "閉じる", "Fermi")}
          onClick={closeSidebar}
        >
          ×
        </button>
      </div>

      <div className="sidebar-scroll" ref={scrollRef}>
        {view === "events" && <EventList onNavigate={closeSidebar} />}
        {view === "accounts" && <AccountList onNavigate={closeSidebar} />}
        {view === "projects" && (
          <ExplorerProjectTree tree={tree} c={controls} />
        )}
      </div>

      <SidebarResizer asideRef={asideRef} language={language} />
    </aside>
  );
}

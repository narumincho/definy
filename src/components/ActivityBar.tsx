import type { JSX } from "react";
import { Link } from "./Link.tsx";
import {
  AccountsIcon,
  EventsIcon,
  ProjectIcon,
  SettingsIcon,
  type IconComponent,
} from "../icons.tsx";
import type { SidebarView } from "../sidebar_view.ts";
import { label } from "../language.ts";
import { useDefiny } from "../state.tsx";

type ActivityTarget = {
  /** 選んだときにサイドバーに出す欄 (src/sidebar_view.ts) */
  readonly view: SidebarView;
  readonly path: string;
  readonly icon: IconComponent;
  readonly en: string;
  readonly ja: string;
  readonly eo: string;
};

const PRIMARY_TARGETS: ReadonlyArray<ActivityTarget> = [
  {
    view: "events",
    path: "/",
    icon: EventsIcon,
    en: "Events",
    ja: "イベント",
    eo: "Eventoj",
  },
  {
    view: "projects",
    path: "/modules",
    icon: ProjectIcon,
    en: "Projects",
    ja: "プロジェクト",
    eo: "Projektoj",
  },
  {
    view: "accounts",
    path: "/accounts",
    icon: AccountsIcon,
    en: "Accounts",
    ja: "アカウント一覧",
    eo: "Kontoj",
  },
];

export function ActivityBar(): JSX.Element {
  const { language, workingChanges, sidebarView: currentView } = useDefiny();
  const changesCount =
    workingChanges.parts.size + (workingChanges.moduleVisibilities?.size ?? 0);

  return (
    <nav
      className="activity-bar"
      aria-label={label(
        language,
        "Main navigation",
        "メインナビゲーション",
        "Ĉefa navigado",
      )}
    >
      {PRIMARY_TARGETS.map((target) => {
        const isActive = currentView === target.view;
        // 作業中の変更はプロジェクトのパーツに重ねているので, 件数はプロジェクトに出す
        const itemLabel = label(language, target.en, target.ja, target.eo);
        const badge = target.view === "projects" ? changesCount : 0;

        return (
          <Link
            key={target.path}
            href={target.path}
            className={`activity-item ${isActive ? "active" : ""}`}
            title={itemLabel}
            aria-current={isActive ? "page" : "false"}
          >
            <target.icon size={22} className="activity-icon" />
            <span className="activity-label">{itemLabel}</span>
            {badge > 0 && <span className="activity-badge">{badge}</span>}
          </Link>
        );
      })}

      <div className="activity-bar-spacer" />

      <Link
        href="/settings"
        // About は設定の中から開く
        className={`activity-item ${currentView === "settings" ? "active" : ""}`}
        title={label(language, "Settings", "設定", "Agordoj")}
      >
        <SettingsIcon size={22} className="activity-icon" />
        <span className="activity-label">
          {label(language, "Settings", "設定", "Agordoj")}
        </span>
      </Link>
    </nav>
  );
}

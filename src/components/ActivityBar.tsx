import type { JSX } from "react";
import { useRouter } from "@void/react";
import { Link } from "./Link.tsx";
import {
  AccountsIcon,
  EventsIcon,
  HistoryIcon,
  ModuleIcon,
  PartsIcon,
  SettingsIcon,
  type IconComponent,
} from "../icons.tsx";
import { label } from "../language.ts";
import { useDefiny } from "../state.tsx";

type ActivityTarget = {
  readonly path: string;
  readonly icon: IconComponent;
  readonly en: string;
  readonly ja: string;
  readonly eo: string;
};

const PRIMARY_TARGETS: ReadonlyArray<ActivityTarget> = [
  {
    path: "/",
    icon: EventsIcon,
    en: "Events",
    ja: "イベント",
    eo: "Eventoj",
  },
  {
    path: "/parts",
    icon: PartsIcon,
    en: "Parts",
    ja: "パーツ",
    eo: "Partoj",
  },
  {
    path: "/modules",
    icon: ModuleIcon,
    en: "Modules",
    ja: "モジュール",
    eo: "Moduloj",
  },
  {
    path: "/history",
    icon: HistoryIcon,
    en: "History",
    ja: "履歴",
    eo: "Historio",
  },
  {
    path: "/accounts",
    icon: AccountsIcon,
    en: "Accounts",
    ja: "アカウント",
    eo: "Kontoj",
  },
];

export function ActivityBar(): JSX.Element {
  const { language, workingChanges } = useDefiny();
  // window.location は SSR で読めずハイドレーション不一致になるため Void Router から取る
  const currentPath = useRouter().path;
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
        const isActive =
          target.path === "/"
            ? currentPath === "/" || currentPath.startsWith("/event/")
            : currentPath.startsWith(target.path);
        // 作業中の変更はパーツ一覧の「変更のみ表示」で見るので, 件数はパーツに出す
        const itemLabel = label(language, target.en, target.ja, target.eo);
        const badge = target.path === "/parts" ? changesCount : 0;

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
        className={`activity-item ${currentPath.startsWith("/settings") || currentPath.startsWith("/about") ? "active" : ""}`}
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

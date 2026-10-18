import type { JSX } from "react";
import { Link, useRouter } from "@void/react";
import { Icon, type IconKind } from "../icons.tsx";
import { label } from "../language.ts";
import { useDefiny } from "../state.tsx";

interface ActivityTarget {
  readonly path: string;
  readonly icon: IconKind;
  readonly en: string;
  readonly ja: string;
  readonly eo: string;
}

const PRIMARY_TARGETS: ReadonlyArray<ActivityTarget> = [
  {
    path: "/",
    icon: "events",
    en: "Events",
    ja: "イベント",
    eo: "Eventoj",
  },
  {
    path: "/parts",
    icon: "parts",
    en: "Parts",
    ja: "パーツ",
    eo: "Partoj",
  },
  {
    path: "/modules",
    icon: "modules",
    en: "Modules",
    ja: "モジュール",
    eo: "Moduloj",
  },
  {
    path: "/changes",
    icon: "changes",
    en: "Changes",
    ja: "変更",
    eo: "Ŝanĝoj",
  },
  {
    path: "/history",
    icon: "history",
    en: "History",
    ja: "履歴",
    eo: "Historio",
  },
  {
    path: "/accounts",
    icon: "accounts",
    en: "Accounts",
    ja: "アカウント",
    eo: "Kontoj",
  },
  {
    path: "/deployments",
    icon: "deploy",
    en: "Deploy",
    ja: "デプロイ",
    eo: "Deplojo",
  },
];

export function ActivityBar(): JSX.Element {
  const { language, workingChanges } = useDefiny();
  // window.location は SSR で読めずハイドレーション不一致になるため Void Router から取る
  const currentPath = useRouter().path;
  const changesCount = workingChanges.parts.size;

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
        const itemLabel = label(language, target.en, target.ja, target.eo);
        const badge = target.path === "/changes" ? changesCount : 0;

        return (
          <Link
            key={target.path}
            href={target.path}
            className={`activity-item ${isActive ? "active" : ""}`}
            title={itemLabel}
            aria-current={isActive ? "page" : "false"}
          >
            <Icon kind={target.icon} size={22} className="activity-icon" />
            <span className="activity-label">{itemLabel}</span>
            {badge > 0 && <span className="activity-badge">{badge}</span>}
          </Link>
        );
      })}

      <div className="activity-bar-spacer" />

      <Link
        href="/about"
        className={`activity-item ${currentPath.startsWith("/about") ? "active" : ""}`}
        title={label(language, "About", "About", "Pri")}
      >
        <Icon kind="about" size={22} className="activity-icon" />
        <span className="activity-label">
          {label(language, "About", "About", "Pri")}
        </span>
      </Link>

      <Link
        href="/settings"
        className={`activity-item ${currentPath.startsWith("/settings") ? "active" : ""}`}
        title={label(language, "Settings", "設定", "Agordoj")}
      >
        <Icon kind="settings" size={22} className="activity-icon" />
        <span className="activity-label">
          {label(language, "Settings", "設定", "Agordoj")}
        </span>
      </Link>
    </nav>
  );
}

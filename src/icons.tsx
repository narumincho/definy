import type { JSX, ReactNode } from "react";

export type IconProps = {
  readonly className?: string;
  readonly size?: number;
};

/** 一覧のデータに持たせて描画するアイコンのコンポーネント */
export type IconComponent = (props: IconProps) => JSX.Element;

/** 線で描くアイコンの共通の外枠 */
function StrokeIcon({
  className = "btn-icon",
  size = 16,
  strokeWidth = 1.7,
  children,
}: IconProps & {
  readonly strokeWidth?: number;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function SearchIcon(props: IconProps): JSX.Element {
  return (
    <StrokeIcon {...props} strokeWidth={2.2}>
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" />
    </StrokeIcon>
  );
}

export function PlayIcon({
  className = "btn-icon",
  size = 16,
}: IconProps): JSX.Element {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" />
    </svg>
  );
}

export function EventsIcon(props: IconProps): JSX.Element {
  return (
    <StrokeIcon {...props}>
      <path d="M3 12h4l3-8 4 16 3-8h4" />
    </StrokeIcon>
  );
}

export function PartsIcon(props: IconProps): JSX.Element {
  return (
    <StrokeIcon {...props}>
      <path d="M8 3H7a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1" />
      <path d="M16 3h1a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-1" />
    </StrokeIcon>
  );
}

/** モジュールと個々のパーツの両方に使う箱のアイコン */
export function ModuleIcon(props: IconProps): JSX.Element {
  return (
    <StrokeIcon {...props}>
      <path d="M21 8l-9-5-9 5v8l9 5 9-5z" />
      <path d="M3 8l9 5 9-5" />
      <path d="M12 13v8" />
    </StrokeIcon>
  );
}

export function AccountsIcon(props: IconProps): JSX.Element {
  return (
    <StrokeIcon {...props}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
      <path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5" />
    </StrokeIcon>
  );
}

export function DeployIcon(props: IconProps): JSX.Element {
  return (
    <StrokeIcon {...props}>
      <path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9a4 4 0 0 1 .5 7.97" />
      <path d="M12 21v-8" />
      <path d="M9 15.5l3-3 3 3" />
    </StrokeIcon>
  );
}

export function AboutIcon(props: IconProps): JSX.Element {
  return (
    <StrokeIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6" />
      <path d="M12 7.5v.01" />
    </StrokeIcon>
  );
}

export function SettingsIcon(props: IconProps): JSX.Element {
  return (
    <StrokeIcon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </StrokeIcon>
  );
}

export function ChangesIcon(props: IconProps): JSX.Element {
  return (
    <StrokeIcon {...props}>
      <circle cx="6" cy="5" r="2" />
      <circle cx="6" cy="19" r="2" />
      <circle cx="18" cy="7" r="2" />
      <path d="M6 7v10" />
      <path d="M18 9a6 6 0 0 1-6 6H6" />
    </StrokeIcon>
  );
}

export function HistoryIcon(props: IconProps): JSX.Element {
  return (
    <StrokeIcon {...props}>
      <circle cx="7" cy="6" r="2" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="12" r="2" />
      <path d="M7 8v8" />
      <path d="M7 8c0 4 10 0 10 2" />
    </StrokeIcon>
  );
}

export function ChevronRightIcon(props: IconProps): JSX.Element {
  return (
    <StrokeIcon {...props}>
      <path d="M9 6l6 6-6 6" />
    </StrokeIcon>
  );
}

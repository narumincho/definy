import {
  useCallback,
  useEffect,
  useState,
  type JSX,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { label } from "../../language.ts";
import type { LanguageCode } from "../../types.ts";

const SIDEBAR_WIDTH_STORAGE_KEY = "definy.sidebar.width";
const MIN_SIDEBAR_WIDTH = 160;
const MAX_SIDEBAR_WIDTH = 600;
/** 矢印キーで幅を変えるときの 1 回分 */
const SIDEBAR_WIDTH_KEY_STEP = 16;

function clampSidebarWidth(width: number): number {
  return Math.round(
    Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, width)),
  );
}

function loadSidebarWidth(): number | null {
  try {
    const stored = Number(localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY));
    return stored > 0 ? clampSidebarWidth(stored) : null;
  } catch {
    return null;
  }
}

function saveSidebarWidth(width: number | null): void {
  try {
    if (width === null) {
      localStorage.removeItem(SIDEBAR_WIDTH_STORAGE_KEY);
    } else {
      localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(width));
    }
  } catch {
    // 保存できなくても今の表示の幅はそのまま使う
  }
}

/**
 * エクスプローラーの幅を変える境界. ワークベンチのグリッドの列 (`--sidebar-width`) をワークベンチの要素
 * (`asideRef` の親) に直接書き換える. ドラッグ中に React の state を変えると大きなツリーを毎回描画し直すので,
 * 確定したときだけ state にする. `null` は CSS の既定の幅 (画面の幅で変わる).
 * 初回レンダーは SSR と揃え, 保存値はマウント後に反映する
 */
export function SidebarResizer({
  asideRef,
  language,
}: {
  readonly asideRef: RefObject<HTMLElement | null>;
  readonly language: LanguageCode;
}): JSX.Element {
  const [sidebarWidth, setSidebarWidth] = useState<number | null>(null);
  const applySidebarWidth = useCallback(
    (width: number | null) => {
      const workbench = asideRef.current?.parentElement;
      if (width === null) {
        workbench?.style.removeProperty("--sidebar-width");
      } else {
        workbench?.style.setProperty("--sidebar-width", `${width}px`);
      }
    },
    [asideRef],
  );
  const commitSidebarWidth = useCallback(
    (width: number | null) => {
      applySidebarWidth(width);
      setSidebarWidth(width);
      saveSidebarWidth(width);
    },
    [applySidebarWidth],
  );
  useEffect(() => {
    const stored = loadSidebarWidth();
    applySidebarWidth(stored);
    setSidebarWidth(stored);
  }, [applySidebarWidth]);
  const currentSidebarWidth = (): number =>
    asideRef.current?.getBoundingClientRect().width ?? MIN_SIDEBAR_WIDTH;

  /** 境界をドラッグして幅を変える. ポインターをキャプチャして, 境界から外れても追いかける */
  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>): void {
    if (e.button !== 0) return;
    e.preventDefault();
    const handle = e.currentTarget;
    const pointerId = e.pointerId;
    const startX = e.clientX;
    const startWidth = currentSidebarWidth();
    let width = clampSidebarWidth(startWidth);
    handle.setPointerCapture(pointerId);
    document.body.classList.add("sidebar-resizing");

    function onPointerMove(moveEvent: PointerEvent): void {
      width = clampSidebarWidth(startWidth + moveEvent.clientX - startX);
      applySidebarWidth(width);
    }
    function onPointerEnd(): void {
      handle.removeEventListener("pointermove", onPointerMove);
      handle.removeEventListener("pointerup", onPointerEnd);
      handle.removeEventListener("pointercancel", onPointerEnd);
      document.body.classList.remove("sidebar-resizing");
      if (handle.hasPointerCapture(pointerId)) {
        handle.releasePointerCapture(pointerId);
      }
      commitSidebarWidth(width);
    }
    handle.addEventListener("pointermove", onPointerMove);
    handle.addEventListener("pointerup", onPointerEnd);
    handle.addEventListener("pointercancel", onPointerEnd);
  }

  /** 矢印キーで幅を変え, Home / ダブルクリックで既定の幅に戻す */
  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>): void {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const delta =
        e.key === "ArrowLeft"
          ? -SIDEBAR_WIDTH_KEY_STEP
          : SIDEBAR_WIDTH_KEY_STEP;
      commitSidebarWidth(clampSidebarWidth(currentSidebarWidth() + delta));
    } else if (e.key === "Home") {
      e.preventDefault();
      commitSidebarWidth(null);
    }
  }

  return (
    <div
      className="sidebar-resizer"
      role="separator"
      aria-orientation="vertical"
      aria-label={label(
        language,
        "Resize Explorer (double-click to reset)",
        "エクスプローラーの幅を変える (ダブルクリックで元に戻す)",
        "Ŝanĝi la larĝon de la esplorilo (duoble alklaku por restarigi)",
      )}
      aria-valuemin={MIN_SIDEBAR_WIDTH}
      aria-valuemax={MAX_SIDEBAR_WIDTH}
      {...(sidebarWidth !== null ? { "aria-valuenow": sidebarWidth } : {})}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      onDoubleClick={() => {
        commitSidebarWidth(null);
      }}
    />
  );
}

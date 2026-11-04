import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type JSX,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { label } from "../language.ts";
import type { LanguageCode } from "../types.ts";
import { StoryAudio, type SoundEffect } from "./audio.ts";
import { SLIDES, slideTitle } from "./slides.tsx";
import { buildTimeline, entryIndexAt, formatTime } from "./timeline.ts";
import "./story.css";

const TIMELINE = buildTimeline(SLIDES);

const PREFERENCE_KEY = "definy-story-sound";

/** J / L で動かす秒数 */
const SKIP_SECONDS = 5;

type SoundPreference = { readonly effects: boolean; readonly bgm: boolean };

function readPreference(): SoundPreference {
  try {
    const raw = localStorage.getItem(PREFERENCE_KEY);
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null) {
        const record = parsed as Record<string, unknown>;
        return {
          effects: record["effects"] !== false,
          bgm: record["bgm"] === true,
        };
      }
    }
  } catch {
    // 保存できない環境では既定値を使う
  }
  return { effects: true, bgm: false };
}

function writePreference(preference: SoundPreference): void {
  try {
    localStorage.setItem(PREFERENCE_KEY, JSON.stringify(preference));
  } catch {
    // 保存できない環境では覚えない
  }
}

function clampTime(time: number): number {
  return Math.min(TIMELINE.total, Math.max(0, time));
}

function ControlButton(props: {
  readonly onClick: () => void;
  readonly title: string;
  readonly active?: boolean;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <button
      type="button"
      className={`story-control ${props.active === true ? "is-active" : ""}`}
      onClick={props.onClick}
      title={props.title}
      aria-label={props.title}
      aria-pressed={props.active}
    >
      {props.children}
    </button>
  );
}

/** 再生位置が動くたびに描き直さないよう, スライドとステップが変わったときだけ描く */
const SlideView = memo(function SlideView(props: {
  readonly slide: number;
  readonly step: number;
  readonly lang: LanguageCode;
}): JSX.Element | null {
  const slide = SLIDES[props.slide];
  if (slide === undefined) {
    return null;
  }
  const Render = slide.render;
  return (
    <div key={slide.id} className="story-slide">
      <Render step={props.step} lang={props.lang} />
    </div>
  );
});

/** YouTube のようなシークバー. スライドごとに区切り, ドラッグでどこからでも再生できる */
function SeekBar(props: {
  readonly time: number;
  readonly lang: LanguageCode;
  readonly onSeek: (time: number) => void;
}): JSX.Element {
  const { time, lang, onSeek } = props;
  const trackRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | undefined>(undefined);

  const timeAt = (clientX: number): number => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (rect === undefined || rect.width === 0) {
      return 0;
    }
    return clampTime(((clientX - rect.left) / rect.width) * TIMELINE.total);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    event.currentTarget.setPointerCapture(event.pointerId);
    onSeek(timeAt(event.clientX));
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const t = timeAt(event.clientX);
    setHover(t);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      onSeek(t);
    }
  };

  const hoverSlide =
    hover === undefined
      ? undefined
      : SLIDES[TIMELINE.entries[entryIndexAt(TIMELINE, hover)]?.slide ?? 0];

  return (
    <div
      ref={trackRef}
      className="story-seek"
      role="slider"
      tabIndex={-1}
      aria-label={label(lang, "Seek", "再生位置", "Pozicio")}
      aria-valuemin={0}
      aria-valuemax={Math.round(TIMELINE.total)}
      aria-valuenow={Math.round(time)}
      aria-valuetext={formatTime(time)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerLeave={() => setHover(undefined)}
    >
      {SLIDES.map((slide, index) => {
        const start = TIMELINE.slideStarts[index] ?? 0;
        const played = Math.min(
          1,
          Math.max(0, (time - start) / slide.duration),
        );
        const hovered =
          hover !== undefined &&
          hover >= start &&
          hover < start + slide.duration;
        return (
          <div
            key={slide.id}
            className={`story-seek-chapter ${hovered ? "is-hovered" : ""}`}
            style={{ flexGrow: slide.duration }}
          >
            <div
              className="story-seek-played"
              style={{ transform: `scaleX(${played})` }}
            />
          </div>
        );
      })}
      <div
        className="story-seek-thumb"
        style={{ left: `${(time / TIMELINE.total) * 100}%` }}
      />
      {hover !== undefined && hoverSlide !== undefined ? (
        <div
          className="story-seek-tooltip"
          style={{ left: `${(hover / TIMELINE.total) * 100}%` }}
        >
          <div>{slideTitle(hoverSlide, lang)}</div>
          <div className="story-seek-tooltip-time">{formatTime(hover)}</div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * 紹介スライドの再生. 動画のように再生位置 (秒) を持ち, 既定は止まった状態で手で送る.
 * キー: → / PageDown / Enter 次へ, ← / PageUp 戻る, Space / K 再生と一時停止,
 * J / L 5 秒戻る・進む, S 効果音, B BGM, F 全画面
 */
export function StoryPlayer(props: {
  readonly lang: LanguageCode;
}): JSX.Element {
  const { lang } = props;
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [sound, setSound] = useState<SoundPreference>({
    effects: true,
    bgm: false,
  });
  const [fullscreen, setFullscreen] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<StoryAudio | null>(null);
  const soundRef = useRef(sound);
  const timeRef = useRef(time);
  const shownEntryRef = useRef(0);

  useEffect(() => {
    const preference = readPreference();
    soundRef.current = preference;
    setSound(preference);
    const audio = new StoryAudio();
    audioRef.current = audio;
    const onFullscreenChange = (): void => {
      setFullscreen(document.fullscreenElement === frameRef.current);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      audio.dispose();
      audioRef.current = null;
    };
  }, []);

  /** 利用者の操作のたびに呼ぶ. 音を出せるようにし, BGM の設定を反映する */
  const wake = useCallback((): void => {
    const audio = audioRef.current;
    if (audio === null) {
      return;
    }
    audio.resume();
    audio.setBgm(soundRef.current.bgm);
  }, []);

  const playEffect = useCallback((effect: SoundEffect): void => {
    if (soundRef.current.effects) {
      audioRef.current?.playEffect(effect);
    }
  }, []);

  const updateTime = useCallback((next: number): void => {
    const clamped = clampTime(next);
    timeRef.current = clamped;
    setTime(clamped);
  }, []);

  const seek = useCallback(
    (next: number): void => {
      wake();
      updateTime(next);
    },
    [updateTime, wake],
  );

  const entryIndex = entryIndexAt(TIMELINE, time);
  const entry = TIMELINE.entries[entryIndex];

  // 表示するステップが変わったら効果音を鳴らす
  useEffect(() => {
    const previous = TIMELINE.entries[shownEntryRef.current];
    const current = TIMELINE.entries[entryIndex];
    shownEntryRef.current = entryIndex;
    if (previous === undefined || current === undefined) {
      return;
    }
    if (entryIndex === TIMELINE.entries.length - 1 && previous !== current) {
      playEffect("finish");
    } else if (current.slide > previous.slide) {
      playEffect("next");
    } else if (entryIndex < TIMELINE.entries.indexOf(previous)) {
      playEffect("prev");
    } else if (current !== previous) {
      playEffect("reveal");
    }
  }, [entryIndex, playEffect]);

  const next = useCallback((): void => {
    const following =
      TIMELINE.entries[entryIndexAt(TIMELINE, timeRef.current) + 1];
    if (following !== undefined) {
      seek(following.start);
    }
  }, [seek]);

  const previous = useCallback((): void => {
    const index = entryIndexAt(TIMELINE, timeRef.current);
    seek(TIMELINE.entries[Math.max(0, index - 1)]?.start ?? 0);
  }, [seek]);

  const togglePlay = useCallback((): void => {
    wake();
    if (!playing && timeRef.current >= TIMELINE.total) {
      updateTime(0);
    }
    setPlaying(!playing);
  }, [playing, updateTime, wake]);

  // 再生中は requestAnimationFrame で再生位置を進める
  useEffect(() => {
    if (!playing) {
      return;
    }
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now: number): void {
      const advanced = timeRef.current + (now - last) / 1000;
      last = now;
      if (advanced >= TIMELINE.total) {
        updateTime(TIMELINE.total);
        setPlaying(false);
        return;
      }
      updateTime(advanced);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing, updateTime]);

  const updateSound = useCallback(
    (change: Partial<SoundPreference>): void => {
      const updated = { ...soundRef.current, ...change };
      soundRef.current = updated;
      setSound(updated);
      writePreference(updated);
      wake();
    },
    [wake],
  );

  const toggleFullscreen = useCallback((): void => {
    wake();
    if (document.fullscreenElement !== null) {
      void document.exitFullscreen();
    } else {
      void frameRef.current?.requestFullscreen();
    }
  }, [wake]);

  // キー操作
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target;
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        (target instanceof HTMLElement &&
          (target.isContentEditable ||
            target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.tagName === "SELECT"))
      ) {
        return;
      }
      switch (event.key) {
        case "ArrowRight":
        case "PageDown":
        case "Enter":
          event.preventDefault();
          next();
          return;
        case "ArrowLeft":
        case "PageUp":
          event.preventDefault();
          previous();
          return;
        case " ":
        case "k":
        case "K":
          event.preventDefault();
          togglePlay();
          return;
        case "j":
        case "J":
          seek(timeRef.current - SKIP_SECONDS);
          return;
        case "l":
        case "L":
          seek(timeRef.current + SKIP_SECONDS);
          return;
        case "Home":
          event.preventDefault();
          seek(0);
          return;
        case "s":
        case "S":
          updateSound({ effects: !soundRef.current.effects });
          return;
        case "b":
        case "B":
          updateSound({ bgm: !soundRef.current.bgm });
          return;
        case "f":
        case "F":
          toggleFullscreen();
          return;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [next, previous, seek, togglePlay, toggleFullscreen, updateSound]);

  if (entry === undefined) {
    return <div />;
  }
  const slide = SLIDES[entry.slide];
  const atEnd = time >= TIMELINE.total;

  return (
    <div
      ref={frameRef}
      className={`story-frame ${fullscreen ? "is-fullscreen" : ""}`}
    >
      <div
        className="story-stage"
        onClick={(event) => {
          // 文字を選んでコピーしようとしているときは進めない
          if (
            (window.getSelection()?.toString() ?? "") !== "" ||
            (event.target instanceof Element && event.target.closest("a"))
          ) {
            return;
          }
          next();
        }}
        role="region"
        aria-roledescription={label(lang, "slide", "スライド", "lumbildo")}
        aria-label={slide === undefined ? "" : slideTitle(slide, lang)}
      >
        <SlideView slide={entry.slide} step={entry.step} lang={lang} />
        <div className="story-page-number">
          {entry.slide + 1} / {SLIDES.length}
        </div>
      </div>
      <div className="story-controls">
        <SeekBar time={time} lang={lang} onSeek={seek} />
        <div className="story-control-row">
          <ControlButton
            onClick={togglePlay}
            active={playing}
            title={
              playing
                ? label(lang, "Pause (k)", "一時停止 (k)", "Paŭzi (k)")
                : label(lang, "Play (k)", "再生 (k)", "Ludi (k)")
            }
          >
            {playing ? "❚❚" : atEnd ? "↻" : "▶"}
          </ControlButton>
          <ControlButton
            onClick={previous}
            title={label(lang, "Back (←)", "戻る (←)", "Reen (←)")}
          >
            ⏮
          </ControlButton>
          <ControlButton
            onClick={next}
            title={label(lang, "Next (→)", "次へ (→)", "Antaŭen (→)")}
          >
            ⏭
          </ControlButton>
          <div className="story-time">
            <span>{formatTime(time)}</span>
            <span className="story-time-total">
              {" / "}
              {formatTime(TIMELINE.total)}
            </span>
            {slide === undefined ? null : (
              <span className="story-time-chapter">
                {" · "}
                {slideTitle(slide, lang)}
              </span>
            )}
          </div>
          <ControlButton
            onClick={() => updateSound({ effects: !sound.effects })}
            active={sound.effects}
            title={label(
              lang,
              "Sound effects (s)",
              "効果音 (s)",
              "Sonefektoj (s)",
            )}
          >
            {sound.effects ? "🔔" : "🔕"}
          </ControlButton>
          <ControlButton
            onClick={() => updateSound({ bgm: !sound.bgm })}
            active={sound.bgm}
            title={label(lang, "Music (b)", "BGM (b)", "Muziko (b)")}
          >
            🎵
          </ControlButton>
          <ControlButton
            onClick={toggleFullscreen}
            active={fullscreen}
            title={label(
              lang,
              "Full screen (f)",
              "全画面 (f)",
              "Plenekrane (f)",
            )}
          >
            ⛶
          </ControlButton>
        </div>
      </div>
      <div className="story-hint">
        {label(
          lang,
          "Click or → next · ← back · Space play/pause · J/L ±5s · S sound · B music · F full screen",
          "クリックか → で次へ · ← 戻る · Space 再生/一時停止 · J/L 5 秒戻る/進む · S 効果音 · B BGM · F 全画面",
          "Klaku aŭ → · ← reen · Spaceto ludi/paŭzi · J/L ±5s · S sono · B muziko · F plenekrane",
        )}
      </div>
    </div>
  );
}

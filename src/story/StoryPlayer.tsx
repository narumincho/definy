import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type JSX,
  type ReactNode,
} from "react";
import { label } from "../language.ts";
import type { LanguageCode } from "../types.ts";
import { StoryAudio, type SoundEffect } from "./audio.ts";
import { SLIDES, slideTitle } from "./slides.tsx";
import "./story.css";

type Position = { readonly slide: number; readonly step: number };

const PREFERENCE_KEY = "definy-story-sound";

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

function stepsOf(slide: number): number {
  return SLIDES[slide]?.steps ?? 0;
}

function nextPosition(position: Position): Position | undefined {
  if (position.step < stepsOf(position.slide)) {
    return { slide: position.slide, step: position.step + 1 };
  }
  if (position.slide + 1 < SLIDES.length) {
    return { slide: position.slide + 1, step: 0 };
  }
  return undefined;
}

function previousPosition(position: Position): Position | undefined {
  if (position.step > 0) {
    return { slide: position.slide, step: position.step - 1 };
  }
  if (position.slide > 0) {
    return { slide: position.slide - 1, step: stepsOf(position.slide - 1) };
  }
  return undefined;
}

/** 自動再生で 1 ステップに使う秒数 */
function stepSeconds(slide: number): number {
  const s = SLIDES[slide];
  return s === undefined ? 5 : s.duration / (s.steps + 1);
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

/**
 * 紹介スライドの再生. 既定は手で送る. 自動再生・効果音・BGM・全画面を切り替えられる.
 * キー: → / Space / Enter 次へ, ← 戻る, A 自動再生, S 効果音, B BGM, F 全画面
 */
export function StoryPlayer(props: {
  readonly lang: LanguageCode;
}): JSX.Element {
  const { lang } = props;
  const [position, setPosition] = useState<Position>({ slide: 0, step: 0 });
  const [auto, setAuto] = useState(false);
  const [sound, setSound] = useState<SoundPreference>({
    effects: true,
    bgm: false,
  });
  const [fullscreen, setFullscreen] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<StoryAudio | null>(null);
  const soundRef = useRef(sound);
  const positionRef = useRef(position);

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

  const play = useCallback((effect: SoundEffect): void => {
    if (soundRef.current.effects) {
      audioRef.current?.playEffect(effect);
    }
  }, []);

  /** 位置を変え, 動きに合った効果音を鳴らす */
  const go = useCallback(
    (to: Position | undefined): void => {
      wake();
      const from = positionRef.current;
      if (to === undefined) {
        setAuto(false);
        return;
      }
      if (to.slide === SLIDES.length - 1 && to.step === stepsOf(to.slide)) {
        play("finish");
      } else if (to.slide > from.slide) {
        play("next");
      } else if (to.slide < from.slide || to.step < from.step) {
        play("prev");
      } else {
        play("reveal");
      }
      positionRef.current = to;
      setPosition(to);
    },
    [play, wake],
  );

  const next = useCallback(
    (): void => go(nextPosition(positionRef.current)),
    [go],
  );

  const previous = useCallback(
    (): void => go(previousPosition(positionRef.current)),
    [go],
  );

  const jump = useCallback(
    (slide: number): void => go({ slide, step: 0 }),
    [go],
  );

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

  const toggleAuto = useCallback((): void => {
    wake();
    setAuto((value) => !value);
  }, [wake]);

  const toggleFullscreen = useCallback((): void => {
    wake();
    if (document.fullscreenElement !== null) {
      void document.exitFullscreen();
    } else {
      void frameRef.current?.requestFullscreen();
    }
  }, [wake]);

  // 自動再生
  useEffect(() => {
    if (!auto) {
      return;
    }
    const timer = setTimeout(next, stepSeconds(position.slide) * 1000);
    return () => clearTimeout(timer);
  }, [auto, position, next]);

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
        case " ":
        case "Enter":
          event.preventDefault();
          next();
          return;
        case "ArrowLeft":
        case "PageUp":
          event.preventDefault();
          previous();
          return;
        case "a":
        case "A":
          toggleAuto();
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
  }, [next, previous, toggleAuto, toggleFullscreen, updateSound]);

  const slide = SLIDES[position.slide];
  if (slide === undefined) {
    return <div />;
  }
  const Render = slide.render;
  const isFirst = position.slide === 0 && position.step === 0;
  const isLast = nextPosition(position) === undefined;

  return (
    <div
      ref={frameRef}
      className={`story-frame ${fullscreen ? "is-fullscreen" : ""}`}
    >
      <div
        className="story-stage"
        onClick={(event) => {
          if (event.target instanceof Element && event.target.closest("a")) {
            return;
          }
          next();
        }}
        role="region"
        aria-roledescription={label(lang, "slide", "スライド", "lumbildo")}
        aria-label={slideTitle(slide, lang)}
      >
        <div key={slide.id} className="story-slide">
          <Render step={position.step} lang={lang} />
        </div>
        <div className="story-page-number">
          {position.slide + 1} / {SLIDES.length}
        </div>
        {auto ? (
          <div
            key={`${position.slide}-${position.step}`}
            className="story-timer"
            style={{ animationDuration: `${stepSeconds(position.slide)}s` }}
          />
        ) : null}
      </div>
      <div className="story-controls">
        <ControlButton
          onClick={previous}
          title={label(lang, "Back (←)", "戻る (←)", "Reen (←)")}
        >
          ◀
        </ControlButton>
        <ControlButton
          onClick={next}
          title={label(lang, "Next (→)", "次へ (→)", "Antaŭen (→)")}
        >
          ▶
        </ControlButton>
        <ControlButton
          onClick={toggleAuto}
          active={auto}
          title={label(lang, "Autoplay (A)", "自動再生 (A)", "Aŭtomata (A)")}
        >
          {auto ? "⏸" : "⏵"}
          <span className="story-control-text">
            {label(lang, "Auto", "自動", "Aŭto")}
          </span>
        </ControlButton>
        <div className="story-progress">
          {SLIDES.map((s, index) => (
            <button
              type="button"
              key={s.id}
              className={`story-progress-segment ${
                index < position.slide
                  ? "is-past"
                  : index === position.slide
                    ? "is-current"
                    : ""
              }`}
              style={{ flexGrow: s.duration }}
              onClick={() => jump(index)}
              title={slideTitle(s, lang)}
              aria-label={slideTitle(s, lang)}
            />
          ))}
        </div>
        <ControlButton
          onClick={() => updateSound({ effects: !sound.effects })}
          active={sound.effects}
          title={label(
            lang,
            "Sound effects (S)",
            "効果音 (S)",
            "Sonefektoj (S)",
          )}
        >
          {sound.effects ? "🔔" : "🔕"}
        </ControlButton>
        <ControlButton
          onClick={() => updateSound({ bgm: !sound.bgm })}
          active={sound.bgm}
          title={label(lang, "Music (B)", "BGM (B)", "Muziko (B)")}
        >
          🎵
        </ControlButton>
        <ControlButton
          onClick={toggleFullscreen}
          active={fullscreen}
          title={label(lang, "Full screen (F)", "全画面 (F)", "Plenekrane (F)")}
        >
          ⛶
        </ControlButton>
      </div>
      {isFirst || isLast ? (
        <div className="story-hint">
          {label(
            lang,
            "Click or press → to advance · A autoplay · S sound · B music · F full screen",
            "クリックか → で進む · A 自動再生 · S 効果音 · B BGM · F 全画面",
            "Klaku aŭ premu → · A aŭtomata · S sono · B muziko · F plenekrane",
          )}
        </div>
      ) : null}
    </div>
  );
}

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
import { narrationLine, slideHasNarration } from "./narration.ts";
import { Narrator } from "./Narrator.tsx";
import { SLIDES, slideTitle } from "./slides.tsx";
import {
  buildTimeline,
  entryIndexAt,
  formatTime,
  type TimelineEntry,
} from "./timeline.ts";
import { VOICE_CLIPS, type VoiceClip } from "./voice_manifest.ts";
import "./story.css";

function voiceClipOf(slide: number, step: number): VoiceClip | undefined {
  const id = SLIDES[slide]?.id;
  return id === undefined ? undefined : VOICE_CLIPS[`${id}/${step}`];
}

function entryVoiceClip(
  entry: TimelineEntry | undefined,
): VoiceClip | undefined {
  return entry === undefined ? undefined : voiceClipOf(entry.slide, entry.step);
}

/** 解説音声の後に空ける秒数 */
const VOICE_PADDING_SECONDS = 0.4;

/** 台詞のあるスライドで, 台詞の無いステップ (要素が現れるだけ) の秒数 */
const REVEAL_SECONDS = 1.2;

/**
 * 台詞のあるスライドは, 要素が現れるステップを短く済ませ, 台詞のあるステップは音声の長さにする.
 * 解説音声のオン・オフで再生位置がずれないよう, 時間軸は常にこの長さにする
 */
const TIMELINE = buildTimeline(SLIDES, (slide, step, evenLength) => {
  const id = SLIDES[slide]?.id;
  if (id === undefined || !slideHasNarration(id)) {
    return evenLength;
  }
  const clip = voiceClipOf(slide, step);
  return clip === undefined
    ? REVEAL_SECONDS
    : clip.duration + VOICE_PADDING_SECONDS;
});

const VOICE_URLS = Object.values(VOICE_CLIPS).map((clip) => clip.file);

const PREFERENCE_KEY = "definy-story-sound";

/** J / L で動かす秒数 */
const SKIP_SECONDS = 5;

type SoundPreference = {
  readonly effects: boolean;
  readonly bgm: boolean;
  /** ずんだもんの解説音声 (日本語のときだけ) */
  readonly voice: boolean;
};

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
          voice: record["voice"] !== false,
        };
      }
    }
  } catch {
    // 保存できない環境では既定値を使う
  }
  return { effects: true, bgm: false, voice: true };
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
  /** 次のスライドに切り替わって, 消えていくところ */
  readonly leaving?: boolean;
}): JSX.Element | null {
  const slide = SLIDES[props.slide];
  if (slide === undefined) {
    return null;
  }
  const Render = slide.render;
  return (
    <div
      className={`story-slide ${
        props.leaving === true ? "is-leaving" : `is-enter-${slide.transition}`
      }`}
      aria-hidden={props.leaving === true ? true : undefined}
    >
      <Render step={props.step} lang={props.lang} />
    </div>
  );
});

/** 切り替わるとき, 前のスライドを消えるアニメーションの間だけ下に残す */
const LEAVING_SLIDE_MS = 700;

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
        const length = TIMELINE.slideLengths[index] ?? slide.duration;
        const played = Math.min(1, Math.max(0, (time - start) / length));
        const hovered =
          hover !== undefined && hover >= start && hover < start + length;
        return (
          <div
            key={slide.id}
            className={`story-seek-chapter ${hovered ? "is-hovered" : ""}`}
            style={{ flexGrow: length }}
          >
            <div
              className="story-seek-played"
              style={{ transform: `scaleX(${played})` }}
            />
          </div>
        );
      })}
      {/* スライドの中で要素が現れる (アニメーションが入る) 時刻の点 */}
      {TIMELINE.entries
        .filter((entry) => entry.step > 0)
        .map((entry) => (
          <span
            key={`${entry.slide}-${entry.step}`}
            className={`story-seek-dot ${time >= entry.start ? "is-past" : ""}`}
            style={{ left: `${(entry.start / TIMELINE.total) * 100}%` }}
          />
        ))}
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
 * スライドのクリックでは進めない (文字を選んだりリンクを押したりするため).
 * キー: → / PageDown / Enter 次へ, ← / PageUp 戻る, Space / K 再生と一時停止,
 * J / L 5 秒戻る・進む, S 効果音, B BGM, V ずんだもんの解説, F 全画面
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
    voice: true,
  });
  const [audio, setAudio] = useState<StoryAudio | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<StoryAudio | null>(null);
  const soundRef = useRef(sound);
  const timeRef = useRef(time);
  const shownEntryRef = useRef(0);
  const playingRef = useRef(playing);
  playingRef.current = playing;

  useEffect(() => {
    const preference = readPreference();
    soundRef.current = preference;
    setSound(preference);
    const audio = new StoryAudio();
    audioRef.current = audio;
    setAudio(audio);
    const onFullscreenChange = (): void => {
      setFullscreen(document.fullscreenElement === frameRef.current);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      audio.dispose();
      audioRef.current = null;
      setAudio(null);
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
    if (soundRef.current.voice) {
      audio.preloadVoices(VOICE_URLS);
    }
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

  /** その区間の解説音声を `offset` 秒の位置から鳴らす. 無ければ止める */
  const startVoiceAt = useCallback((index: number, offset: number): void => {
    const audio = audioRef.current;
    if (audio === null) {
      return;
    }
    const clip = entryVoiceClip(TIMELINE.entries[index]);
    if (
      !soundRef.current.voice ||
      clip === undefined ||
      offset >= clip.duration
    ) {
      audio.stopVoice();
      return;
    }
    audio.playVoice(clip.file, Math.max(0, offset));
  }, []);

  /** シークバーや J / L での移動. 再生中なら解説音声もその位置から鳴らす */
  const seek = useCallback(
    (next: number): void => {
      wake();
      updateTime(next);
      const index = entryIndexAt(TIMELINE, timeRef.current);
      if (playingRef.current) {
        const start = TIMELINE.entries[index]?.start ?? 0;
        startVoiceAt(index, timeRef.current - start);
      } else {
        audioRef.current?.stopVoice();
      }
    },
    [startVoiceAt, updateTime, wake],
  );

  /** 次へ・戻るでの移動. 止まっていても, 移った先のステップの解説音声を最初から鳴らす */
  const navigate = useCallback(
    (index: number): void => {
      const target = TIMELINE.entries[index];
      if (target === undefined) {
        return;
      }
      wake();
      updateTime(target.start);
      startVoiceAt(index, 0);
    },
    [startVoiceAt, updateTime, wake],
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
    const index = entryIndexAt(TIMELINE, timeRef.current) + 1;
    if (index < TIMELINE.entries.length) {
      navigate(index);
    }
  }, [navigate]);

  const previous = useCallback((): void => {
    navigate(Math.max(0, entryIndexAt(TIMELINE, timeRef.current) - 1));
  }, [navigate]);

  const togglePlay = useCallback((): void => {
    wake();
    if (playing) {
      audioRef.current?.stopVoice();
      setPlaying(false);
      return;
    }
    if (timeRef.current >= TIMELINE.total) {
      updateTime(0);
    }
    const index = entryIndexAt(TIMELINE, timeRef.current);
    startVoiceAt(
      index,
      timeRef.current - (TIMELINE.entries[index]?.start ?? 0),
    );
    setPlaying(true);
  }, [playing, startVoiceAt, updateTime, wake]);

  // 再生中は requestAnimationFrame で再生位置を進める
  useEffect(() => {
    if (!playing) {
      return;
    }
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now: number): void {
      const before = entryIndexAt(TIMELINE, timeRef.current);
      const advanced = timeRef.current + (now - last) / 1000;
      last = now;
      if (advanced >= TIMELINE.total) {
        updateTime(TIMELINE.total);
        setPlaying(false);
        return;
      }
      updateTime(advanced);
      const after = entryIndexAt(TIMELINE, advanced);
      if (after !== before) {
        startVoiceAt(after, advanced - (TIMELINE.entries[after]?.start ?? 0));
      }
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing, startVoiceAt, updateTime]);

  const updateSound = useCallback(
    (change: Partial<SoundPreference>): void => {
      const updated = { ...soundRef.current, ...change };
      soundRef.current = updated;
      setSound(updated);
      writePreference(updated);
      wake();
      if (change.voice !== undefined) {
        if (change.voice) {
          audioRef.current?.preloadVoices(VOICE_URLS);
        }
        // 再生中にオンにしたら, 今のステップの解説を今の位置から鳴らす. 止まっているときは鳴らさない
        if (playingRef.current) {
          const index = entryIndexAt(TIMELINE, timeRef.current);
          startVoiceAt(
            index,
            timeRef.current - (TIMELINE.entries[index]?.start ?? 0),
          );
        } else {
          audioRef.current?.stopVoice();
        }
      }
    },
    [startVoiceAt, wake],
  );

  // スライドが変わったら, 前のスライドを少しの間だけ下に残す
  const [leavingSlide, setLeavingSlide] = useState<
    { readonly slide: number; readonly step: number } | undefined
  >(undefined);
  const shownSlideRef = useRef({ slide: 0, step: 0 });
  const currentSlide = TIMELINE.entries[entryIndexAt(TIMELINE, time)];
  useEffect(() => {
    if (currentSlide === undefined) {
      return;
    }
    const previous = shownSlideRef.current;
    shownSlideRef.current = {
      slide: currentSlide.slide,
      step: currentSlide.step,
    };
    if (previous.slide === currentSlide.slide) {
      return;
    }
    setLeavingSlide(previous);
  }, [currentSlide]);
  useEffect(() => {
    if (leavingSlide === undefined) {
      return;
    }
    const timer = setTimeout(
      () => setLeavingSlide(undefined),
      LEAVING_SLIDE_MS,
    );
    return () => clearTimeout(timer);
  }, [leavingSlide]);

  // 解説をオフにしたら, 退出のアニメーションの間だけずんだもんを残す
  const voiceOnNow = sound.voice;
  const [narratorPresence, setNarratorPresence] = useState<
    "hidden" | "shown" | "leaving"
  >("hidden");
  useEffect(() => {
    if (voiceOnNow) {
      setNarratorPresence("shown");
      return;
    }
    setNarratorPresence((current) =>
      current === "hidden" ? current : "leaving",
    );
    const timer = setTimeout(() => setNarratorPresence("hidden"), 350);
    return () => clearTimeout(timer);
  }, [voiceOnNow]);

  const toggleFullscreen = useCallback((): void => {
    wake();
    if (document.fullscreenElement !== null) {
      void document.exitFullscreen();
    } else {
      void frameRef.current?.requestFullscreen();
    }
  }, [wake]);

  // about ページの中にあるので, スライドが画面に見えているときだけキー操作を受け付ける
  const visibleRef = useRef(false);
  useEffect(() => {
    const frame = frameRef.current;
    if (frame === null || typeof IntersectionObserver === "undefined") {
      visibleRef.current = true;
      return;
    }
    // 最初の通知を待たずに, 今の位置で見えているかを決めておく
    const rect = frame.getBoundingClientRect();
    const visibleHeight =
      Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
    visibleRef.current = visibleHeight >= rect.height * 0.4;
    const observer = new IntersectionObserver(
      (entries) => {
        visibleRef.current = entries.some(
          (entry) => entry.intersectionRatio >= 0.4,
        );
      },
      { threshold: [0, 0.4, 1] },
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  // キー操作
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target;
      if (
        (!visibleRef.current && document.fullscreenElement === null) ||
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
        case "v":
        case "V":
          updateSound({ voice: !soundRef.current.voice });
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
  /** 今のステップの台詞. 字幕は解説がオフでも出す (英語・エスペラントは音声が日本語で字幕だけ訳す) */
  const narration =
    slide !== undefined ? narrationLine(slide.id, entry.step) : undefined;

  return (
    <div
      ref={frameRef}
      className={`story-frame ${fullscreen ? "is-fullscreen" : ""}`}
    >
      <div
        className={`story-stage has-caption ${
          narratorPresence !== "hidden" ? "has-character" : ""
        }`}
        role="region"
        aria-roledescription={label(lang, "slide", "スライド", "lumbildo")}
        aria-label={slide === undefined ? "" : slideTitle(slide, lang)}
      >
        {/* スライドは 16:9 のまま, 字幕とずんだもんの場所を下と右に空けて, 収まる一番大きい大きさにする */}
        <div className="story-layout">
          <div className="story-slide-area">
            {leavingSlide === undefined ? null : (
              <SlideView
                key={`leaving-${leavingSlide.slide}`}
                slide={leavingSlide.slide}
                step={leavingSlide.step}
                lang={lang}
                leaving
              />
            )}
            <SlideView
              key={`slide-${entry.slide}`}
              slide={entry.slide}
              step={entry.step}
              lang={lang}
            />
          </div>
          <Narrator
            character={narratorPresence}
            offset={time - entry.start}
            audio={audio}
            clip={entryVoiceClip(entry)}
            line={narration}
            lang={lang}
          />
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
            <span className="story-page-number">
              {entry.slide + 1} / {SLIDES.length}
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
            onClick={() => updateSound({ voice: !sound.voice })}
            active={sound.voice}
            title={label(
              lang,
              "Zundamon narration, in Japanese (v)",
              "ずんだもんの解説 (v)",
              "Rakontado de Zundamon, japane (v)",
            )}
          >
            🗣
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
          "→ next · ← back · Space play/pause · J/L ±5s · S sound · B music · V Zundamon narration (Japanese) · F full screen",
          "→ で次へ · ← 戻る · Space 再生/一時停止 · J/L 5 秒戻る/進む · S 効果音 · B BGM · V ずんだもんの解説 · F 全画面",
          "→ antaŭen · ← reen · Spaceto ludi/paŭzi · J/L ±5s · S sono · B muziko · V rakontado de Zundamon (japane) · F plenekrane",
        )}
      </div>
    </div>
  );
}

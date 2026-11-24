import { useEffect, useRef, useState, type JSX } from "react";
import type { StoryAudio } from "./audio.ts";
import type { LanguageCode } from "../types.ts";
import {
  subtitleSentences,
  type Face,
  type NarrationLine,
} from "./narration.ts";
import type { MouthShape, VoiceClip } from "./voice_manifest.ts";
import {
  ZUNDAMON_PARTS,
  ZUNDAMON_SIZE,
  type ZundamonPart,
} from "./zundamon_parts.ts";

/** 解説音声の再生位置から, そのときの口の形を求める */
function mouthAt(clip: VoiceClip, time: number): MouthShape {
  let shape: MouthShape = "closed";
  for (const [start, next] of clip.mouth) {
    if (start > time) {
      break;
    }
    shape = next;
  }
  return shape;
}

/**
 * 鳴っている解説音声に合わせて口の形と字幕の文を変える.
 * 音声が鳴っていないとき (解説がオフのときも) は, 再生位置 (`offset`, このステップの中の秒) が動いたら, その位置の文にする
 */
function useMouth(
  audio: StoryAudio | null,
  clip: VoiceClip | undefined,
  offset: number,
): { readonly mouth: MouthShape; readonly sentence: number } {
  const offsetRef = useRef(offset);
  offsetRef.current = offset;
  const [state, setState] = useState<{
    readonly mouth: MouthShape;
    readonly sentence: number;
  }>({ mouth: "closed", sentence: 0 });
  useEffect(() => {
    setState({ mouth: "closed", sentence: 0 });
    if (clip === undefined) {
      return;
    }
    let lastOffset = offsetRef.current;
    const sentenceAt = (time: number): number =>
      Math.max(
        0,
        clip.sentences.findLastIndex((start) => start <= time),
      );
    let frame = requestAnimationFrame(function tick(): void {
      const time = audio?.voiceTime(clip.file);
      const offsetNow = offsetRef.current;
      const seeked = offsetNow !== lastOffset;
      lastOffset = offsetNow;
      const speaking = time !== undefined && time < clip.duration;
      const mouth = speaking ? mouthAt(clip, time) : "closed";
      setState((current) => {
        // 話していないときは, シークしたらその位置の文, しなければ最後に出した文のままにする
        const sentence =
          time !== undefined
            ? sentenceAt(time)
            : seeked
              ? sentenceAt(offsetNow)
              : current.sentence;
        return current.mouth === mouth && current.sentence === sentence
          ? current
          : { mouth, sentence };
      });
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [audio, clip]);
  return state;
}

/** ときどきまばたきする */
function useBlink(): boolean {
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = (): void => {
      timer = setTimeout(
        () => {
          setClosed(true);
          timer = setTimeout(() => {
            setClosed(false);
            schedule();
          }, 130);
        },
        2500 + Math.random() * 2500,
      );
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);
  return closed;
}

type PartKey = keyof typeof ZUNDAMON_PARTS.mouths;

/** 立ち絵のパーツを, 全体に対する割合の位置に置く */
function Part(props: { readonly part: ZundamonPart }): JSX.Element {
  const { part } = props;
  return (
    <img
      src={part.file}
      alt=""
      draggable={false}
      className="story-zundamon-part"
      style={{
        left: `${(part.left / ZUNDAMON_SIZE.width) * 100}%`,
        top: `${(part.top / ZUNDAMON_SIZE.height) * 100}%`,
        width: `${(part.width / ZUNDAMON_SIZE.width) * 100}%`,
      }}
    />
  );
}

/**
 * ずんだもんの立ち絵 (坂本アヒル「ずんだもん立ち絵素材」). 体の上に口・目・眉のパーツを重ねる.
 * 口の形は VOICEVOX のモーラの母音, 表情は台詞の `face` で決まる
 */
function ZundamonCharacter(props: {
  readonly mouth: MouthShape;
  readonly face: Face;
}): JSX.Element {
  const blink = useBlink();
  const mouth: PartKey = props.mouth;
  // 笑顔の目は閉じているので, まばたきしない
  const eyes =
    blink && props.face !== "happy"
      ? ZUNDAMON_PARTS.blink
      : ZUNDAMON_PARTS.eyes[props.face];
  return (
    <div className="story-zundamon" role="img" aria-label="ずんだもん">
      <div
        className="story-zundamon-figure"
        style={{
          aspectRatio: `${ZUNDAMON_SIZE.width} / ${ZUNDAMON_SIZE.height}`,
        }}
      >
        <Part part={ZUNDAMON_PARTS.body} />
        <Part part={ZUNDAMON_PARTS.mouths[mouth]} />
        <Part part={eyes} />
        <Part part={ZUNDAMON_PARTS.brows[props.face]} />
      </div>
    </div>
  );
}

/** パーツの画像を先に読み込み, 口が変わったときに画像が抜けないようにする */
function usePreloadParts(): void {
  useEffect(() => {
    const parts = [
      ZUNDAMON_PARTS.body,
      ZUNDAMON_PARTS.blink,
      ...Object.values(ZUNDAMON_PARTS.mouths),
      ...Object.values(ZUNDAMON_PARTS.eyes),
      ...Object.values(ZUNDAMON_PARTS.brows),
    ];
    for (const part of parts) {
      const image = new Image();
      image.src = part.file;
    }
  }, []);
}

/**
 * 字幕 (常に出す. 英語・エスペラントでも音声は日本語で, 字幕だけ訳す) と, ずんだもん (解説がオンのときだけ).
 * 置き場所はスライドの下端と右下 (story.css の .story-layout)
 */
/**
 * 吹き出しのしっぽ. 吹き出しの右の辺から, ずんだもんの口の方へ出す.
 * 塗りで吹き出しの枠線を隠し, 2 本の曲線だけを枠の色でなぞる.
 * 肩から上のときは右へ (is-side), 全身のとき (表紙) は口が高いので右上へ (is-up) 向ける
 */
function BubbleTail(): JSX.Element {
  return (
    <svg className="story-bubble-tail" viewBox="0 -10 16 26" aria-hidden="true">
      <g className="is-side">
        <path
          className="story-bubble-tail-fill"
          d="M0 8 L2.4 8 Q9 6.5 15.5 3 Q9.5 11.5 2.4 15 L0 15 Z"
        />
        <path
          className="story-bubble-tail-line"
          d="M2.4 8 Q9 6.5 15.5 3 Q9.5 11.5 2.4 15"
        />
      </g>
      <g className="is-up">
        <path
          className="story-bubble-tail-fill"
          d="M0 8 L2.4 8 Q7 4 12.5 -9 Q10 7 2.4 15 L0 15 Z"
        />
        <path
          className="story-bubble-tail-line"
          d="M2.4 8 Q7 4 12.5 -9 Q10 7 2.4 15"
        />
      </g>
    </svg>
  );
}

export function Narrator(props: {
  readonly audio: StoryAudio | null;
  readonly clip: VoiceClip | undefined;
  readonly line: NarrationLine | undefined;
  readonly lang: LanguageCode;
  /** ずんだもんを出すか. 解説をオフにしたあと, 退出のアニメーションをしている間は "leaving" */
  readonly character: "hidden" | "shown" | "leaving";
  /** 今のステップの中の再生位置 (秒) */
  readonly offset: number;
}): JSX.Element {
  const { audio, clip, line } = props;
  const { mouth, sentence } = useMouth(audio, clip, props.offset);
  const sentences =
    line === undefined ? [] : subtitleSentences(line, props.lang);
  const text = sentences[Math.min(sentence, sentences.length - 1)] ?? "";
  usePreloadParts();
  return (
    <div
      className={`story-narrator ${props.character === "leaving" ? "is-leaving" : ""}`}
    >
      <div className="story-caption">
        {line === undefined ? null : (
          <div key={`${line.speech}-${sentence}`} className="story-bubble">
            {text}
            <BubbleTail />
          </div>
        )}
      </div>
      {props.character === "hidden" ? null : (
        <ZundamonCharacter mouth={mouth} face={line?.face ?? "normal"} />
      )}
    </div>
  );
}

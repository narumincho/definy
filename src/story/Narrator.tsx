import { useEffect, useState, type JSX } from "react";
import type { StoryAudio } from "./audio.ts";
import type { Face, NarrationLine } from "./narration.ts";
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

/** 鳴っている解説音声に合わせて口の形を変える */
function useMouth(
  audio: StoryAudio | null,
  clip: VoiceClip | undefined,
): { readonly mouth: MouthShape; readonly speaking: boolean } {
  const [state, setState] = useState<{
    readonly mouth: MouthShape;
    readonly speaking: boolean;
  }>({ mouth: "closed", speaking: false });
  useEffect(() => {
    if (audio === null || clip === undefined) {
      setState({ mouth: "closed", speaking: false });
      return;
    }
    let frame = requestAnimationFrame(function tick(): void {
      const time = audio.voiceTime(clip.file);
      const speaking = time !== undefined && time < clip.duration;
      const mouth = speaking ? mouthAt(clip, time) : "closed";
      setState((current) =>
        current.mouth === mouth && current.speaking === speaking
          ? current
          : { mouth, speaking },
      );
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
  readonly speaking: boolean;
}): JSX.Element {
  const blink = useBlink();
  const mouth: PartKey = props.mouth;
  // 笑顔の目は閉じているので, まばたきしない
  const eyes =
    blink && props.face !== "happy"
      ? ZUNDAMON_PARTS.blink
      : ZUNDAMON_PARTS.eyes[props.face];
  return (
    <div
      className={`story-zundamon ${props.speaking ? "is-speaking" : ""}`}
      role="img"
      aria-label="ずんだもん"
    >
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

/** ずんだもんと字幕. 解説音声がオンのときだけ出す */
export function Narrator(props: {
  readonly audio: StoryAudio | null;
  readonly clip: VoiceClip | undefined;
  readonly line: NarrationLine | undefined;
}): JSX.Element {
  const { audio, clip, line } = props;
  const { mouth, speaking } = useMouth(audio, clip);
  usePreloadParts();
  return (
    <div className="story-narrator">
      {line === undefined ? null : (
        <div className="story-subtitle">{line.subtitle ?? line.speech}</div>
      )}
      <ZundamonCharacter
        mouth={mouth}
        face={line?.face ?? "normal"}
        speaking={speaking}
      />
    </div>
  );
}

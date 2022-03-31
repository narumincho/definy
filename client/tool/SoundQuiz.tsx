import * as React from "react";
import { Button } from "../ui/Button";
import { css } from "@emotion/css";

const itemList: ReadonlyArray<OscillatorType> = [
  "sawtooth",
  "sine",
  "square",
  "triangle",
];

type State = { readonly audioContext: AudioContext } & (
  | {
      readonly type: "playing";
      readonly oscillatorNode: OscillatorNode;
      readonly scale: Scale;
      readonly isShowAnswer: boolean;
    }
  | {
      readonly type: "played";
      readonly scale: Scale;
      readonly isShowAnswer: boolean;
    }
);

type Scale = {
  /** 国際式のオクターブ 440Hz は A4 */
  readonly octave: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  readonly pitch: Pitch;
};

const randomScale = (): Scale => {
  return {
    octave: Math.floor(Math.random() * 8) as Scale["octave"],
    pitch: pitchList[Math.floor(Math.random() * pitchList.length)] ?? "C",
  };
};

const pitchList = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

type Pitch = typeof pitchList[number];

const pitchToNumber = (pitch: Pitch): number => {
  return pitchList.indexOf(pitch);
};

const scaleToFrequency = (scale: Scale) => {
  return (
    440 *
    (2 ** (1 / 12)) **
      (scale.octave * pitchList.length + pitchToNumber(scale.pitch) - 57)
  );
};

const pitchToJapanese = (pitch: Pitch): string => {
  switch (pitch) {
    case "A":
      return "ラ";
    case "A#":
      return "ラ♯";
    case "B":
      return "シ";
    case "C":
      return "ド";
    case "C#":
      return "ド♯";
    case "D":
      return "レ";
    case "D#":
      return "レ♯";
    case "E":
      return "ミ";
    case "F":
      return "ファ";
    case "F#":
      return "ファ♯";
    case "G":
      return "ソ";
    case "G#":
      return "ソ♯";
  }
};

const startFunc = (oldState: State): State => {
  if (oldState.type === "playing") {
    return oldState;
  }
  const oscillatorItem = oldState.audioContext.createOscillator();
  oscillatorItem.type =
    itemList[Math.floor(Math.random() * itemList.length)] ?? "sine";
  oscillatorItem.frequency.setValueAtTime(
    scaleToFrequency(oldState.scale),
    oldState.audioContext.currentTime
  );
  oscillatorItem.connect(oldState.audioContext.destination);
  oscillatorItem.start();
  console.log("再生した");
  return {
    type: "playing",
    oscillatorNode: oscillatorItem,
    scale: oldState.scale,
    audioContext: oldState.audioContext,
    isShowAnswer: oldState.type === "played" ? oldState.isShowAnswer : false,
  };
};

export const SoundQuiz = (): React.ReactElement => {
  const [state, setState] = React.useState<State>(() => ({
    type: "played",
    scale: randomScale(),
    isShowAnswer: false,
    audioContext: new AudioContext(),
  }));

  const start = (): void => {
    setState(startFunc);
  };

  const stop = (): void => {
    setState((oldState): State => {
      if (oldState.type !== "playing") {
        return oldState;
      }
      oldState.oscillatorNode.stop();
      return {
        type: "played",
        scale: oldState.scale,
        audioContext: oldState.audioContext,
        isShowAnswer: oldState.isShowAnswer,
      };
    });
  };

  return (
    <div
      className={css({
        display: "grid",
        gap: 16,
        width: "100%",
        height: "100%",
        overflowY: "scroll",
      })}
    >
      <h2>音の周波数クイズ</h2>
      <div
        className={css({
          padding: 32,
        })}
      >
        <div
          onPointerDown={start}
          onPointerUp={stop}
          onPointerLeave={stop}
          className={css({
            padding: 32,
            backgroundColor: "#222",
            ":hover": {
              backgroundColor: "#333",
            },
          })}
        >
          <svg viewBox="0 0 16 16">
            <polygon
              points="1 1 15 8 1 15"
              fill={state.type === "playing" ? "#888" : "#ddd"}
            />
          </svg>
        </div>
      </div>

      <Answer state={state} setState={setState} />
    </div>
  );
};

const Answer = (props: {
  readonly state: State;
  readonly setState: (func: (oldState: State) => State) => void;
}): React.ReactElement => {
  switch (props.state.type) {
    case "played":
    case "playing":
      if (props.state.isShowAnswer) {
        return (
          <div
            className={css({
              display: "grid",
              gap: 8,
            })}
          >
            <div>
              <div
                className={css({
                  fontSize: 32,
                })}
              >
                {props.state.scale.octave}
                {pitchToJapanese(props.state.scale.pitch)}
              </div>
              <div>
                {props.state.scale.octave}
                {props.state.scale.pitch}
                (ヤマハ {props.state.scale.octave - 1}
                {props.state.scale.pitch})
              </div>
              <div>{scaleToFrequency(props.state.scale)}Hz</div>
            </div>
            <Button
              onClick={() => {
                props.setState((oldState) => ({
                  type: "played",
                  audioContext: oldState.audioContext,
                  isShowAnswer: false,
                  scale: randomScale(),
                }));
              }}
              style={{ padding: 16 }}
            >
              次の問題
            </Button>
          </div>
        );
      }
      return (
        <Button
          onClick={() => {
            props.setState((oldState) => {
              if (oldState.type === "played" || oldState.type === "playing") {
                return { ...oldState, isShowAnswer: true };
              }
              return oldState;
            });
          }}
          style={{ padding: 16 }}
        >
          答えを表示
        </Button>
      );
  }
};

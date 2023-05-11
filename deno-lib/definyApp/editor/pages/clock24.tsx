import React from "https://esm.sh/react@18.2.0?pin=v119";
import { ClockSetting } from "../components/clockSetting.tsx";
import { timeToDisplayText } from "../logic.ts";
import { styled } from "../style.ts";
import { Clock24Parameter } from "../url.ts";

const Container = styled("div", {
  backgroundColor: "#724242",
  height: "100%",
  display: "grid",
});

const StyledSvg = styled("svg", {
  gridColumn: "1 / 2",
  gridRow: "1 / 2",
  width: "100%",
  height: "100%",
  display: "grid",
});

const StyledButtonContainer = styled("div", {
  gridColumn: "1 / 2",
  gridRow: "1 / 2",
  justifySelf: "end",
  zIndex: "1",
});

const StyledButton = styled("button", {
  padding: 16,
  cursor: "pointer",
  backgroundColor: "black",
  fontSize: 24,
});

const StyledSetting = styled("div", {
  gridColumn: "1 / 2",
  gridRow: "1 / 2",
  backdropFilter: "blur(8px)",
});

const useAnimationFrame = (callback = () => {}) => {
  const reqIdRef = React.useRef<number>();
  const loop = React.useCallback(() => {
    reqIdRef.current = requestAnimationFrame(loop);
    callback();
  }, [callback]);

  React.useEffect(() => {
    reqIdRef.current = requestAnimationFrame(loop);
    return () => {
      if (reqIdRef.current !== undefined) {
        cancelAnimationFrame(reqIdRef.current);
      }
    };
  }, [loop]);
};

/**
 * 数値の整数部分を取り除く
 */
const removeInt = (value: number): number => {
  return value - Math.floor(value);
};

export const Clock24 = (
  props: {
    readonly parameter: Clock24Parameter;
    readonly onChangeUrl: (newURL: URL) => void;
  },
): React.ReactElement => {
  const [isSettingMode, setIsSettingMode] = React.useState<boolean>(false);
  const [now, setNow] = React.useState<Date>(new Date());

  useAnimationFrame(() => {
    setNow(new Date());
  });
  const seconds = now.getTime() - now.getTimezoneOffset() * 60 * 1000;

  const limitValueAndUnit = props.parameter.deadline === undefined
    ? undefined
    : timeToDisplayText(props.parameter.deadline);

  return (
    <Container>
      <StyledSvg viewBox="-100 -100 200 200">
        <circle cx={0} cy={0} r={93} stroke="#ca8484" fill="#b56566" />
        {Array.from({ length: 24 }).map((_, index) => {
          const angle = index / 24 * Math.PI * 2 - Math.PI / 2;
          return (
            <text
              text-anchor="middle"
              alignment-baseline="middle"
              x={Math.cos(angle) * 75}
              y={Math.sin(angle) * 75}
              fill="#000"
              fontSize={12}
            >
              {index}
            </text>
          );
        })}
        {Array.from({ length: 60 }).map((_, index) => {
          const angle = index / 60 * Math.PI * 2 - Math.PI / 2;
          const isFive = index % 5 === 0;
          return (
            <line
              x1={Math.cos(angle) * (isFive ? 85 : 87)}
              y1={Math.sin(angle) * (isFive ? 85 : 87)}
              x2={Math.cos(angle) * 93}
              y2={Math.sin(angle) * 93}
              strokeWidth={isFive ? 2 : 1}
              stroke="#000"
            />
          );
        })}
        <Needle
          angle0To1={seconds / (1000 * 60)}
          color="#FA2222"
          length={90}
          width={1}
        />
        <Needle
          angle0To1={seconds / (1000 * 60 * 60)}
          color="#FAE080"
          length={70}
          width={2}
        />
        <Needle
          angle0To1={seconds / (1000 * 60 * 60 * 24)}
          color="#60554A"
          length={50}
          width={3}
        />
        <text
          x={0}
          y={-30}
          textAnchor="middle"
          alignmentBaseline="middle"
          fill="#400488"
          stroke="white"
          strokeWidth={0.5}
          fontSize={18}
        >
          {props.parameter.message}
        </text>
        {limitValueAndUnit && (
          <text
            x={0}
            y={-10}
            textAnchor="middle"
            alignmentBaseline="middle"
            fill="#400488"
            stroke="white"
            strokeWidth={0.5}
            fontSize={18}
          >
            {limitValueAndUnit.after ? "から" : "まで"}
            {limitValueAndUnit.value}
            {limitValueAndUnit.unit}
          </text>
        )}
        <text
          x={0}
          y={15}
          textAnchor="middle"
          alignmentBaseline="middle"
          fill="#400488"
          stroke="white"
          strokeWidth={0.2}
          fontSize={8}
          fontWeight="bold"
        >
          {now.getFullYear()}/{now.getMonth() + 1}/{now.getDate()}
        </text>
        <text
          x={0}
          y={30}
          textAnchor="middle"
          alignmentBaseline="middle"
          fill="#400488"
          stroke="white"
          strokeWidth={0.5}
          fontSize={18}
        >
          {(Math.floor(seconds / (1000 * 60 * 60)) % 24).toString().padStart(
            2,
            "0",
          )}:{(Math.floor(seconds / (1000 * 60)) % 60).toString().padStart(
            2,
            "0",
          )}:{(Math.floor(seconds / (1000)) % 60).toString().padStart(2, "0")}
        </text>
      </StyledSvg>
      {isSettingMode
        ? (
          <StyledSetting>
            <ClockSetting {...props} />
          </StyledSetting>
        )
        : <></>}
      <StyledButtonContainer>
        <StyledButton
          onClick={() => {
            setIsSettingMode((prev) => !prev);
          }}
        >
          ⚙️
        </StyledButton>
      </StyledButtonContainer>
    </Container>
  );
};

export const Needle = (
  props: {
    readonly angle0To1: number;
    readonly color: string;
    readonly length: number;
    readonly width: number;
  },
) => {
  return (
    <g transform={`rotate(${(props.angle0To1 * 360 + 270) % 360})`}>
      <polygon
        points={`-5 0 0 -${props.width} ${props.length} 0 0 ${props.width} -5 0`}
        fill={props.color}
      />
    </g>
  );
};

export const clock24Title = (parameter: Clock24Parameter) => {
  return parameter.message + " | 1周24時間の時計 | definy";
};

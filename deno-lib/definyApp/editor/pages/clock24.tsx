/// <reference no-default-lib="true"/>
/// <reference lib="dom" />
/// <reference lib="deno.ns" />

import React from "https://esm.sh/react@18.2.0";
import { c, toStyleAndHash } from "../../../cssInJs/mod.ts";

const containerStyle = toStyleAndHash({
  backgroundColor: "#724242",
  height: "100%",
});

const svgStyle = toStyleAndHash({
  width: "100%",
  height: "100%",
  display: "grid",
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

export const Clock24 = (): React.ReactElement => {
  const [now, setNow] = React.useState<Date>(new Date());

  useAnimationFrame(() => {
    setNow(new Date());
  });
  const seconds = now.getTime() - now.getTimezoneOffset() * 60 * 1000;

  const shortAngle = (seconds / (1000 * 60 * 60 * 24) * Math.PI * 2) -
    Math.PI / 2;
  const longAngle = removeInt(seconds / (1000 * 60 * 60)) * Math.PI * 2 -
    Math.PI / 2;

  const secondsAngle = removeInt(seconds / (1000 * 60)) * Math.PI * 2 -
    Math.PI / 2;

  return (
    <div className={c(containerStyle)}>
      <svg className={c(svgStyle)} viewBox="-100 -100 200 200">
        <circle cx={0} cy={0} r={93} stroke="#ca8484" fill="#b56566" />
        <polygon
          points={`0 0 ${Math.cos(shortAngle) * 50} ${
            Math.sin(shortAngle) * 50
          } 0 1`}
          stroke="#dcd5dc"
          strokeWidth={0.5}
        />
        <line
          x1={0}
          y1={0}
          x2={Math.cos(longAngle) * 70}
          y2={Math.sin(longAngle) * 70}
          stroke="#3f383f"
          strokeWidth={2}
        />
        <line
          x1={0}
          y1={0}
          x2={Math.cos(secondsAngle) * 90}
          y2={Math.sin(secondsAngle) * 90}
          stroke="red"
        />
        <text
          x={0}
          y={-20}
          textAnchor="middle"
          alignmentBaseline="middle"
          fill="white"
          fontSize={8}
        >
          {now.getFullYear()}/{now.getMonth() + 1}/{now.getDate()}
        </text>
        <text
          x={0}
          y={20}
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
      </svg>
    </div>
  );
};

export const clock24Title = () => {
  return "タイトル";
};

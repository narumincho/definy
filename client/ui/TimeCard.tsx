import * as React from "react";
import * as d from "../../data";
import { css } from "@emotion/css";

export type Props = {
  time: d.Time;
};

const timeToDate = (time: d.Time): Date => {
  const milliseconds = time.day * 1000 * 60 * 60 * 24 + time.millisecond;
  return new Date(milliseconds);
};

/**
 * 日付を表示する. タイムゾーンを内部で考慮する
 */
export const TimeCard: React.VFC<Props> = (props) => {
  const date = timeToDate(props.time);
  return (
    <div
      className={css({
        fontSize: 20,
      })}
    >
      {date.getFullYear().toString().padStart(4, "0")}-
      {(date.getMonth() + 1).toString().padStart(2, "0")}-
      {date.getDate().toString().padStart(2, "0")}
    </div>
  );
};

export const TimeDetail: React.VFC<Props> = (props) => {
  const date = timeToDate(props.time);
  return (
    <div
      className={css({
        fontSize: 20,
      })}
    >
      <div>{date.toLocaleString()}</div>
      <div
        className={css({
          fontSize: 16,
          color: "#ddd",
        })}
      >
        {date.toISOString()}
      </div>
    </div>
  );
};
import React from "https://esm.sh/react@18.2.0?pin=v99";
import { toStyleAndHash, useCssInJs } from "../../../cssInJs/mod.tsx";
import { Clock24Parameter } from "../url.ts";

const containerStyle = toStyleAndHash({
  padding: 16,
  height: "100%",
  boxSizing: "border-box",
  display: "grid",
  alignContent: "end",
  gap: 16,
});

const labelStyle = toStyleAndHash({
  display: "flex",
  gap: 8,
  alignItems: "center",
});

const labelTextStyle = toStyleAndHash({
  width: 80,
});

const inputStyle = toStyleAndHash({
  padding: 4,
  fontSize: 16,
});

const getTimezoneOffsetText = (): string => {
  const timezoneOffset = new Date().getTimezoneOffset();
  const isPlus = timezoneOffset <= 0;
  const timezoneOffsetAbs = Math.abs(timezoneOffset);

  const offsetHour = Math.floor(timezoneOffsetAbs / 60);
  const offsetMinute = Math.floor(timezoneOffsetAbs % 60);

  return (isPlus ? "+" : "-") + offsetHour.toString().padStart(2, "0") + ":" +
    offsetMinute.toString().padStart(2, "0");
};

const updateUrl = (
  parameter: { readonly dateTimeLocal: string; readonly message: string },
  onChangeUrl: (newURL: URL) => void,
): void => {
  const newUrl = new URL(location.href);
  newUrl.searchParams.set(
    "date",
    parameter.dateTimeLocal + getTimezoneOffsetText(),
  );
  newUrl.searchParams.set("message", parameter.message);
  newUrl.searchParams.set("random", crypto.randomUUID());
  onChangeUrl(newUrl);
};

const getLocalIsoDateString = (date: Date): string => {
  return new Date(
    date.getTime() - new Date().getTimezoneOffset() * 60 * 1000,
  ).toISOString().slice(0, 19);
};

export const ClockSetting = (
  props: {
    readonly parameter: Clock24Parameter;
    readonly onChangeUrl: (newURL: URL) => void;
  },
): React.ReactElement => {
  const c = useCssInJs();
  return (
    <div className={c(containerStyle)}>
      <label className={c(labelStyle)}>
        <div className={c(labelTextStyle)}>date</div>
        <input
          type="datetime-local"
          className={c(inputStyle)}
          value={props.parameter.deadline === undefined
            ? undefined
            : getLocalIsoDateString(props.parameter.deadline.date)}
          onChange={(e) => {
            const newValue = e.target.value;
            updateUrl(
              { dateTimeLocal: newValue, message: props.parameter.message },
              props.onChangeUrl,
            );
          }}
        />
        <div>{getTimezoneOffsetText()}</div>
      </label>
      <label className={c(labelStyle)}>
        <div className={c(labelTextStyle)}>message</div>
        <input
          type="text"
          className={c(inputStyle)}
          value={props.parameter.message}
          onChange={(e) => {
            const newMessage = e.target.value;
            updateUrl(
              {
                dateTimeLocal:
                  props.parameter.deadline?.date?.toLocaleString() ?? "???",
                message: newMessage,
              },
              props.onChangeUrl,
            );
          }}
        />
      </label>
    </div>
  );
};

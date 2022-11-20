import React from "https://esm.sh/react@18.2.0?pin=v99";
import { c, toStyleAndHash } from "../../../cssInJs/mod.ts";

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
  const offset = Math.floor((0 - new Date().getTimezoneOffset()) / 60);

  return offset >= 0
    ? "+" + offset.toString().padStart(2, "0")
    : "-" + (-offset).toString().padStart(2, "0");
};

const updateUrl = (
  parameter: { readonly dateTimeLocal: string; readonly message: string },
): void => {
  console.log(parameter.dateTimeLocal);
  const newUrl = new URL(location.href);
  newUrl.searchParams.set(
    "time",
    parameter.dateTimeLocal + getTimezoneOffsetText(),
  );
  newUrl.searchParams.set("message", parameter.message);
  newUrl.searchParams.set("random", crypto.randomUUID());
  window.history.replaceState(undefined, "", newUrl.toString());
};

export const ClockSetting = (): React.ReactElement => {
  const [dateTimeLocal, setDateTimeLocal] = React.useState<string>("");
  const [message, setMessage] = React.useState<string>("");

  return (
    <div className={c(containerStyle)}>
      <label className={c(labelStyle)}>
        <div className={c(labelTextStyle)}>time</div>
        <input
          type="datetime-local"
          className={c(inputStyle)}
          value={dateTimeLocal}
          onChange={(e) => {
            const newValue = e.target.value;
            setDateTimeLocal(newValue);

            updateUrl({ dateTimeLocal: newValue, message });
          }}
        />
        <div>{getTimezoneOffsetText()}</div>
      </label>
      <label className={c(labelStyle)}>
        <div className={c(labelTextStyle)}>message</div>
        <input
          type="text"
          className={c(inputStyle)}
          value={message}
          onChange={(e) => {
            const newMessage = e.target.value;
            setMessage(newMessage);
            updateUrl({ dateTimeLocal, message: newMessage });
          }}
        />
      </label>
    </div>
  );
};

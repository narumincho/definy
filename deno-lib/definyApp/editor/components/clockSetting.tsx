import React from "https://esm.sh/react@18.2.0?pin=v118";
import { styled } from "../style.ts";
import { Clock24Parameter } from "../url.ts";

const Container = styled("div", {
  padding: 16,
  height: "100%",
  boxSizing: "border-box",
  display: "grid",
  alignContent: "end",
  gap: 16,
});

const StyledLabel = styled("label", {
  display: "flex",
  gap: 8,
  alignItems: "center",
});

const StyledLabelText = styled("div", {
  width: 80,
});

const StyledInput = styled("input", {
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
  return (
    <Container>
      <StyledLabel>
        <StyledLabelText>date</StyledLabelText>
        <StyledInput
          type="datetime-local"
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
      </StyledLabel>
      <StyledLabel>
        <StyledLabelText>message</StyledLabelText>
        <StyledInput
          type="text"
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
      </StyledLabel>
    </Container>
  );
};

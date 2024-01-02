import React from "https://esm.sh/react@18.2.0?pin=v135";
import { Button } from "../../editor/Button.tsx";
import { jsonStringify, RawJsonValue } from "../../typedJson.ts";
import { styled } from "./style.ts";

const Requesting = styled("div", {
  backgroundColor: "gray",
  height: 32,
});

const ResultText = styled("div", {
  whiteSpace: "pre-wrap",
  borderStyle: "solid",
  borderColor: "#ccc",
  padding: 8,
  overflowWrap: "anywhere",
});

export const Result = (props: {
  readonly data: RawJsonValue;
  readonly requesting: boolean;
}) => {
  const [responseToClipboardLoading, setResponseToClipboardLoading] = React
    .useState<boolean>(false);

  if (props.requesting) {
    return <Requesting />;
  }
  const data = props.data;
  if (data === undefined) {
    return <div />;
  }
  return (
    <div>
      <Button
        onClick={responseToClipboardLoading ? undefined : () => {
          setResponseToClipboardLoading(true);
          navigator.clipboard.writeText(
            typeof data === "string" ? data : JSON.stringify(data),
          ).then(() => {
            setResponseToClipboardLoading(false);
          });
        }}
      >
        クリップボードにコピー
      </Button>
      <div>
        <ResultText>
          {typeof data === "string" ? data : jsonStringify(data)}
        </ResultText>
      </div>
    </div>
  );
};

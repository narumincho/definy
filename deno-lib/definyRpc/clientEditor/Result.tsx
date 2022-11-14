/// <reference no-default-lib="true"/>
/// <reference lib="dom" />

import React from "https://esm.sh/react@18.2.0";
import { Button } from "../../editor/Button.tsx";
import { c, toStyleAndHash } from "../../cssInJs/mod.ts";
import { jsonStringify, RawJsonValue } from "../../typedJson.ts";

const requestingStyle = toStyleAndHash({
  backgroundColor: "gray",
  height: 32,
});

const resultStyle = toStyleAndHash({
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
    return <div className={c(requestingStyle)} />;
  }
  const data = props.data;
  return (
    <div>
      {typeof data === "string" && (
        <Button
          onClick={responseToClipboardLoading ? undefined : () => {
            setResponseToClipboardLoading(true);
            navigator.clipboard.writeText(data).then(() => {
              setResponseToClipboardLoading(false);
            });
          }}
        >
          クリップボードにコピー
        </Button>
      )}
      <div>
        <div className={c(resultStyle)}>
          {typeof data === "string" ? data : jsonStringify(data)}
        </div>
      </div>
    </div>
  );
};

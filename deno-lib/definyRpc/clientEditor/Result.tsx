/* @jsx jsx */
/// <reference lib="dom" />

import React from "https://esm.sh/react@18.2.0";
import { Button } from "../../editor/Button.tsx";
import { jsx } from "https://esm.sh/@emotion/react@11.10.5";

export const Result = (props: {
  readonly data: unknown;
  readonly requesting: boolean;
}) => {
  const [responseToClipboardLoading, setResponseToClipboardLoading] =
    React.useState<boolean>(false);

  if (props.requesting) {
    return <div css={{ backgroundColor: "gray", height: 32 }} />;
  }
  const data = props.data;
  return (
    <div>
      {typeof data === "string" && (
        <Button
          onClick={
            responseToClipboardLoading
              ? undefined
              : () => {
                  setResponseToClipboardLoading(true);
                  navigator.clipboard.writeText(data).then(() => {
                    setResponseToClipboardLoading(false);
                  });
                }
          }
        >
          クリップボードにコピー
        </Button>
      )}
      <div css={{ overflowWrap: "anywhere" }}>
        <div
          css={{
            whiteSpace: "pre-wrap",
            borderStyle: "solid",
            borderColor: "#ccc",
            padding: 8,
          }}
        >
          {typeof data === "string" ? data : JSON.stringify(data, undefined)}
        </div>
      </div>
    </div>
  );
};

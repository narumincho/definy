import * as React from "react";
import { Button } from "../../../client/ui/Button";

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
      {typeof data === "string" ? (
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
      ) : (
        <></>
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

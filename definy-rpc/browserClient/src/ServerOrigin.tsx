import * as React from "react";
import { OneLineTextEditor } from "../../../client/ui/OneLineTextEditor";

export const ServerOrigin = (props: {
  readonly serverName: string | undefined;
  readonly initServerOrigin: string;
  readonly onChangeServerOrigin: (newOrigin: string) => void;
}): React.ReactElement => {
  const [originText, setOriginText] = React.useState<string>(
    props.initServerOrigin
  );

  const origin = getSafeOrigin(originText);

  return (
    <div css={{ padding: 16 }}>
      <div>
        <label
          css={{
            display: "grid",
            gridAutoFlow: "column",
            gap: 16,
            justifyContent: "start",
          }}
        >
          server origin
          <OneLineTextEditor
            id="server-origin"
            value={originText}
            css={{
              fontFamily: "monospace",
            }}
            onChange={(value) => {
              setOriginText(value);
              if (origin !== undefined) {
                props.onChangeServerOrigin(origin);
              }
            }}
          />
          {origin === undefined ? (
            <div>不正なオリジンです</div>
          ) : (
            <div>{origin}</div>
          )}
        </label>
      </div>
      <h1
        css={{
          margin: 0,
          backgroundColor:
            props.serverName === undefined ? "#444" : "transparent",
        }}
      >
        {props.serverName === undefined ? "..." : props.serverName}
      </h1>
    </div>
  );
};

const getSafeOrigin = (text: string): string | undefined => {
  try {
    return new URL(text).origin;
  } catch {
    return undefined;
  }
};
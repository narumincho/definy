import * as React from "react";
import { OneLineTextEditor } from "../../../client/ui/OneLineTextEditor";

export const ServerOrigin = (props: {
  readonly serverName: string | undefined;
  readonly serverOrigin: string;
  readonly onChangeServerOrigin: (newOrigin: string) => void;
}): React.ReactElement => {
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
            value={props.serverOrigin}
            css={{
              fontFamily: "monospace",
            }}
            onChange={(value) => {
              props.onChangeServerOrigin(value);
            }}
          />
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

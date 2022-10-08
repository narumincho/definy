import * as React from "react";
import { Editor } from "../../../components/Editor";

const serverOriginFieldId = "server-origin";

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
          <Editor
            fields={[
              {
                id: serverOriginFieldId,
                name: "server origin",
                body: {
                  type: "text",
                  value: originText,
                },
                readonly: false,
              },
            ]}
            onChange={(fieldId, value) => {
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

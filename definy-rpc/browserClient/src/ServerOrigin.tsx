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
      <Editor
        fields={[
          {
            id: serverOriginFieldId,
            name: "server origin",
            body: {
              type: "text",
              value: originText,
              readonly: false,
              isTitle: false,
            },
            errorMessage:
              origin === undefined
                ? "不正なオリジンです. 例: http://localhost:3000"
                : undefined,
          },
          {
            id: "server-name",
            errorMessage: undefined,
            name: "server name",
            body: {
              type: "text",
              value: props.serverName === undefined ? "..." : props.serverName,
              readonly: true,
              isTitle: true,
            },
          },
        ]}
        onChange={(fieldId, value) => {
          setOriginText(value);
          if (origin !== undefined) {
            props.onChangeServerOrigin(origin);
          }
        }}
      />
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

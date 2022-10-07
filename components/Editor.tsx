import * as React from "react";
import { EnterIcon } from "./icon/EnterIcon";
import { useEditorKeyInput } from "../client/hook/useEditorKeyInput";
import { useNotification } from "../client/hook/useNotification";

export type Field = {
  readonly name: string;
  readonly body: FieldBody;
};

export type FieldBody = {
  readonly type: "text";
  readonly value: string;
};

export const Editor = (props: {
  readonly fields: ReadonlyArray<Field>;
  readonly onChange: (fieldName: string, newValue: string) => void;
}): React.ReactElement => {
  const [selectedName, setSelectedName] = React.useState<string | undefined>();
  const [isEditing, setIsEditing] = React.useState<boolean>(false);

  useEditorKeyInput({
    disabled: isEditing,
    onEnter: () => {
      console.log("onEnter", selectedName);
      setIsEditing(true);
    },
    onUp: () => {
      console.log("onUp");
      if (selectedName === undefined) {
        const nextItemName = props.fields[props.fields.length - 1]?.name;
        if (nextItemName !== undefined) {
          setSelectedName(nextItemName);
        }
        return;
      }
      const index = props.fields.findIndex((f) => f.name === selectedName);
      const nextItemName = props.fields[index - 1]?.name;
      if (nextItemName !== undefined) {
        setSelectedName(nextItemName);
      }
    },
    onDown: () => {
      console.log("onDown");
      if (selectedName === undefined) {
        const nextItemName = props.fields[0]?.name;
        if (nextItemName !== undefined) {
          setSelectedName(nextItemName);
        }
        return;
      }
      const index = props.fields.findIndex((f) => f.name === selectedName);
      const nextItemName = props.fields[index + 1]?.name;
      if (nextItemName !== undefined) {
        setSelectedName(nextItemName);
      }
    },
  });

  const { element: notificationElement, addMessage } = useNotification();

  return (
    <div css={{ display: "grid", height: "100%" }}>
      <div css={{ gridColumn: "1 / 2", gridRow: "1 / 2" }}>
        {[...props.fields].map((field) => (
          <TextField
            name={field.name}
            value={field.body.value}
            selectedName={selectedName}
            isEditing={isEditing}
            onSelected={() => {
              console.log("onSelected", field.name);
              setSelectedName(field.name);
              setIsEditing(false);
            }}
            onUnSelected={() => {
              console.log("onUnSelected", field.name);
              setSelectedName(undefined);
            }}
            onStartEdit={() => {
              console.log("onStartEdit", field.name);
              setIsEditing(true);
            }}
            onChange={(newText) => {
              props.onChange(field.name, newText);
              setIsEditing(false);
            }}
            onCopy={(text) => {
              addMessage({
                text: "「" + text + "」をコピーした",
                type: "success",
              });
            }}
            onPaste={(text) => {
              addMessage({
                text: "「" + text + "」を貼り付けた",
                type: "success",
              });
            }}
          />
        ))}
      </div>
      <div
        css={{
          gridColumn: "1 / 2",
          gridRow: "1 / 2",
          justifySelf: "end",
          alignSelf: "end",
        }}
      >
        {notificationElement}
      </div>
    </div>
  );
};

const TextField = (props: {
  readonly name: string;
  readonly value: string;
  readonly selectedName: string | undefined;
  readonly isEditing: boolean;
  readonly onSelected: () => void;
  readonly onUnSelected: () => void;
  readonly onStartEdit: () => void;
  readonly onChange: (newText: string) => void;
  readonly onPaste: (text: string) => void;
  readonly onCopy: (text: string) => void;
}) => {
  return (
    <div
      key={props.name}
      css={{
        borderStyle: "solid",
        borderColor:
          props.selectedName === props.name ? "orange" : "transparent",
        borderRadius: 8,
        minHeight: 64,
        ":focus": {
          borderBlockColor: "skyblue",
        },
      }}
      onFocus={() => {
        props.onSelected();
      }}
      onPaste={(e) => {
        const textInClipboard = e.clipboardData.getData("text");
        console.log("div内 paste", e, textInClipboard);
        props.onChange(textInClipboard);
        props.onPaste(textInClipboard);
      }}
      onCopy={(e) => {
        e.preventDefault();
        e.clipboardData.setData("text", props.value);
        console.log("div 内 でcopy. 中身:", props.value);
        props.onCopy(props.value);
      }}
      tabIndex={-1}
    >
      <div>{props.name}</div>
      <div css={{ paddingLeft: 8 }}>
        <div css={{ display: "flex", gap: 4 }}>
          {props.selectedName === props.name && props.isEditing ? (
            <></>
          ) : (
            <div css={{ whiteSpace: "pre-wrap" }} onClick={props.onStartEdit}>
              {props.value}
            </div>
          )}
          {props.selectedName === props.name && !props.isEditing ? (
            <div
              css={{
                background: "#444",
                padding: "0 8px",
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <EnterIcon stroke="white" height={24} />
              編集
            </div>
          ) : (
            <></>
          )}
        </div>
        {props.selectedName === props.name && props.isEditing ? (
          <StyledInput
            value={props.value}
            onSubmit={props.onChange}
            onCopy={props.onCopy}
            onPaste={props.onPaste}
          />
        ) : (
          <></>
        )}
      </div>
    </div>
  );
};

const StyledInput = (props: {
  readonly value: string;
  readonly onSubmit: (newText: string) => void;
  readonly onPaste: (text: string) => void;
  readonly onCopy: (text: string) => void;
}): React.ReactElement => {
  const [editingText, setEditingText] = React.useState<string>(props.value);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        props.onSubmit(editingText);
      }}
    >
      <input
        type="text"
        value={editingText}
        css={{
          padding: 8,
          fontSize: 16,
          backgroundColor: "#222",
          border: "none",
          color: "#eee",
          borderRadius: 8,
          width: "100%",
          ":hover": {
            backgroundColor: "#333",
          },
        }}
        autoFocus
        onFocus={(e) => {
          e.stopPropagation();
        }}
        onChange={(e) => {
          setEditingText(e.target.value);
        }}
        onPaste={(e) => {
          props.onPaste(e.clipboardData.getData("text"));
          e.stopPropagation();
        }}
        onCopy={(e) => {
          const start = e.currentTarget.selectionStart;
          const end = e.currentTarget.selectionEnd;
          if (start === null || end === null) {
            return;
          }
          console.log(start, end);
          props.onCopy(e.currentTarget.value.slice(start, end));
          e.stopPropagation();
        }}
      />
    </form>
  );
};

import * as React from "react";
import { EnterIcon } from "./icon/EnterIcon";
import { useEditorKeyInput } from "../client/hook/useEditorKeyInput";
import { useNotification } from "../client/hook/useNotification";

export type Field = {
  readonly id: string;
  readonly name: string;
  readonly readonly: boolean;
  readonly body: FieldBody;
};

export type FieldBody = {
  readonly type: "text";
  readonly value: string;
};

/**
 * 汎用エディタ
 */
export const Editor = (props: {
  readonly fields: ReadonlyArray<Field>;
  readonly onChange: (fieldId: string, newValue: string) => void;
}): React.ReactElement => {
  const [selectedFieldId, setSelectedFieldId] = React.useState<
    string | undefined
  >();
  const [isEditing, setIsEditing] = React.useState<boolean>(false);

  useEditorKeyInput({
    disabled: isEditing,
    onEnter: () => {
      console.log("onEnter", selectedFieldId);
      if (
        !props.fields.find((field) => field.id === selectedFieldId)?.readonly
      ) {
        setIsEditing(true);
      }
    },
    onUp: () => {
      console.log("onUp");
      if (selectedFieldId === undefined) {
        const nextFieldId = props.fields[props.fields.length - 1]?.id;
        if (nextFieldId !== undefined) {
          setSelectedFieldId(nextFieldId);
        }
        return;
      }
      const index = props.fields.findIndex((f) => f.id === selectedFieldId);
      const nextFieldId = props.fields[index - 1]?.id;
      if (nextFieldId !== undefined) {
        setSelectedFieldId(nextFieldId);
      }
    },
    onDown: () => {
      console.log("onDown");
      if (selectedFieldId === undefined) {
        const nextFieldId = props.fields[0]?.id;
        if (nextFieldId !== undefined) {
          setSelectedFieldId(nextFieldId);
        }
        return;
      }
      const index = props.fields.findIndex((f) => f.id === selectedFieldId);
      const nextFieldId = props.fields[index + 1]?.id;
      if (nextFieldId !== undefined) {
        setSelectedFieldId(nextFieldId);
      }
    },
  });

  const { element: notificationElement, addMessage } = useNotification();

  return (
    <div css={{ display: "grid", height: "100%" }}>
      <div css={{ gridColumn: "1 / 2", gridRow: "1 / 2" }}>
        {[...props.fields].map((field) => (
          <TextField
            key={field.id}
            name={field.name}
            value={field.body.value}
            selected={selectedFieldId === field.id}
            isEditing={isEditing}
            readonly={field.readonly}
            onSelected={() => {
              console.log("onSelected", field.name);
              setSelectedFieldId(field.name);
              setIsEditing(false);
            }}
            onUnSelected={() => {
              console.log("onUnSelected", field.name);
              setSelectedFieldId(undefined);
            }}
            onStartEdit={() => {
              console.log("onStartEdit", field.name);
              setIsEditing(true);
            }}
            onChange={(newText) => {
              props.onChange(field.id, newText);
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
  readonly selected: boolean;
  readonly isEditing: boolean;
  readonly readonly: boolean;
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
        borderColor: props.selected ? "orange" : "transparent",
        borderRadius: 8,
        minHeight: 64,
        ":focus": {
          borderBlockColor: "skyblue",
        },
        display: "grid",
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
          {props.selected && props.isEditing ? (
            <></>
          ) : (
            <div css={{ whiteSpace: "pre-wrap" }} onClick={props.onStartEdit}>
              {props.value}
            </div>
          )}
          {!props.readonly && props.selected && !props.isEditing ? (
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
        {props.selected && props.isEditing ? (
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

import * as React from "react";
import { EnterIcon } from "./icon/EnterIcon";
import { useEditorKeyInput } from "../client/hook/useEditorKeyInput";

export type Field = {
  readonly name: string;
  readonly description: string;
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
  const [editingText, setEditingText] = React.useState<string | undefined>(
    undefined
  );

  const ref = React.useRef<HTMLInputElement>(null);

  useEditorKeyInput({
    disabled: editingText !== undefined,
    onEnter: React.useCallback(() => {
      setEditingText(
        props.fields.find((f) => f.name === selectedName)?.body.value ?? ""
      );
      ref.current?.focus();
    }, []),
    onUp: React.useCallback(() => {
      console.log("onUppp");
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
    }, []),
    onDown: React.useCallback(() => {
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
    }, []),
  });

  return (
    <div>
      {[...props.fields].map((field) => (
        <TextField
          name={field.name}
          description={field.description}
          value={field.body.value}
          selectedName={selectedName}
          onSelected={() => {
            setSelectedName(field.name);
            console.log("ほかを入力してキャンセル");
            if (editingText !== undefined && selectedName !== undefined) {
              props.onChange(selectedName, editingText);
              setEditingText(undefined);
            }
          }}
          onUnSelected={() => {
            setSelectedName(undefined);
          }}
        />
      ))}
      {editingText === undefined ? (
        <></>
      ) : (
        <form
          onSubmit={(e) => {
            setEditingText(undefined);
            console.log("確定!");
            if (typeof selectedName === "string") {
              props.onChange(selectedName, editingText);
            }
            e.preventDefault();
          }}
        >
          <input
            type="text"
            ref={ref}
            value={editingText}
            onChange={(e) => {
              setEditingText(e.target.value);
            }}
            autoFocus
          />
        </form>
      )}
    </div>
  );
};

const TextField = (props: {
  readonly name: string;
  readonly description: string;
  readonly value: string;
  readonly selectedName: string | undefined;
  readonly onSelected: () => void;
  readonly onUnSelected: () => void;
}) => {
  const [isHover, setIsHover] = React.useState<boolean>(false);

  return (
    <div
      key={props.name}
      css={{
        borderStyle: "solid",
        borderColor:
          props.selectedName === props.name ? "orange" : "transparent",
        borderRadius: 8,
      }}
      onFocus={() => {
        props.onSelected();
      }}
      tabIndex={-1}
    >
      <div
        onPointerEnter={() => {
          setIsHover(true);
        }}
        onPointerLeave={() => {
          setIsHover(false);
        }}
      >
        {props.name}
      </div>
      {isHover ? (
        <div
          css={{ position: "absolute", backgroundColor: "#444", padding: 8 }}
        >
          {props.description}
        </div>
      ) : (
        <></>
      )}
      <div css={{ whiteSpace: "pre-wrap" }}>{props.value}</div>
      {props.selectedName === props.name ? (
        <div>
          <EnterIcon stroke="white" height={24} />
          編集
        </div>
      ) : (
        <></>
      )}
    </div>
  );
};

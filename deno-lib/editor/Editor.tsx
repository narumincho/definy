/// <reference no-default-lib="true"/>
/// <reference lib="dom" />

import { React } from "../deps.ts";
import { c, toStyleAndHash } from "../cssInJs/mod.ts";
import { Button } from "../editor/Button.tsx";
import { jsonStringify, RawJsonValue } from "../typedJson.ts";
import { EnterIcon } from "./EnterIcon.tsx";
import { useEditorKeyInput } from "./useEditorKeyInput.ts";
import { useNotification } from "./useNotification.tsx";

export type Field = {
  readonly id: string;
  readonly name: string;
  readonly errorMessage: string | undefined;
  readonly body: FieldBody;
};

export type FieldBody =
  | {
    readonly type: "text";
    readonly value: string;
    readonly readonly: boolean;
    /**
     * 大きく値を表示するかどうか
     */
    readonly isTitle: boolean;
  }
  | {
    readonly type: "button";
    readonly value: (() => void) | undefined;
  }
  | {
    readonly type: "product";
    readonly value: ReadonlyArray<Field>;
    readonly readonly: boolean;
  };

const isFieldAvailable = (field: Field): boolean => {
  switch (field.body.type) {
    case "button":
      return field.body.value !== undefined;
    case "text":
    case "product": {
      return !field.body.readonly;
    }
  }
};

const containerStyle = toStyleAndHash({
  display: "grid",
  height: "100%",
  overflowY: "scroll",
});

const editorMainStyle = toStyleAndHash({
  gridColumn: "1 / 2",
  gridRow: "1 / 2",
});

const notificationStyle = toStyleAndHash({
  gridColumn: "1 / 2",
  gridRow: "1 / 2",
  justifySelf: "end",
  alignSelf: "end",
});

/**
 * 汎用エディタ
 */
export const Editor = (props: {
  readonly fields: ReadonlyArray<Field>;
  readonly onChange: (fieldId: string, newValue: string) => void;
}): React.ReactElement => {
  const [selectedFieldId, setSelectedFieldId] = React.useState<
    string | undefined
  >(props.fields[0]?.id);
  const [isEditing, setIsEditing] = React.useState<boolean>(false);

  const onStartEdit = React.useCallback(() => {
    console.log("onStartEdit", selectedFieldId);
    const selectedField = props.fields.find(
      (field) => field.id === selectedFieldId,
    );
    if (selectedField === undefined) {
      return;
    }
    switch (selectedField.body.type) {
      case "button":
        selectedField.body.value?.();
        return;
      case "text":
      case "product": {
        if (!selectedField.body.readonly) {
          setIsEditing(true);
        }
      }
    }
  }, [props.fields, selectedFieldId]);

  useEditorKeyInput({
    disabled: isEditing,
    onEnter: onStartEdit,
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
    <div className={c(containerStyle)}>
      <div className={c(editorMainStyle)}>
        {[...props.fields].map((field) => (
          <Field
            key={field.id}
            name={field.name}
            value={field.body}
            selected={selectedFieldId === field.id}
            isEditing={isEditing}
            errorMessage={field.errorMessage}
            onSelected={() => {
              console.log("onSelected", field.name);
              setSelectedFieldId(field.id);
              setIsEditing(false);
            }}
            onUnSelected={() => {
              console.log("onUnSelected", field.name);
              setSelectedFieldId(undefined);
            }}
            onStartEdit={field.body.type === "button" || field.body.readonly
              ? undefined
              : onStartEdit}
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
      <div className={c(notificationStyle)}>{notificationElement}</div>
    </div>
  );
};

const Field = (props: {
  readonly name: string;
  readonly value: FieldBody;
  readonly selected: boolean;
  readonly isEditing: boolean;
  readonly errorMessage: string | undefined;
  readonly onSelected: () => void;
  readonly onUnSelected: () => void;
  /**
   * 読み取り専用の場合は `undefined`
   */
  readonly onStartEdit: (() => void) | undefined;
  readonly onChange: (newText: string) => void;
  readonly onPaste: (text: string) => void;
  readonly onCopy: (text: string) => void;
}): React.ReactElement => {
  switch (props.value.type) {
    case "text":
      return (
        <TextField
          name={props.name}
          value={props.value.value}
          selected={props.selected}
          errorMessage={props.errorMessage}
          isEditing={props.isEditing}
          isTitle={props.value.isTitle}
          onChange={props.onChange}
          onCopy={props.onCopy}
          onPaste={props.onPaste}
          onSelected={props.onSelected}
          onStartEdit={props.onStartEdit}
          onUnSelected={props.onUnSelected}
        />
      );
    case "button":
      return (
        <ButtonField
          name={props.name}
          value={props.value.value}
          selected={props.selected}
          errorMessage={props.errorMessage}
          onChange={props.onChange}
          onCopy={props.onCopy}
          onPaste={props.onPaste}
          onSelected={props.onSelected}
          onUnSelected={props.onUnSelected}
        />
      );
    case "product":
      return (
        <ProductField
          name={props.name}
          value={props.value.value}
          selected={props.selected}
          errorMessage={props.errorMessage}
          onChange={props.onChange}
          onCopy={props.onCopy}
          onPaste={props.onPaste}
          onSelected={props.onSelected}
          onStartEdit={props.onStartEdit}
          onUnSelected={props.onUnSelected}
        />
      );
  }
};

const textFieldEnterIconContainer = toStyleAndHash({
  backgroundColor: "#444",
  padding: "0 8px",
  display: "flex",
  alignItems: "center",
  gap: 2,
});

const textFieldContainerOut = toStyleAndHash({
  paddingLeft: 8,
});

const textFieldContainerIn = toStyleAndHash({
  display: "flex",
  gap: 4,
});

const errorMessageStyle = toStyleAndHash({
  backgroundColor: "#d37171",
  color: "#000",
  padding: "0 4px",
});

const TextField = (props: {
  readonly name: string;
  readonly value: string;
  readonly selected: boolean;
  readonly isEditing: boolean;
  readonly errorMessage: string | undefined;
  readonly isTitle: boolean;
  readonly onSelected: () => void;
  readonly onUnSelected: () => void;
  /**
   * 読み取り専用の場合は `undefined`
   */
  readonly onStartEdit: (() => void) | undefined;
  readonly onChange: (newText: string) => void;
  readonly onPaste: (text: string) => void;
  readonly onCopy: (text: string) => void;
}) => {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (props.selected) {
      ref.current?.focus();
    }
  }, [props.selected, ref.current]);

  return (
    <div
      ref={ref}
      className={c(
        toStyleAndHash(
          {
            borderStyle: "solid",
            borderColor: props.selected ? "orange" : "transparent",
            borderRadius: 8,
            minHeight: 64,
            display: "grid",
          },
          {
            focus: {
              borderColor: "skyblue",
            },
          },
        ),
      )}
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
      <div className={c(textFieldContainerOut)}>
        <div className={c(textFieldContainerIn)}>
          {props.selected && props.isEditing
            ? (
              false
            )
            : (
              <TextFieldValue
                isError={props.errorMessage !== undefined}
                value={props.value}
                isTitle={props.isTitle}
                onStartEdit={props.onStartEdit}
              />
            )}
          {props.onStartEdit !== undefined &&
            props.selected &&
            !props.isEditing && (
            <div className={c(textFieldEnterIconContainer)}>
              <EnterIcon stroke="white" height={24} />
              編集
            </div>
          )}
          {props.errorMessage !== undefined && (
            <div className={c(errorMessageStyle)}>{props.errorMessage}</div>
          )}
        </div>
        {props.selected && props.isEditing && (
          <StyledInput
            value={props.value}
            onSubmit={props.onChange}
            onCopy={props.onCopy}
            onPaste={props.onPaste}
          />
        )}
      </div>
    </div>
  );
};

const buttonFieldIconContainerStyle = toStyleAndHash({
  display: "flex",
  alignItems: "center",
  gap: 8,
});

const ButtonField = (props: {
  readonly name: string;
  readonly value: (() => void) | undefined;
  readonly selected: boolean;
  readonly errorMessage: string | undefined;
  readonly onSelected: () => void;
  readonly onUnSelected: () => void;
  readonly onChange: (newText: string) => void;
  readonly onPaste: (text: string) => void;
  readonly onCopy: (text: string) => void;
}) => {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (props.selected) {
      ref.current?.focus();
    }
  }, [props.selected, ref.current]);

  return (
    <div
      ref={ref}
      className={c(
        toStyleAndHash(
          {
            borderStyle: "solid",
            borderColor: props.selected ? "orange" : "transparent",
            borderRadius: 8,
            minHeight: 64,
            display: "grid",
          },
          {
            focus: {
              borderColor: "skyblue",
            },
          },
        ),
      )}
      onFocus={() => {
        props.onSelected();
      }}
      tabIndex={-1}
    >
      <div>
        <Button onClick={props.value}>
          <div className={c(buttonFieldIconContainerStyle)}>
            {props.selected && <EnterIcon stroke="white" height={24} />}
            <div>{props.name}</div>
          </div>
        </Button>
      </div>
    </div>
  );
};

const productFieldStyle = toStyleAndHash({
  paddingLeft: 8,
});

const productFieldErrorMessageContainerStyle = toStyleAndHash({
  display: "flex",
  gap: 4,
});

const productFieldErrorMessageStyle = toStyleAndHash({
  backgroundColor: "#d37171",
  color: "#000",
  padding: "0 4px",
});

const ProductField = (props: {
  readonly name: string;
  readonly value: ReadonlyArray<Field>;
  readonly selected: boolean;
  readonly errorMessage: string | undefined;
  readonly onSelected: () => void;
  readonly onUnSelected: () => void;
  /**
   * 読み取り専用の場合は `undefined`
   */
  readonly onStartEdit: (() => void) | undefined;
  readonly onChange: (newText: string) => void;
  readonly onPaste: (text: string) => void;
  readonly onCopy: (text: string) => void;
}) => {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (props.selected) {
      ref.current?.focus();
    }
  }, [props.selected, ref.current]);

  return (
    <div
      ref={ref}
      className={c(
        toStyleAndHash(
          {
            borderStyle: "solid",
            borderColor: props.selected ? "orange" : "transparent",
            borderRadius: 8,
            minHeight: 64,
            display: "grid",
          },
          {
            focus: {
              borderColor: "skyblue",
            },
          },
        ),
      )}
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
        const serialized = props.value.map(serializeField);
        e.clipboardData.setData("text", jsonStringify(serialized, true));
        console.log("div 内 でcopy. 中身:", props.value);
        props.onCopy(jsonStringify(serialized, true));
      }}
      tabIndex={-1}
    >
      <div>{props.name}</div>
      <div className={c(productFieldStyle)}>
        {props.value.map((field) => (
          <Field
            key={field.id}
            name={field.name}
            value={field.body}
            selected={false}
            isEditing={false}
            errorMessage={field.errorMessage}
            onSelected={() => {
              console.log("onSelected", field.name);
            }}
            onUnSelected={() => {}}
            onStartEdit={isFieldAvailable(field) ? () => {} : undefined}
            onChange={(newText) => {
              props.onChange(newText);
            }}
            onCopy={() => {}}
            onPaste={() => {}}
          />
        ))}
      </div>
      <div className={c(productFieldStyle)}>
        <div className={c(productFieldErrorMessageContainerStyle)}>
          {props.errorMessage !== undefined && (
            <div className={c(productFieldErrorMessageStyle)}>
              {props.errorMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const serializeField = (field: Field): RawJsonValue => {
  return {
    id: field.id,
    name: field.name,
    body: serializeBody(field.body),
  };
};

const serializeBody = (body: FieldBody): RawJsonValue => {
  switch (body.type) {
    case "text":
      return {
        type: "text",
        value: body.value,
      };
    case "button":
      return null;
    case "product":
      return { type: "text", value: body.value.map(serializeField) };
  }
};

const TextFieldValue = (props: {
  readonly value: string;
  readonly isError: boolean;
  readonly isTitle: boolean;
  /** 読み取り専用の場合は `undefined` */
  readonly onStartEdit: (() => void) | undefined;
}) => {
  if (props.isTitle) {
    return (
      <h2
        className={c(
          toStyleAndHash({
            whiteSpace: "pre-wrap",
            textDecoration: props.isError ? "underline wavy red" : "none",
            margin: 0,
            fontSize: 32,
          }),
        )}
        onClick={props.onStartEdit}
      >
        {props.value}
      </h2>
    );
  }
  return (
    <div
      className={c(
        toStyleAndHash({
          whiteSpace: "pre-wrap",
          textDecoration: props.isError ? "underline wavy red" : "none",
        }),
      )}
      onClick={props.onStartEdit}
    >
      {props.value}
    </div>
  );
};

const inputStyle = toStyleAndHash(
  {
    padding: 8,
    fontSize: 16,
    backgroundColor: "#222",
    border: "none",
    color: "#eee",
    borderRadius: 8,
    width: "100%",
  },
  {
    hover: {
      backgroundColor: "#333",
    },
  },
);

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
        className={c(inputStyle)}
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

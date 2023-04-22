import React from "https://esm.sh/react@18.2.0?pin=v117";
import { styled } from "https://esm.sh/@stitches/react@1.2.8?pin=v117";
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

const Container = styled("div", {
  display: "grid",
  height: "100%",
  overflowY: "scroll",
});

const StyledEditorMain = styled("div", {
  gridColumn: "1 / 2",
  gridRow: "1 / 2",
});

const StyledNotification = styled("div", {
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
    <Container>
      <StyledEditorMain>
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
      </StyledEditorMain>
      <StyledNotification>{notificationElement}</StyledNotification>
    </Container>
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

const TextFieldEnterIconContainer = styled("div", {
  backgroundColor: "#444",
  padding: "0 8px",
  display: "flex",
  alignItems: "center",
  gap: 2,
});

const TextFieldContainerOut = styled("div", {
  paddingLeft: 8,
});

const TextFieldContainerIn = styled("div", {
  display: "flex",
  gap: 4,
});

const StyledErrorMessage = styled("div", {
  backgroundColor: "#d37171",
  color: "#000",
  padding: "0 4px",
});

const StyledTextField = styled("div", {
  borderStyle: "solid",
  borderRadius: 8,
  minHeight: 64,
  display: "grid",
  "&:focus": {
    borderColor: "skyblue",
  },
  variants: {
    selected: {
      selected: {
        borderColor: "orange",
      },
      noSelected: {
        borderColor: "transparent",
      },
    },
  },
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
    <StyledTextField
      ref={ref}
      selected={props.selected ? "selected" : "noSelected"}
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
      <TextFieldContainerOut>
        <TextFieldContainerIn>
          {props.selected && props.isEditing ? <></> : (
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
            <TextFieldEnterIconContainer>
              <EnterIcon stroke="white" height={24} />
              編集
            </TextFieldEnterIconContainer>
          )}
          {props.errorMessage !== undefined && (
            <StyledErrorMessage>{props.errorMessage}</StyledErrorMessage>
          )}
        </TextFieldContainerIn>
        {props.selected && props.isEditing && (
          <StyledInput
            value={props.value}
            onSubmit={props.onChange}
            onCopy={props.onCopy}
            onPaste={props.onPaste}
          />
        )}
      </TextFieldContainerOut>
    </StyledTextField>
  );
};

const StyledButtonFieldIconContainer = styled("div", {
  display: "flex",
  alignItems: "center",
  gap: 8,
});

const ButtonFieldContainer = styled("div", {
  borderStyle: "solid",
  borderRadius: 8,
  minHeight: 64,
  display: "grid",
  "&:focus": {
    borderColor: "skyblue",
  },
  variants: {
    selected: {
      select: {
        borderColor: "orange",
      },
      noSelect: {
        borderColor: "transparent",
      },
    },
  },
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
    <ButtonFieldContainer
      ref={ref}
      selected={props.selected ? "select" : "noSelect"}
      onFocus={() => {
        props.onSelected();
      }}
      tabIndex={-1}
    >
      <div>
        <Button onClick={props.value}>
          <StyledButtonFieldIconContainer>
            {props.selected ? <EnterIcon stroke="white" height={24} /> : <></>}
            <div>{props.name}</div>
          </StyledButtonFieldIconContainer>
        </Button>
      </div>
    </ButtonFieldContainer>
  );
};

const StyledProductField = styled("div", {
  paddingLeft: 8,
});

const ProductFieldErrorMessageContainer = styled("div", {
  display: "flex",
  gap: 4,
});

const ProductFieldErrorMessage = styled("div", {
  backgroundColor: "#d37171",
  color: "#000",
  padding: "0 4px",
});

const ProductFieldContainer = styled("div", {
  borderStyle: "solid",
  borderRadius: 8,
  minHeight: 64,
  display: "grid",
  "&:focus": {
    borderColor: "skyblue",
  },
  variants: {
    selected: {
      select: {
        borderColor: "orange",
      },
      noSelect: {
        borderColor: "transparent",
      },
    },
  },
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
    <ProductFieldContainer
      ref={ref}
      selected={props.selected ? "select" : "noSelect"}
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
      <StyledProductField>
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
      </StyledProductField>
      <StyledProductField>
        <ProductFieldErrorMessageContainer>
          {props.errorMessage !== undefined && (
            <ProductFieldErrorMessage>
              {props.errorMessage}
            </ProductFieldErrorMessage>
          )}
        </ProductFieldErrorMessageContainer>
      </StyledProductField>
    </ProductFieldContainer>
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

const TextFieldValueContainerTitle = styled("h2", {
  whiteSpace: "pre-wrap",
  margin: 0,
  fontSize: 32,
  variants: {
    error: {
      error: {
        textDecoration: "underline wavy red",
      },
      noError: {
        textDecoration: "none",
      },
    },
  },
});

const TextFieldValueContainer = styled("div", {
  fontFamily: "Hack",
  whiteSpace: "pre-wrap",
  variants: {
    error: {
      error: {
        textDecoration: "underline wavy red",
      },
      noError: {
        textDecoration: "none",
      },
    },
  },
});

const TextFieldValue = (props: {
  readonly value: string;
  readonly isError: boolean;
  readonly isTitle: boolean;
  /** 読み取り専用の場合は `undefined` */
  readonly onStartEdit: (() => void) | undefined;
}) => {
  if (props.isTitle) {
    return (
      <TextFieldValueContainerTitle
        error={props.isError ? "error" : "noError"}
        onClick={props.onStartEdit}
      >
        {props.value}
      </TextFieldValueContainerTitle>
    );
  }
  return (
    <TextFieldValueContainer
      error={props.isError ? "error" : "noError"}
      onClick={props.onStartEdit}
    >
      {props.value}
    </TextFieldValueContainer>
  );
};

const StyledInputDiv = styled("input", {
  fontFamily: "Hack",
  padding: 8,
  fontSize: 16,
  backgroundColor: "#222",
  border: "none",
  color: "#eee",
  borderRadius: 8,
  width: "100%",
  "&:hover": {
    backgroundColor: "#333",
  },
});

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
      <StyledInputDiv
        type="text"
        value={editingText}
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

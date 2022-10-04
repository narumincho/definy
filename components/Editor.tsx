import * as React from "react";
import { OneLineTextEditor } from "../client/ui/OneLineTextEditor";

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
  readonly onSelect: () => void;
}): React.ReactElement => {
  const [hoverFieldName, setHoverFieldName] = React.useState<
    string | undefined
  >(undefined);
  const [selectedName, setSelectedName] = React.useState<string | undefined>();
  const [isEditMode, setIsEditMode] = React.useState<boolean>(false);

  React.useEffect(() => {
    const handleKeyEvent = (e: KeyboardEvent) => {
      if (e.code === "Enter") {
        setIsEditMode(true);
      }
      console.log(e.code);
    };
    document.addEventListener("keydown", handleKeyEvent);

    return () => {
      document.removeEventListener("keydown", handleKeyEvent);
    };
  }, []);

  return (
    <div>
      {props.fields.map((field) => (
        <div
          key={field.name}
          css={{
            borderStyle: "solid",
            borderColor: selectedName === field.name ? "orange" : "transparent",
            borderRadius: 8,
          }}
          onFocus={() => {
            setSelectedName(field.name);
            setIsEditMode(false);
          }}
          tabIndex={-1}
        >
          <div
            onPointerEnter={() => {
              setHoverFieldName(field.name);
            }}
            onPointerLeave={() => {
              setHoverFieldName(undefined);
            }}
          >
            {field.name}
          </div>
          {hoverFieldName === field.name ? (
            <div css={{ position: "absolute", backgroundColor: "gray" }}>
              {field.description}
            </div>
          ) : (
            <></>
          )}
          {selectedName === field.name && isEditMode ? (
            <form
              onSubmit={() => {
                setIsEditMode(false);
              }}
            >
              <input type="text" value={field.body.value} onChange={() => {}} />
            </form>
          ) : (
            <div css={{ whiteSpace: "pre-wrap" }}>{field.body.value}</div>
          )}
        </div>
      ))}
    </div>
  );
};

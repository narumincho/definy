import * as React from "react";

export const Select = (props: {
  readonly values: ReadonlyArray<string> | undefined;
  readonly value: string | undefined;
  readonly onSelect: (value: string) => void;
}): React.ReactElement => {
  const [isFocus, setIsFocus] = React.useState<boolean>(false);
  const [inputText, setInputText] = React.useState<string>("");
  const divElementRef = React.useRef<HTMLDivElement>(null);
  const inputElementRef = React.useRef<HTMLInputElement>(null);

  const onFocus = React.useCallback<React.FocusEventHandler<HTMLDivElement>>(
    (e) => {
      if (e.target !== divElementRef.current) {
        return;
      }
      setIsFocus(true);
      const text = props.value ?? "";
      setInputText(text);
      requestAnimationFrame(() => {
        if (inputElementRef.current !== null) {
          inputElementRef.current.focus();
          inputElementRef.current.setSelectionRange(0, text.length);
        }
      });
    },
    []
  );

  return (
    <div
      onFocus={onFocus}
      tabIndex={-1}
      ref={divElementRef}
      css={{
        display: "grid",
        borderStyle: "solid",
        borderColor: "white",
        borderRadius: 8,
      }}
    >
      {isFocus ? (
        <input
          ref={inputElementRef}
          type="text"
          onBlur={() => {
            setIsFocus(false);
          }}
          value={inputText}
          onChange={(e) => {
            console.log("input", e.target.value);
            setInputText(e.target.value);
          }}
        />
      ) : (
        <div>{props.value}</div>
      )}
      {isFocus ? (
        <Suggestion value={props.value} values={props.values} />
      ) : (
        <></>
      )}
    </div>
  );
};

const Suggestion = (props: {
  readonly values: ReadonlyArray<string> | undefined;
  readonly value: string | undefined;
}) => {
  if (props.values === undefined) {
    return <div>loading...</div>;
  }
  if (props.values.length === 0) {
    return <div>候補なし</div>;
  }
  return (
    <div>
      {props.values.map((v) => (
        <div key={v}>{v}</div>
      ))}
    </div>
  );
};

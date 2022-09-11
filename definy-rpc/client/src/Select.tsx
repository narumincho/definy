import * as React from "react";

export const Select = (props: {
  readonly values: ReadonlyArray<string> | undefined;
  readonly value: string | undefined;
  readonly onSelect: (value: string) => void;
}): React.ReactElement => {
  const [isFocus, setIsFocus] = React.useState<boolean>(false);
  const [inputText, setInputText] = React.useState<string>("");

  const onFocus = React.useCallback(() => {
    setIsFocus(true);
    setInputText(props.value ?? "");
  }, []);

  return (
    <div
      onFocus={onFocus}
      tabIndex={-1}
      css={{
        display: "grid",
        borderStyle: "solid",
        borderColor: "white",
        borderRadius: 8,
      }}
    >
      {isFocus ? (
        <input
          autoFocus
          type="text"
          onBlur={() => {
            setIsFocus(false);
          }}
          value={inputText}
          onChange={(e) => {
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

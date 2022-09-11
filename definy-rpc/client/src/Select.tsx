import * as React from "react";

export const Select = (props: {
  readonly values: ReadonlyArray<string> | undefined;
  readonly value: string | undefined;
  readonly onSelect: (value: string | undefined) => void;
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

  const onInput = React.useCallback<React.ChangeEventHandler<HTMLInputElement>>(
    (e) => {
      const newInputText = e.target.value;
      setInputText(newInputText);
      if (props.values === undefined) {
        return;
      }
      props.onSelect(
        createSuggestionSorted({
          values: props.values,
          inputText: newInputText,
        })[0]?.value
      );
    },
    [props.onSelect]
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
          onChange={onInput}
        />
      ) : (
        <div>{props.value}</div>
      )}
      {isFocus ? (
        <Suggestion
          value={props.value}
          values={props.values}
          inputText={inputText}
        />
      ) : (
        <></>
      )}
    </div>
  );
};

const Suggestion = (props: {
  readonly values: ReadonlyArray<string> | undefined;
  readonly value: string | undefined;
  readonly inputText: string;
}) => {
  if (props.values === undefined) {
    return <div>loading...</div>;
  }
  if (props.values.length === 0) {
    return <div>候補なし</div>;
  }
  const suggestionList = createSuggestionSorted({
    values: props.values,
    inputText: props.inputText,
  });
  return (
    <div>
      {suggestionList.map((v) => (
        <div
          key={v.value}
          css={{
            backgroundColor: v.value === props.value ? "#511" : "transparent",
          }}
        >
          {v.text.map((s, index) => (
            <span
              key={index}
              css={{
                color: s.emphasis ? "#faa" : "white",
              }}
            >
              {s.text}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
};

const createSuggestionSorted = (parameter: {
  readonly values: ReadonlyArray<string>;
  readonly inputText: string;
}): ReadonlyArray<{
  readonly value: string;
  readonly text: ReadonlyArray<{
    readonly text: string;
    readonly emphasis: boolean;
  }>;
  readonly point: number;
}> => {
  const result = [...createSuggestionWithPoint(parameter)];
  result.sort((a, b) => b.point - a.point);
  return result;
};

const createSuggestionWithPoint = (parameter: {
  readonly values: ReadonlyArray<string>;
  readonly inputText: string;
}): ReadonlyArray<{
  readonly value: string;
  readonly text: ReadonlyArray<{
    readonly text: string;
    readonly emphasis: boolean;
  }>;
  readonly point: number;
}> => {
  const normalizedSearchText = parameter.inputText.trim().toLocaleLowerCase();
  return parameter.values.map((value) => {
    const includeIndex = value
      .toLocaleLowerCase()
      .indexOf(normalizedSearchText);
    if (includeIndex === -1) {
      return {
        value,
        text: [{ text: value, emphasis: false }],
        point: 0,
      };
    }
    return {
      value,
      text: [
        { text: value.slice(0, includeIndex), emphasis: false },
        {
          text: value.slice(
            includeIndex,
            includeIndex + normalizedSearchText.length
          ),
          emphasis: true,
        },
        {
          text: value.slice(includeIndex + normalizedSearchText.length),
          emphasis: false,
        },
      ],
      point:
        value.length -
        normalizedSearchText.length +
        value.length -
        includeIndex,
    };
  });
};

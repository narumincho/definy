import * as React from "react";

export const Select = (props: {
  readonly values: ReadonlyArray<string> | undefined;
  readonly value: string | undefined;
  readonly onSelect: (value: string | undefined) => void;
}): React.ReactElement => {
  const [isFocus, setIsFocus] = React.useState<boolean>(false);

  const onBlur = React.useCallback(() => {
    setIsFocus(false);
  }, []);

  if (isFocus) {
    return (
      <SelectActive
        values={props.values}
        value={props.value}
        onSelect={props.onSelect}
        onBlur={onBlur}
      />
    );
  }
  return (
    <div
      onFocus={() => {
        setIsFocus(true);
      }}
      tabIndex={-1}
      css={{
        display: "grid",
        borderStyle: "solid",
        borderColor: "white",
        borderRadius: 8,
      }}
    >
      <div>{props.value}</div>
    </div>
  );
};

const SelectActive = (props: {
  readonly values: ReadonlyArray<string> | undefined;
  readonly value: string | undefined;
  readonly onSelect: (value: string | undefined) => void;
  readonly onBlur: () => void;
}): React.ReactElement => {
  const [inputText, setInputText] = React.useState<string>(props.value ?? "");
  const inputElementRef = React.useRef<HTMLInputElement>(null);
  const [initValue] = React.useState<string | undefined>(props.value);

  React.useEffect(() => {
    inputElementRef.current?.setSelectionRange(0, inputText.length);
  }, [inputElementRef.current]);

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
      css={{
        display: "grid",
        borderStyle: "solid",
        borderColor: "white",
        borderRadius: 8,
      }}
    >
      <input
        autoFocus
        ref={inputElementRef}
        type="text"
        css={{
          fontFamily: "monospace",
          fontSize: 18,
        }}
        onBlur={() => {
          props.onBlur();
        }}
        value={inputText}
        onChange={onInput}
        onKeyDown={(e) => {
          console.log(e.key);
          if (e.key === "ArrowDown") {
            if (props.values === undefined) {
              return;
            }
            const list = createSuggestionSorted({
              values: props.values,
              inputText,
            });
            const index = list.findIndex((s) => s.value === props.value);

            const newValue = list[(index + 1) % list.length]?.value;
            if (newValue !== undefined) {
              props.onSelect(newValue);
            }
          }
          if (e.key === "ArrowUp") {
            if (props.values === undefined) {
              return;
            }
            const list = createSuggestionSorted({
              values: props.values,
              inputText,
            });
            const index = list.findIndex((s) => s.value === props.value);
            const newValue =
              list[(index - 1 + list.length) % list.length]?.value;
            if (newValue !== undefined) {
              props.onSelect(newValue);
            }
          }
          if (e.key === "Enter") {
            props.onBlur();
          }
          if (e.key === "Escape") {
            props.onSelect(initValue);
            props.onBlur();
          }
        }}
      />
      <Suggestion
        value={props.value}
        values={props.values}
        inputText={inputText}
      />
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
            fontFamily: "monospace",
            fontSize: 18,
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

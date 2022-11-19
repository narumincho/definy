import React from "https://esm.sh/react@18.2.0?pin=v99";
import { FunctionDetail } from "../generated/definyRpc.ts";
import { c, toStyleAndHash } from "../../cssInJs/mod.ts";

const readonlyStyle = toStyleAndHash({
  display: "grid",
  borderStyle: "solid",
  borderColor: "white",
  borderRadius: 8,
  fontFamily: "monospace",
  fontSize: 18,
  padding: "4px 8px",
});

const containerStyle = toStyleAndHash({
  display: "grid",
  borderStyle: "solid",
  borderColor: "white",
  borderRadius: 8,
});

const inputStyle = toStyleAndHash({
  fontFamily: "monospace",
  fontSize: 18,
  padding: "0 8px",
  backgroundColor: "#000",
  color: "white",
});

const suggestionContainerStyle = toStyleAndHash({
  display: "grid",
  gap: 1,
});

const suggestionItemStyle = toStyleAndHash({
  fontFamily: "monospace",
  fontSize: 18,
  textAlign: "left",
  cursor: "pointer",
});

export const Select = (props: {
  readonly values: ReadonlyArray<FunctionDetail> | undefined;
  readonly value: string | undefined;
  readonly onSelect: (value: string | undefined) => void;
}): React.ReactElement => {
  const [isFocus, setIsFocus] = React.useState<boolean>(false);

  const onBlur = React.useCallback(
    (value: string | undefined) => {
      props.onSelect(value);
      setIsFocus(false);
    },
    [props.onSelect],
  );

  if (isFocus) {
    return (
      <SelectActive
        values={props.values}
        value={props.value}
        onSelect={props.onSelect}
        onSelectAndExit={onBlur}
      />
    );
  }
  return (
    <div
      onFocus={() => {
        setIsFocus(true);
      }}
      tabIndex={-1}
      className={c(readonlyStyle)}
    >
      <div>{props.value ?? "???"}</div>
    </div>
  );
};

const SelectActive = (props: {
  readonly values: ReadonlyArray<FunctionDetail> | undefined;
  readonly value: string | undefined;
  readonly onSelect: (value: string | undefined) => void;
  readonly onSelectAndExit: (value: string | undefined) => void;
}): React.ReactElement => {
  const [inputText, setInputText] = React.useState<string>(props.value ?? "");
  const inputElementRef = React.useRef<HTMLInputElement>(null);
  const [initValue] = React.useState<string | undefined>(props.value);
  const [suggestionList, setSuggestionList] = React.useState<SuggestionList>(
    createSuggestionSorted({ values: props.values ?? [], inputText }),
  );

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
      const newSuggestionList = createSuggestionSorted({
        values: props.values,
        inputText: newInputText,
      });
      setSuggestionList(newSuggestionList);
      props.onSelect(newSuggestionList[0]?.value);
    },
    [props.onSelect],
  );

  return (
    <div className={c(containerStyle)}>
      <input
        autoFocus
        ref={inputElementRef}
        type="text"
        className={c(inputStyle)}
        value={inputText}
        onChange={onInput}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            if (props.values === undefined) {
              return;
            }
            const index = suggestionList.findIndex(
              (s) => s.value === props.value,
            );

            const newValue = suggestionList[(index + 1) % suggestionList.length]
              ?.value;
            if (newValue !== undefined) {
              props.onSelect(newValue);
              setInputText(newValue);
            }
          }
          if (e.key === "ArrowUp") {
            if (props.values === undefined) {
              return;
            }

            const index = suggestionList.findIndex(
              (s) => s.value === props.value,
            );
            const newValue = suggestionList[
              (index - 1 + suggestionList.length) % suggestionList.length
            ]?.value;
            if (newValue !== undefined) {
              props.onSelect(newValue);
              setInputText(newValue);
            }
          }
          if (e.key === "Enter") {
            props.onSelectAndExit(props.value);
          }
          if (e.key === "Escape") {
            props.onSelectAndExit(initValue);
          }
        }}
      />
      <Suggestion
        value={props.value}
        suggestionList={props.values === undefined ? undefined : suggestionList}
        inputText={inputText}
        onSelect={props.onSelectAndExit}
      />
    </div>
  );
};

const Suggestion = (props: {
  readonly suggestionList: SuggestionList | undefined;
  readonly value: string | undefined;
  readonly inputText: string;
  readonly onSelect: (value: string) => void;
}) => {
  if (props.suggestionList === undefined) {
    return <div>loading...</div>;
  }
  if (props.suggestionList.length === 0) {
    return <div>候補なし</div>;
  }
  return (
    <div className={c(suggestionContainerStyle)}>
      {props.suggestionList.map((v) => (
        <button
          key={v.value}
          className={c(
            toStyleAndHash({
              backgroundColor: v.value === props.value ? "#511" : "transparent",
              fontFamily: "monospace",
              fontSize: 18,
              textAlign: "left",
              cursor: "pointer",
              ...(v.value === props.value ? {} : {
                ":hover": {
                  backgroundColor: "#333",
                },
              }),
            }),
          )}
          onClick={() => {
            props.onSelect(v.value);
          }}
        >
          {v.text.map((s, index) => (
            <span
              key={index}
              className={c(
                toStyleAndHash({
                  color: s.emphasis ? "#faa" : "white",
                  fontWeight: s.emphasis ? "bold" : "normal",
                }),
              )}
            >
              {s.text}
            </span>
          ))}
        </button>
      ))}
    </div>
  );
};

type SuggestionList = ReadonlyArray<SuggestionItem>;

type SuggestionItem = {
  readonly value: string;
  readonly text: ReadonlyArray<{
    readonly text: string;
    readonly emphasis: boolean;
  }>;
  readonly point: number;
};

const createSuggestionSorted = (parameter: {
  readonly values: ReadonlyArray<FunctionDetail>;
  readonly inputText: string;
}): SuggestionList => {
  const result = [...createSuggestionWithPoint(parameter)];
  result.sort((a, b) => b.point - a.point);
  return result;
};

const createSuggestionWithPoint = (parameter: {
  readonly values: ReadonlyArray<FunctionDetail>;
  readonly inputText: string;
}): SuggestionList => {
  const normalizedSearchText = parameter.inputText.trim().toLocaleLowerCase();
  return parameter.values.map((value): SuggestionItem => {
    const name = value.name.join(".");
    const includeIndex = name.toLocaleLowerCase().indexOf(normalizedSearchText);
    if (includeIndex === -1) {
      return {
        value: name,
        text: [{ text: name, emphasis: false }],
        point: 0,
      };
    }
    return {
      value: name,
      text: [
        { text: name.slice(0, includeIndex), emphasis: false },
        {
          text: name.slice(
            includeIndex,
            includeIndex + normalizedSearchText.length,
          ),
          emphasis: true,
        },
        {
          text: name.slice(includeIndex + normalizedSearchText.length),
          emphasis: false,
        },
      ],
      point: name.length - normalizedSearchText.length + name.length -
        includeIndex,
    };
  });
};

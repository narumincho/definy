import * as React from "react";
import { CSSObject, css } from "@emotion/css";

export type UseOneLineTextEditorResult = {
  text: string;
  element: () => React.ReactElement;
};

/**
 * 1行のテキストエディタ
 *
 * 入力した内容を強制的に変更しない普通の用途にはこれを使う
 * @param id 入力欄を区別するID
 */
export const useOneLineTextEditor = (option: {
  initText: string;
  id: string;
  style?: CSSObject;
}): UseOneLineTextEditorResult => {
  const [text, setText] = React.useState<string>(option.initText);
  const element = (): React.ReactElement => {
    return (
      <OneLineTextEditor
        value={text}
        onChange={setText}
        id={option.id}
        style={option.style}
      />
    );
  };
  return {
    text,
    element,
  };
};

/**
 * 1行のテキストエディタ
 *
 * 文字の変更を検知しないなら, `useOneLineTextEditor` を使うと良い
 */
export const OneLineTextEditor: React.FC<{
  value: string;
  onChange: ((value: string) => void) | undefined;
  id: string;
  style?: CSSObject | undefined;
  placeholder?: string | undefined;
}> = React.memo((props) => (
  <input
    type="text"
    value={props.value}
    placeholder={props.placeholder}
    className={css(
      {
        padding: 8,
        fontSize: 16,
        border: "2px solid #444",
        backgroundColor: "#222",
        color: "#eee",
        borderRadius: 8,
        width: "100%",
        ":focus": {
          border: "2px solid #f0932b",
          outline: "none",
        },
        ":hover": {
          backgroundColor: "#333",
        },
      },
      props.style
    )}
    id={props.id}
    onKeyDown={(e) => {
      e.stopPropagation();
    }}
    readOnly={props.onChange === undefined}
    onChange={(e) => {
      if (props.onChange !== undefined) {
        props.onChange(e.target.value);
      }
    }}
  />
));
OneLineTextEditor.displayName = "OneLineTextEditor";

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
  id: string;
  style?: CSSObject;
}): UseOneLineTextEditorResult => {
  const [text, setText] = React.useState<string>("");
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
 * 基本的に `useOneLineTextEditor` を使うと良い
 */
export const OneLineTextEditor: React.VFC<{
  value: string;
  onChange: (value: string) => void;
  id: string;
  style?: CSSObject;
}> = (props) => (
  <input
    type="text"
    value={props.value}
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
    onChange={(e) => {
      props.onChange(e.target.value);
    }}
  />
);

import React from "https://esm.sh/react@18.2.0?pin=v106";
import { styled } from "./style.ts";

const EditorBox = styled("div", {
  height: 300,
  width: 600,
  border: "solid red 2px",
});

export const CodeEditor = (): React.ReactElement => {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const div = ref.current;
    if (div === null) {
      return;
    }
    require.config({
      paths: {
        "vs": "https://cdn.bootcdn.net/ajax/libs/monaco-editor/0.35.0/min/vs",
      },
    });

    require(["vs/editor/editor.main"], () => {
      if (globalThis.Deno !== undefined) {
        return;
      }
      console.log("monaco!", window.monaco);
      const editor = window.monaco.editor.create(div, {
        value: "console.log('sample code')",
        language: "typescript",
      });
      console.log("editor", editor);
    });
  }, [ref.current]);

  return <EditorBox ref={ref} />;
};

declare global {
  // deno-lint-ignore no-var
  var monaco: {
    editor: {
      create: (a: HTMLElement, b: {}) => void;
    };
  };
  // deno-lint-ignore no-var
  var require: {
    config: (a: unknown) => void;
    (a: ReadonlyArray<string>, loaded: () => void): void;
  };
}

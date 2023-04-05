import React from "https://esm.sh/react@18.2.0?pin=v111";
import { styled } from "./style.ts";
import monaco from "npm:monaco-editor@0.36.1";

const EditorBox = styled("div", {
  height: 500,
  width: 700,
  border: "solid red 2px",
});

const state: { created: boolean } = {
  created: false,
};

export const CodeEditor = (): React.ReactElement => {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const div = ref.current;
    if (div === null) {
      return;
    }
    const require = (globalThis as unknown as {
      readonly require: {
        readonly config: (a: unknown) => void;
        (a: ReadonlyArray<string>, loaded: () => void): void;
      };
    }).require;
    require.config({
      paths: {
        "vs": "https://cdn.bootcdn.net/ajax/libs/monaco-editor/0.36.1/min/vs",
      },
    });

    require(["vs/editor/editor.main"], () => {
      if (state.created) {
        return;
      }
      state.created = true;
      const monaco = (globalThis as unknown as {
        readonly monaco: {
          readonly languages: any;
          readonly editor: {
            create: (a: HTMLElement, b: {
              readonly value: string;
              readonly language: "typescript";
              readonly theme: "vs-dark";
            }) => void;
          };
        };
      }).monaco;
      console.log("monaco!", monaco);
      const editor = monaco.editor.create(div, {
        value: "console.log('sample code')",
        language: "typescript",
        theme: "vs-dark",
      });
      console.log("editor", editor);
      monaco.languages.typescript.javascriptDefaults.addExtraLib(
        `declare global {
        const sampleType = "sorean";
      }
      `,
        "file:///node_modules/@types/math/index.d.ts",
      );
    });
  }, [ref.current]);

  return <EditorBox ref={ref} />;
};

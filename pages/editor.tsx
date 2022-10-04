import * as React from "react";
import { Editor } from "../components/Editor";
import { WithHeader } from "../components/WithHeader";
import { useAccountToken } from "../hooks/useAccountToken";
import { useLanguage } from "../hooks/useLanguage";

const EditorPage = (): React.ReactElement => {
  const language = useLanguage();
  const useAccountTokenResult = useAccountToken();

  return (
    <WithHeader
      title={{
        japanese: "汎用エディタテスト",
        english: "Generic editor test",
        esperanto: "Ĝenerala redaktisto-testo",
      }}
      language={language}
      useAccountTokenResult={useAccountTokenResult}
      titleItemList={[]}
      location={{ type: "dev" }}
    >
      <SampleEditor />
    </WithHeader>
  );
};

const SampleEditor = (): React.ReactElement => {
  return (
    <Editor
      fields={[
        {
          name: "textField",
          description: "テキストフィールド!",
          body: {
            type: "text",
            value: "ああああ",
          },
        },
        {
          name: "textField2",
          description: "本当に抽象エディタは必要なのだろうか",
          body: {
            type: "text",
            value: "sorena",
          },
        },
      ]}
      onSelect={() => {
        console.log("onSelect");
      }}
    />
  );
};

export default EditorPage;

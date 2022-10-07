import * as React from "react";
import { Editor } from "../components/Editor";
import { WithHeader } from "../components/WithHeader";
import { useAccountToken } from "../client/hook/useAccountToken";
import { useLanguage } from "../client/hook/useLanguage";

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
  const [textFieldValue, setTextFieldValue] = React.useState("ああああ");

  return (
    <Editor
      fields={[
        {
          name: "textField",
          description: "テキストフィールド!",
          body: {
            type: "text",
            value: textFieldValue,
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
      onChange={(fieldName, newValue) => {
        if (fieldName === "textField") {
          setTextFieldValue(newValue);
        }
      }}
    />
  );
};

export default EditorPage;

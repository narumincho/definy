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
      <div css={{ padding: 8, height: "100%" }}>
        <SampleEditor />
      </div>
    </WithHeader>
  );
};

const SampleEditor = (): React.ReactElement => {
  const [textFieldValue, setTextFieldValue] = React.useState("ああああ");

  return (
    <Editor
      fields={[
        {
          id: "textField",
          name: "テキストフィールド",
          readonly: false,
          body: {
            type: "text",
            value: textFieldValue,
          },
        },
        {
          id: "textFieldReadonly",
          name: "読み取り専用テキストフィールド",
          readonly: true,
          body: {
            type: "text",
            value: "それな",
          },
        },
      ]}
      onChange={(fieldName, newValue) => {
        console.log("変更が届いた", fieldName, newValue);
        if (fieldName === "textField") {
          setTextFieldValue(newValue);
        }
      }}
    />
  );
};

export default EditorPage;

import * as React from "react";
import { Editor } from "../components/Editor";
import { WithHeader } from "../components/WithHeader";
import { useAccountToken } from "../client/hook/useAccountToken";
import { useLanguage } from "../client/hook/useLanguage";

const textFieldAId = "textFieldA";
const textFieldBId = "textFieldB";

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
          id: textFieldAId,
          name: "テキストフィールドA",
          readonly: false,
          errorMessage: undefined,
          isTitle: false,
          body: {
            type: "text",
            value: textFieldValue,
          },
        },
        {
          id: textFieldBId,
          name: "テキストフィールドB (Aと常に同じ値)",
          readonly: false,
          errorMessage: undefined,
          isTitle: false,
          body: {
            type: "text",
            value: textFieldValue,
          },
        },
        {
          id: "textFieldReadonly",
          name: "読み取り専用テキストフィールド",
          readonly: true,
          errorMessage: undefined,
          isTitle: false,
          body: {
            type: "text",
            value: "それな",
          },
        },
        {
          id: "withErrorField",
          name: "エラーメッセージがあるフィールド",
          readonly: false,
          errorMessage: "カスタムエラーメッセージ",
          isTitle: false,
          body: {
            type: "text",
            value: "条件を満たさない値",
          },
        },
        {
          id: "titleField",
          name: "タイトル要素. 大きく値を表示する",
          readonly: false,
          errorMessage: undefined,
          isTitle: true,
          body: {
            type: "text",
            value: "サンプルタイトル",
          },
        },
        {
          id: "product",
          name: "子要素テスト",
          readonly: false,
          errorMessage: undefined,
          isTitle: true,
          body: {
            type: "product",
            value: [
              {
                id: "a",
                name: "a",
                body: {
                  type: "text",
                  value: "aValue",
                },
                errorMessage: undefined,
                isTitle: false,
                readonly: false,
              },
              {
                id: "b",
                name: "子要素テスト",
                readonly: false,
                errorMessage: undefined,
                isTitle: true,
                body: {
                  type: "product",
                  value: [
                    {
                      id: "a",
                      name: "a",
                      body: {
                        type: "text",
                        value: "aValue",
                      },
                      errorMessage: undefined,
                      isTitle: false,
                      readonly: false,
                    },
                    {
                      id: "b",
                      name: "b",
                      body: {
                        type: "text",
                        value: "bValue",
                      },
                      errorMessage: undefined,
                      isTitle: false,
                      readonly: false,
                    },
                  ],
                },
              },
              {
                id: "c",
                name: "c",
                body: {
                  type: "text",
                  value: "cValue",
                },
                errorMessage: undefined,
                isTitle: false,
                readonly: false,
              },
            ],
          },
        },
      ]}
      onChange={(fieldId, newValue) => {
        console.log("変更が届いた", fieldId, newValue);
        if (fieldId === textFieldAId || fieldId === textFieldBId) {
          setTextFieldValue(newValue);
        }
      }}
    />
  );
};

export default EditorPage;

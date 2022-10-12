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
          errorMessage: undefined,
          body: {
            type: "text",
            value: textFieldValue,
            readonly: false,
            isTitle: false,
          },
        },
        {
          id: textFieldBId,
          name: "テキストフィールドB (Aと常に同じ値)",
          errorMessage: undefined,
          body: {
            type: "text",
            value: textFieldValue,
            isTitle: false,
            readonly: false,
          },
        },
        {
          id: "textFieldReadonly",
          name: "読み取り専用テキストフィールド",
          errorMessage: undefined,
          body: {
            type: "text",
            value: "それな",
            readonly: true,
            isTitle: false,
          },
        },
        {
          id: "withErrorField",
          name: "エラーメッセージがあるフィールド",
          errorMessage: "カスタムエラーメッセージ",
          body: {
            type: "text",
            value: "条件を満たさない値",
            readonly: false,
            isTitle: false,
          },
        },
        {
          id: "titleField",
          name: "タイトル要素. 大きく値を表示する",
          errorMessage: undefined,
          body: {
            type: "text",
            value: "サンプルタイトル",
            readonly: false,
            isTitle: true,
          },
        },
        {
          id: "product",
          name: "子要素テスト",
          errorMessage: undefined,
          body: {
            type: "product",
            readonly: false,
            value: [
              {
                id: "a",
                name: "a",
                body: {
                  type: "text",
                  value: "aValue",
                  isTitle: false,
                  readonly: false,
                },
                errorMessage: undefined,
              },
              {
                id: "b",
                name: "子要素テスト",
                errorMessage: undefined,
                body: {
                  type: "product",
                  readonly: false,
                  value: [
                    {
                      id: "a",
                      name: "a",
                      body: {
                        type: "text",
                        value: "aValue",
                        isTitle: false,
                        readonly: false,
                      },
                      errorMessage: undefined,
                    },
                    {
                      id: "b",
                      name: "b",
                      body: {
                        type: "text",
                        value: "bValue",
                        isTitle: false,
                        readonly: false,
                      },
                      errorMessage: undefined,
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
                  isTitle: false,
                  readonly: false,
                },
                errorMessage: undefined,
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

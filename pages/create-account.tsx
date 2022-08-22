import * as React from "react";
import { Language } from "../common/zodType";
import { WithHeader } from "../components/WithHeader";
import { useQueryBasedState } from "../hooks/useQueryBasedState";

type NameAndImageUrl = {
  readonly name: string;
  readonly imageUrl: URL;
  readonly language: Language;
};

const nameAndImageUrlEqual = (
  a: NameAndImageUrl | undefined,
  b: NameAndImageUrl | undefined
): boolean => {
  if (a === undefined && b === undefined) {
    return true;
  }
  return (
    a?.name === b?.name &&
    a?.imageUrl.toString() === b?.imageUrl.toString() &&
    a?.language === b?.language
  );
};

const nameAndImageUrlQueryToStructuredQuery = (
  query: ReadonlyMap<string, string>
): NameAndImageUrl | undefined => {
  const name = query.get("name");
  const imageUrl = query.get("imageUrl");
  const language = query.get("language");
  try {
    if (typeof name === "string" && typeof imageUrl === "string") {
      return {
        name,
        imageUrl: new URL(imageUrl),
        language: Language.parse(language),
      };
    }
  } catch {
    return undefined;
  }
};

const nameAndImageStructuredQueryToQuery = (): ReadonlyMap<string, string> => {
  return new Map();
};

const CreateAccount = (): React.ReactElement => {
  const [name, setName] = React.useState<string | undefined>(undefined);
  const [imageUrl, setImageUrl] = React.useState<URL | undefined>(undefined);
  const onUpdate = React.useCallback(
    (nameAndImageUrl: NameAndImageUrl | undefined) => {
      if (nameAndImageUrl !== undefined) {
        setName(nameAndImageUrl.name);
        setImageUrl(nameAndImageUrl.imageUrl);
      }
    },
    []
  );

  const queryBasedState = useQueryBasedState<NameAndImageUrl | undefined>({
    queryToStructuredQuery: nameAndImageUrlQueryToStructuredQuery,
    structuredQueryToQuery: nameAndImageStructuredQueryToQuery,
    isEqual: nameAndImageUrlEqual,
    onUpdate,
  });

  return (
    <WithHeader
      logInState={{
        _: "LoadingAccountTokenFromIndexedDB",
      }}
      titleItemList={[]}
      location={undefined}
      language={
        (queryBasedState.type === "loaded"
          ? queryBasedState.value?.language
          : undefined) ?? "english"
      }
      title="definy のアカウント作成"
    >
      <div
        css={{
          backgroundColor: "black",
          color: "white",
          display: "gird",
          gap: 16,
          padding: 16,
        }}
      >
        <h1 css={{ margin: 0, padding: 8 }}>definyのアカウント作成</h1>
        <div
          css={{
            display: "grid",
            gap: 16,
          }}
        >
          <label>
            アカウント名
            {name === undefined ? (
              <div>...</div>
            ) : (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
          </label>
          <label>
            アカウント画像
            {imageUrl === undefined ? (
              <div>...</div>
            ) : (
              <img src={imageUrl.toString()} />
            )}
          </label>
          <button
            disabled={name === undefined || name.trim().length === 0}
            onClick={() => {
              console.log("アカウントを", name, "で作成する");
            }}
          >
            アカウントを作成する
          </button>
        </div>
      </div>
    </WithHeader>
  );
};

export default CreateAccount;

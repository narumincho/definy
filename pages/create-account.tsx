import * as React from "react";
import { Language, defaultLanguage } from "../common/zodType";
import { Text } from "../components/Text";
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
  const onUpdate = React.useCallback(
    (nameAndImageUrl: NameAndImageUrl | undefined) => {
      if (nameAndImageUrl !== undefined) {
        setName(nameAndImageUrl.name);
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

  const language: Language =
    (queryBasedState.type === "loaded"
      ? queryBasedState.value?.language
      : undefined) ?? defaultLanguage;

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
      title={{
        japanese: "definy のアカウント作成",
        english: "Create a definy account",
        esperanto: "Kreu definy-konton",
      }}
    >
      <div
        css={{
          backgroundColor: "black",
          color: "white",
          display: "grid",
          gap: 24,
          padding: 16,
        }}
      >
        <div css={{ fontSize: 24 }}>
          <Text
            language={language}
            english="version"
            japanese="definyへようこそ"
            esperanto="bonvenon difini"
          />
        </div>
        <h1 css={{ margin: 0, fontSize: 32 }}>definyのアカウント作成</h1>
        <div
          css={{
            display: "grid",
            gap: 16,
          }}
        >
          <label>
            <Text
              language={language}
              japanese="アカウント名"
              english="account name"
              esperanto="kontonomo"
            />
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
            <Text
              language={language}
              japanese="アカウント画像"
              english="account picture"
              esperanto="konta bildo"
            />
            {queryBasedState.type === "loaded" &&
            queryBasedState.value?.imageUrl !== undefined ? (
              <img src={queryBasedState.value.imageUrl.toString()} />
            ) : (
              <div>...</div>
            )}
          </label>
          <button
            disabled={name === undefined || name.trim().length === 0}
            onClick={() => {
              console.log("アカウントを", name, "で作成する");
            }}
          >
            <Text
              language={language}
              japanese="アカウントを作成する"
              english="create an account"
              esperanto="Krei konton"
            />
          </button>
        </div>
      </div>
    </WithHeader>
  );
};

export default CreateAccount;

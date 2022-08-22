import * as React from "react";
import { Language, PreAccountToken, defaultLanguage } from "../common/zodType";
import { Button } from "../client/ui/Button";
import { Text } from "../components/Text";
import { WithHeader } from "../components/WithHeader";
import { trpc } from "../hooks/trpc";
import { useQueryBasedState } from "../hooks/useQueryBasedState";

type NameAndImageUrl = {
  readonly name: string;
  readonly imageUrl: URL;
  readonly language: Language;
  readonly preAccountToken: PreAccountToken;
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
  const preAccountToken = query.get("preAccountToken");
  try {
    console.log("query のパースをした", query);
    if (typeof name === "string" && typeof imageUrl === "string") {
      return {
        name,
        imageUrl: new URL(imageUrl),
        language: Language.parse(language),
        preAccountToken: PreAccountToken.parse(preAccountToken),
      };
    }
  } catch (e) {
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

  const createAccount = trpc.useMutation("createAccount", {
    onSuccess: (response) => {
      if (response.type === "ok") {
        console.log("アカウントの作成に成功!");
      }
    },
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
            english="welcome to definy"
            japanese="definyへようこそ"
            esperanto="bonvenon difini"
          />
        </div>
        <h1 css={{ margin: 0, fontSize: 32 }}>
          <Text
            language={language}
            english="Create a definy account"
            japanese="definyのアカウント作成"
            esperanto="Kreu definy-konton"
          />
        </h1>
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
          <Button
            onClick={
              name === undefined ||
              name.trim().length === 0 ||
              createAccount.isLoading
                ? undefined
                : () => {
                    console.log("おされた", queryBasedState);
                    if (
                      typeof name === "string" &&
                      queryBasedState.type === "loaded" &&
                      queryBasedState.value !== undefined
                    ) {
                      createAccount.mutate({
                        name,
                        preAccountToken: queryBasedState.value.preAccountToken,
                      });
                    }
                  }
            }
          >
            {createAccount.isLoading ? (
              <Text
                language={language}
                japanese="アカウントを作成中..."
                english="creating account..."
                esperanto="Kreante konton..."
              />
            ) : (
              <Text
                language={language}
                japanese="アカウントを作成する"
                english="create account"
                esperanto="Krei konton"
              />
            )}
          </Button>
          {createAccount.isError ||
          (createAccount.isSuccess &&
            createAccount.data.type === "notGeneratedPreAccountToken") ? (
            <Text
              language={language}
              japanese="アカウントの作成に失敗しました"
              english="Failed to create account"
              esperanto="Malsukcesis krei konton"
            />
          ) : (
            <></>
          )}
          {createAccount.isSuccess && createAccount.data.type === "ok" ? (
            <Text
              language={language}
              japanese="アカウントの作成に成功! ここから先を作る"
              english="Successfully created an account! Start here"
              esperanto="Sukcese kreis konton! Komencu ĉi tie"
            />
          ) : (
            <></>
          )}
        </div>
      </div>
    </WithHeader>
  );
};

export default CreateAccount;

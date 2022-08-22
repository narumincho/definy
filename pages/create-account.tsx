import * as React from "react";
import { Language, PreAccountToken, defaultLanguage } from "../common/zodType";
import { Button } from "../client/ui/Button";
import type { ParsedUrlQuery } from "node:querystring";
import { Text } from "../components/Text";
import { WithHeader } from "../components/WithHeader";
import { trpc } from "../hooks/trpc";
import { useRouter } from "next/router";

type Parameter = {
  readonly imageUrl: URL;
  readonly language: Language;
  readonly preAccountToken: PreAccountToken;
};

const parsedUrlQueryToParameter = (
  query: ParsedUrlQuery
): (Parameter & { readonly name: string }) | undefined => {
  const name = query.name;
  const imageUrl = query.imageUrl;
  const language = query.language;
  const preAccountToken = query.preAccountToken;
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

const CreateAccount = (): React.ReactElement => {
  const [name, setName] = React.useState<string | undefined>(undefined);
  const [parameter, setParameter] = React.useState<Parameter | undefined>(
    undefined
  );
  const router = useRouter();

  React.useEffect(() => {
    const parameterAndName = parsedUrlQueryToParameter(router.query);
    setParameter(parameterAndName);
    setName(parameterAndName?.name);
  }, [router.query]);

  const createAccount = trpc.useMutation("createAccount", {
    onSuccess: (response) => {
      if (response.type === "ok") {
        console.log("アカウントの作成に成功!");
      }
    },
  });

  const language: Language = parameter?.language ?? defaultLanguage;

  return (
    <WithHeader
      logInState={{
        _: "LoadingAccountTokenFromIndexedDB",
      }}
      titleItemList={[]}
      location={undefined}
      language={language}
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
            {parameter === undefined ? (
              <div>...</div>
            ) : (
              <img src={parameter.imageUrl.toString()} />
            )}
          </label>
          <Button
            onClick={
              name === undefined ||
              name.trim().length === 0 ||
              createAccount.isLoading
                ? undefined
                : () => {
                    console.log("おされた", parameter);
                    if (typeof name === "string" && parameter !== undefined) {
                      createAccount.mutate({
                        name,
                        preAccountToken: parameter.preAccountToken,
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

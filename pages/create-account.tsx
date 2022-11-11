import * as React from "react";
import { Button } from "../client/ui/Button";
import { OneLineTextEditor } from "../client/ui/OneLineTextEditor";
import type { ParsedUrlQuery } from "node:querystring";
import { Text } from "../components/Text";
import { WithHeader } from "../components/WithHeader";
import { trpc } from "../client/hook/trpc";
import { useAccountToken } from "../client/hook/useAccountToken";
import { useRouter } from "next/router";
import { zodType } from "../deno-lib/npm";
import { zodTypeLocationAndLanguageToUrl } from "../client/url";

type Parameter = {
  readonly imageUrl: URL;
  readonly language: zodType.Language;
  readonly preAccountToken: zodType.PreAccountToken;
};

const parsedUrlQueryToParameter = (
  query: ParsedUrlQuery
): (Parameter & { readonly name: string }) | undefined => {
  const name = query.name;
  const imageUrl = query.imageUrl;
  const language = query.language;
  const preAccountToken = query.preAccountToken;
  try {
    if (typeof name === "string" && typeof imageUrl === "string") {
      return {
        name,
        imageUrl: new URL(imageUrl),
        language: zodType.Language.parse(language),
        preAccountToken: zodType.PreAccountToken.parse(preAccountToken),
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

  const useAccountTokenResult = useAccountToken();

  const language: zodType.Language =
    parameter?.language ?? zodType.defaultLanguage;

  const createAccount = trpc.useMutation("createAccount", {
    onSuccess: (response) => {
      if (response.type === "ok") {
        useAccountTokenResult
          .setAccountToken(response.accountToken)
          .then(() => {
            router.replace(
              zodTypeLocationAndLanguageToUrl({ type: "home" }, language)
            );
          });
      }
    },
  });

  const accountNameParseResult = zodType.AccountName.safeParse(name);

  return (
    <WithHeader
      titleItemList={[]}
      location={undefined}
      language={language}
      title={{
        japanese: "definy のアカウント作成",
        english: "Create a definy account",
        esperanto: "Kreu definy-konton",
      }}
      useAccountTokenResult={useAccountTokenResult}
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
              <OneLineTextEditor
                value={name}
                onChange={(e) => setName(e)}
                id="account-name"
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
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={parameter.imageUrl.toString()}
                  css={{ width: 128, height: 128, objectFit: "contain" }}
                />
                <div>{parameter.imageUrl.toString()}</div>
              </div>
            )}
          </label>

          <Button
            onClick={
              !accountNameParseResult.success || createAccount.isLoading
                ? undefined
                : () => {
                    if (typeof name === "string" && parameter !== undefined) {
                      createAccount.mutate({
                        name: accountNameParseResult.data,
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

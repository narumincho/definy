import * as React from "react";
import { Link } from "./Link";
import { UseAccountTokenResult } from "../client/hook/useAccountToken";
import type { UseDefinyAppResult } from "../client/hook/useDefinyApp";
import { trpc } from "../client/hook/trpc";
import { useRouter } from "next/router";
import { zodType } from "../deno-lib/npm";

export type TitleItem = {
  readonly name: string;
  readonly location: zodType.Location;
};

export type Props = {
  readonly onLogInButtonClick: UseDefinyAppResult["logIn"];
  readonly titleItemList: ReadonlyArray<TitleItem>;
  /** undefined でログインボタン非表示 */
  readonly location: zodType.Location | undefined;
  readonly language: zodType.Language;
  readonly useAccountTokenResult: UseAccountTokenResult;
};

export const Header = (props: Props): React.ReactElement => {
  const requestLogInUrl = trpc.useMutation("requestLogInUrl");
  const { push: routerPush } = useRouter();

  React.useEffect(() => {
    if (requestLogInUrl.isSuccess) {
      routerPush(new URL(requestLogInUrl.data));
    }
  }, [requestLogInUrl.isSuccess, routerPush, requestLogInUrl.data]);

  return (
    <div
      css={{
        gridColumn: "1 / 2",
        gridRow: "1 / 2",
        width: "100%",
        height: 48,
        backgroundColor: "#333",
        display: "grid",
        gridAutoFlow: "column",
        alignItems: "center",
      }}
    >
      <Link
        style={{
          justifySelf: "start",
          padding: 8,
          color: "#b9d09b",
          fontSize: 32,
          lineHeight: 1,
          alignItems: "center",
        }}
        location={{ type: "home" }}
        language={props.language}
      >
        definy
      </Link>
      <div css={{ display: "flex", alignItems: "center" }}>
        {props.titleItemList.flatMap((titleItem) => {
          return [
            <div key={`${titleItem.name}-separator`}>/</div>,
            <Link
              style={{
                padding: 8,
              }}
              location={titleItem.location}
              language={props.language}
              key={`${titleItem.name}-link`}
            >
              {titleItem.name}
            </Link>,
          ];
        })}
      </div>
      {props.location === undefined ? (
        <></>
      ) : (
        <UserViewOrLogInButton
          accountToken={props.useAccountTokenResult.accountToken}
          language={props.language}
          onLogInButtonClick={() => props.onLogInButtonClick()}
        />
      )}
    </div>
  );
};

const UserViewOrLogInButton = (props: {
  readonly onLogInButtonClick: () => void;
  readonly language: zodType.Language;
  readonly accountToken: zodType.AccountToken | undefined | null;
}): React.ReactElement => {
  if (props.accountToken === null) {
    return <div>...</div>;
  }
  if (props.accountToken === undefined) {
    return (
      <LogInButtonList
        language={props.language}
        onLogInButtonClick={props.onLogInButtonClick}
      />
    );
  }
  return (
    <SettingLink language={props.language} accountToken={props.accountToken} />
  );
};

const SettingLink: React.FC<{
  accountToken: zodType.AccountToken;
  language: zodType.Language;
}> = (props) => {
  const account = trpc.useQuery([
    "getAccountFromAccountToken",
    props.accountToken,
  ]);
  return (
    <Link
      style={{
        justifySelf: "end",
        display: "grid",
        gridTemplateColumns: "32px auto",
        alignItems: "center",
        padding: 8,
        gap: 8,
      }}
      language={props.language}
      // 後に設定に変更する
      location={{ type: "setting" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        css={{
          width: 32,
          height: 32,
          borderRadius: "50%",
        }}
        alt="設定"
        src={account?.data?.imageUrl}
      />
      <div>{account?.data?.name ?? "..."}</div>
    </Link>
  );
};

const LogInButtonList: React.FC<{
  readonly language: zodType.Language;
  readonly onLogInButtonClick: () => void;
}> = React.memo((props) => (
  <div
    css={{
      display: "grid",
      gap: 8,
      padding: 8,
      gridAutoFlow: "column",
      justifySelf: "end",
    }}
  >
    <GoogleLogInButton
      language={props.language}
      onLogInButtonClick={props.onLogInButtonClick}
    />
  </div>
));
LogInButtonList.displayName = "LogInButtonList";

const GoogleLogInButton: React.FC<{
  language: zodType.Language;
  onLogInButtonClick: () => void;
}> = React.memo((props) => (
  <button
    css={{
      display: "grid",
      border: "none",
      gridTemplateColumns: "32px 160px",
      backgroundColor: "#4285f4",
      borderRadius: 8,
      gap: 8,
      padding: 0,
      cursor: "pointer",
      ":hover": {
        backgroundColor: "#5190f8",
      },
    }}
    onClick={props.onLogInButtonClick}
  >
    <GoogleIcon />
    <div
      css={{
        alignSelf: "center",
        fontSize: 16,
        color: "#fff",
        lineHeight: 1,
      }}
    >
      {logInMessage(props.language)}
    </div>
  </button>
));
GoogleLogInButton.displayName = "GoogleLogInButton";

const GoogleIcon: React.FC<Record<string, string>> = React.memo(() => (
  <svg
    viewBox="0 0 20 20"
    css={{
      width: 32,
      height: 32,
      padding: 4,
      backgroundColor: "#fff",
      borderRadius: 8,
    }}
  >
    {/** blue */}
    <path
      d="M19.6 10.23c0-.82-.1-1.42-.25-2.05H10v3.72h5.5c-.15.96-.74 2.31-2.04 3.22v2.45h3.16c1.89-1.73 2.98-4.3 2.98-7.34z"
      fill="rgb(66, 133, 244)"
    />
    {/** green */}
    <path
      d="M13.46 15.13c-.83.59-1.96 1-3.46 1-2.64 0-4.88-1.74-5.68-4.15H1.07v2.52C2.72 17.75 6.09 20 10 20c2.7 0 4.96-.89 6.62-2.42l-3.16-2.45z"
      fill="rgb(52, 168, 83)"
    />
    {/** yellow */}
    <path
      d="M3.99 10c0-.69.12-1.35.32-1.97V5.51H1.07A9.973 9.973 0 0 0 0 10c0 1.61.39 3.14 1.07 4.49l3.24-2.52c-.2-.62-.32-1.28-.32-1.97z"
      fill="rgb(251, 188, 5)"
    />
    {/** red */}
    <path
      d="M10 3.88c1.88 0 3.13.81 3.85 1.48l2.84-2.76C14.96.99 12.7 0 10 0 6.09 0 2.72 2.25 1.07 5.51l3.24 2.52C5.12 5.62 7.36 3.88 10 3.88z"
      fill="rgb(234, 67, 53)"
    />
  </svg>
));
GoogleIcon.displayName = "GoogleIcon";

const logInMessage = (language: zodType.Language): string => {
  switch (language) {
    case "english":
      return `Sign in with Google`;
    case "esperanto":
      return `Ensalutu kun Google`;
    case "japanese":
      return `Google でログイン`;
  }
};

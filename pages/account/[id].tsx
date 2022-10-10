import * as React from "react";
import { WithHeader } from "../../components/WithHeader";
import { trpc } from "../../client/hook/trpc";
import { useAccountToken } from "../../client/hook/useAccountToken";
import { useLanguage } from "../../client/hook/useLanguage";
import { useRouter } from "next/router";
import { zodType } from "../../deno-lib/npm";

const AccountPage = (): React.ReactElement => {
  const { query } = useRouter();
  const language = useLanguage();
  const useAccountTokenResult = useAccountToken();
  const accountIdParseResult = zodType.AccountId.safeParse(query.id);

  return (
    <WithHeader
      language={language}
      title={{
        japanese: "definy で作成されたプロジェクト",
        english: "Project created in definy",
        esperanto: "Projekto kreita en definy",
      }}
      location={
        accountIdParseResult.success
          ? {
              type: "account",
              id: accountIdParseResult.data,
            }
          : {
              type: "home",
            }
      }
      titleItemList={[]}
      useAccountTokenResult={useAccountTokenResult}
    >
      <div css={{ padding: 16 }}>
        <div>アカウント {query.id}</div>
        {accountIdParseResult.success ? (
          <Content accountId={accountIdParseResult.data} />
        ) : (
          <div>アカウントIDが不正です</div>
        )}
      </div>
    </WithHeader>
  );
};

const Content = (props: {
  readonly accountId: zodType.AccountId;
}): React.ReactElement => {
  const accountQueryResult = trpc.useQuery(["getAccountById", props.accountId]);

  switch (accountQueryResult.status) {
    case "error":
      return <div>エラーで取得できなかった</div>;
    case "idle":
      return <div>idle状態</div>;
    case "loading":
      return <div>loading...</div>;
    case "success": {
      if (accountQueryResult.data === undefined) {
        return <div>アカウントが存在しなかった</div>;
      }
      return (
        <div>
          <h1>{accountQueryResult.data.name}</h1>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={accountQueryResult.data.imageUrl}
            css={{ width: 64, height: 64, objectFit: "contain" }}
          />
        </div>
      );
    }
  }
};

export default AccountPage;

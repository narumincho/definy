import * as React from "react";
import { AccountId } from "../../common/zodType";
import { WithHeader } from "../../components/WithHeader";
import { trpc } from "../../hooks/trpc";
import { useAccountToken } from "../../hooks/useAccountToken";
import { useLanguage } from "../../hooks/useLanguage";
import { useRouter } from "next/router";

const AccountPage = (): React.ReactElement => {
  const { query } = useRouter();
  const language = useLanguage();
  const useAccountTokenResult = useAccountToken();
  const accountIdParseResult = AccountId.safeParse(query.id);

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
  readonly accountId: AccountId;
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

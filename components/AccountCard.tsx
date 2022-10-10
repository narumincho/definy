import * as React from "react";
import { Link } from "./Link";
import { trpc } from "../client/hook/trpc";
import { zodType } from "../deno-lib/npm";

export const AccountCard = (props: {
  readonly accountId: zodType.AccountId;
  readonly language: zodType.Language;
}): React.ReactElement => {
  const accountQueryResult = trpc.useQuery(["getAccountById", props.accountId]);

  switch (accountQueryResult.status) {
    case "error":
      return <div>error...</div>;
    case "idle":
      return <div>....</div>;
    case "loading":
      return <div>..</div>;
    case "success":
      return (
        <AccountCardLoaded
          data={accountQueryResult.data}
          language={props.language}
          accountId={props.accountId}
        />
      );
  }
};

const AccountCardLoaded = (props: {
  readonly language: zodType.Language;
  readonly accountId: zodType.AccountId;
  readonly data:
    | {
        readonly name: string;
        readonly imageUrl: string;
      }
    | undefined;
}) => {
  if (props.data === undefined) {
    return <div>アカウントが見つからなかった</div>;
  }
  return (
    <div css={{ padding: 8 }}>
      <Link
        language={props.language}
        location={{ type: "account", id: props.accountId }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={props.data.imageUrl}
          css={{
            width: 48,
            height: 48,
            objectFit: "contain",
          }}
        />
        {props.data.name}
      </Link>
    </div>
  );
};

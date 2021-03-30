import * as React from "react";
import * as d from "../../data";
import { Link } from "./Link";

export type Props = {
  readonly accountId: d.AccountId;
  readonly language: d.Language;
  readonly onJump: (urlData: d.UrlData) => void;
};

export const AccountCard: React.VFC<Props> = (props) => {
  return (
    <Link
      onJump={props.onJump}
      urlData={{
        language: props.language,
        location: d.Location.Account(props.accountId),
      }}
      style={{ padding: 8 }}
    >
      アカウントカード {props.accountId}
    </Link>
  );
};

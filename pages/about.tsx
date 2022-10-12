import * as React from "react";
import type { CSSObject } from "@emotion/react";
import Link from "next/link";
import { Text } from "../components/Text";
import { WithHeader } from "../components/WithHeader";
import { trpc } from "../client/hook/trpc";
import { useAccountToken } from "../client/hook/useAccountToken";
import { useLanguage } from "../client/hook/useLanguage";
import { zodType } from "../deno-lib/npm";

export const AboutPage = (): React.ReactElement => {
  const language = useLanguage();
  const useAccountTokenResult = useAccountToken();

  return (
    <WithHeader
      location={{ type: "about" }}
      language={language}
      titleItemList={[]}
      title={{
        japanese: "definy について",
        english: "about definy",
        esperanto: "pri definy",
      }}
      useAccountTokenResult={useAccountTokenResult}
    >
      <div css={{ padding: 16, display: "grid", gap: 8 }}>
        <Text
          language={language}
          japanese="definyはWebアプリのためのWebアプリです"
          english="definy is Web App for Web App"
          esperanto="definy estas TTT-programo por TTT-programo"
        />
        <GitHubRepositoryLink
          githubAccountName="narumincho"
          repoName="definy"
        />
        <Text
          language={language}
          japanese="NI (Next.js + IoT向けの機能を実装すると決めた) 版"
          english="definy Next.js version"
          esperanto="definy Next.js-version"
        />
        <Version language={language} />
      </div>
    </WithHeader>
  );
};

export default AboutPage;

const GitHubRepositoryLink: React.FC<{
  githubAccountName: string;
  repoName: string;
}> = (props) => (
  <a
    href={new URL(
      "https://github.com/" + props.githubAccountName + "/" + props.repoName
    ).toString()}
    css={{
      display: "grid",
      gridTemplateColumns: "auto 1fr",
      gap: 8,
      padding: 16,
      color: "#ddd",
      backgroundColor: "#333",
      borderRadius: 8,
      textDecoration: "none",
      alignItems: "center",
      "&:hover": {
        color: "#dfdfdf",
        backgroundColor: "#444",
      },
    }}
  >
    <GitHubIcon color="#ddd" width={32} height={32} />
    <div>
      GitHub: {props.githubAccountName} / {props.repoName}
    </div>
  </a>
);

/**
 * GitHubのアイコン
 */
export const GitHubIcon: React.FC<{
  color: string;
  width: number;
  height: number;
  padding?: number;
  borderRadius?: number;
}> = (props) => {
  const cssObject: CSSObject = {
    width: props.width,
    height: props.height,
    padding: props.padding ?? 0,
    borderRadius: props.borderRadius ?? 0,
  };
  return (
    <svg viewBox="0 0 20 20" css={cssObject}>
      <path
        d="M10 0C4.476 0 0 4.477 0 10c0 4.418 2.865 8.166 6.84 9.49.5.09.68-.218.68-.483 0-.237-.007-.866-.012-1.7-2.782.603-3.37-1.34-3.37-1.34-.454-1.157-1.11-1.464-1.11-1.464-.907-.62.07-.608.07-.608 1.003.07 1.53 1.03 1.53 1.03.893 1.53 2.342 1.087 2.912.83.09-.645.35-1.085.634-1.335-2.22-.253-4.555-1.11-4.555-4.943 0-1.09.39-1.984 1.03-2.683-.105-.253-.448-1.27.096-2.647 0 0 .84-.268 2.75 1.026C8.294 4.95 9.15 4.84 10 4.836c.85.004 1.705.115 2.504.337 1.91-1.294 2.747-1.026 2.747-1.026.548 1.377.204 2.394.1 2.647.64.7 1.03 1.592 1.03 2.683 0 3.842-2.34 4.687-4.566 4.935.36.308.678.92.678 1.852 0 1.336-.01 2.415-.01 2.743 0 .267.18.578.687.48C17.14 18.163 20 14.417 20 10c0-5.522-4.478-10-10-10"
        fill={props.color}
      />
    </svg>
  );
};

const Version = (props: {
  readonly language: zodType.Language;
}): React.ReactElement => {
  return (
    <div>
      <h2 css={{ color: "white", fontSize: 20 }}>
        <Text
          language={props.language}
          english="version"
          japanese="バージョン"
          esperanto="versio"
        />
      </h2>
      <VersionContent />
    </div>
  );
};

const VersionContent = (): React.ReactElement => {
  const response = trpc.useQuery(["gitCommitSha"]);

  if (response.data === undefined) {
    return <div css={{ color: "white" }}>...</div>;
  }
  if (response.data === null) {
    return <div css={{ color: "white" }}>開発バージョン</div>;
  }
  return (
    <Link href={"https://github.com/narumincho/definy/tree/" + response.data}>
      <div
        css={{
          color: "white",
          textDecorationLine: "underline",
          cursor: "pointer",
        }}
      >
        ビルド元コミット {response.data}
      </div>
    </Link>
  );
};

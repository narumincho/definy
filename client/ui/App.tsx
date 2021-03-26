import * as React from "react";
import * as d from "../../data";
import { ProjectCard, ProjectCardSkeleton } from "./ProjectCard";
import { css, keyframes } from "@emotion/css";
import { Header } from "./Header";
import { Link } from "./Link";

export type TopProjectsLoadingState =
  | { _: "none" }
  | { _: "loading" }
  | { _: "loaded"; projectIdList: ReadonlyArray<d.ProjectId> };

export type Props = {
  topProjectsLoadingState: TopProjectsLoadingState;
  projectDict: ReadonlyMap<d.ProjectId, d.Project>;
  onJump: (urlData: d.UrlData) => void;
  location: d.Location;
  language: d.Language;
  logInState: d.LogInState;
  accountDict: ReadonlyMap<d.AccountId, d.Account>;
  onLogInButtonClick: () => void;
};

export const App: React.VFC<Props> = (props) => {
  switch (props.logInState._) {
    case "RequestingLogInUrl": {
      return (
        <PrepareLogIn
          message={logInMessage(
            props.logInState.openIdConnectProvider,
            props.language
          )}
        />
      );
    }
    case "JumpingToLogInPage": {
      return <PrepareLogIn message={jumpMessage(props.language)} />;
    }
  }
  return (
    <div
      className={css({
        height: "100%",
        display: "grid",
        overflow: "hidden",
        gridTemplateRows: "48px 1fr",
        backgroundColor: "#222",
      })}
    >
      <Header
        logInState={props.logInState}
        accountDict={props.accountDict}
        language={props.language}
        titleItemList={[]}
        onJump={props.onJump}
        onLogInButtonClick={props.onLogInButtonClick}
      />
      <div
        className={css({
          display: "grid",
          overflowY: "scroll",
          gridTemplateRows: "32px 1fr",
          gap: 8,
          padding: 16,
        })}
      >
        <HomeLinkList jumpHandler={props.onJump} language={props.language} />
        <TopProjectList
          topProjectsLoadingState={props.topProjectsLoadingState}
          projectDict={props.projectDict}
          jumpHandler={props.onJump}
          language={props.language}
        />
      </div>
    </div>
  );
};

const HomeLinkList: React.VFC<{
  language: d.Language;
  jumpHandler: (urlData: d.UrlData) => void;
}> = (props) => {
  return (
    <div
      className={css({
        display: "grid",
        gridAutoFlow: "column",
        justifyContent: "end",
        alignItems: "center",
        height: 32,
        gap: 8,
      })}
    >
      <Link
        urlData={{ location: d.Location.About, language: props.language }}
        style={{ padding: 4 }}
        onJump={props.jumpHandler}
      >
        Definyについて
      </Link>
    </div>
  );
};

const TopProjectList: React.VFC<{
  topProjectsLoadingState: TopProjectsLoadingState;
  projectDict: ReadonlyMap<d.ProjectId, d.Project>;
  jumpHandler: (urlData: d.UrlData) => void;
  language: d.Language;
}> = (props) => {
  switch (props.topProjectsLoadingState._) {
    case "none":
      return <div>読み込み準備中</div>;
    case "loading":
      return (
        <div
          className={css({
            overflow: "hidden",
            overflowWrap: "break-word",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            alignSelf: "start",
            justifySelf: "center",
            gap: 8,
          })}
        >
          {Array.from({ length: 10 }, (_, index) => (
            <ProjectCardSkeleton key={index} />
          ))}
        </div>
      );
    case "loaded":
      if (props.topProjectsLoadingState.projectIdList.length === 0) {
        return (
          <div
            className={css({
              display: "grid",
              alignItems: "center",
              justifyItems: "center",
              fontSize: 32,
            })}
          >
            プロジェクトが1つも存在しない
          </div>
        );
      }
      return (
        <div
          className={css({
            overflow: "hidden",
            overflowWrap: "break-word",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            alignSelf: "start",
            justifySelf: "center",
            gap: 8,
          })}
        >
          {props.topProjectsLoadingState.projectIdList.map((projectId) => (
            <ProjectCard
              key={projectId}
              projectId={projectId}
              projectDict={props.projectDict}
              jumpHandler={props.jumpHandler}
              language={props.language}
            />
          ))}
        </div>
      );
  }
};

const PrepareLogIn: React.VFC<{ message: string }> = (props) => (
  <div
    className={css({
      height: "100%",
      display: "grid",
      alignItems: "center",
      justifyItems: "center",
    })}
  >
    <LoadingBox message={props.message} />
  </div>
);

const logInMessage = (
  provider: d.OpenIdConnectProvider,
  language: d.Language
): string => {
  switch (language) {
    case "English":
      return `Preparing to log in to ${provider}`;
    case "Esperanto":
      return `Preparante ensaluti al Google${provider}`;
    case "Japanese":
      return `${provider}へのログインを準備中……`;
  }
};

const jumpMessage = (language: d.Language): string => {
  switch (language) {
    case "English":
      return `Navigating to Google logIn page.`;
    case "Esperanto":
      return `Navigado al Google-ensaluta paĝo.`;
    case "Japanese":
      return `Google のログインページへ移動中……`;
  }
};

const LoadingBox: React.VFC<{ message: string }> = (props) => (
  <div
    className={css({
      display: "grid",
      overflow: "hidden",
      justifyItems: "center",
    })}
  >
    <div>{props.message}</div>
    <div
      className={css({
        width: 128,
        height: 128,
        display: "grid",
        justifyItems: "center",
        alignItems: "center",
        borderRadius: "50%",
        animation: `3s ${rotateAnimation} infinite linear`,
        fontSize: 24,
        padding: 8,
        backgroundColor: "#333",
        color: "#ddd",
        fontFamily: "Hack",
      })}
    >
      Definy
    </div>
  </div>
);

const rotateAnimation = keyframes`
  0% {
    transform: rotate(0);
  }
  100% {
    transform: rotate(1turn);
  }
`;

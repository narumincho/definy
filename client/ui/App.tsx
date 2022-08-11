import * as React from "react";
import * as d from "../../localData";
import { Header, TitleItem } from "./Header";
import { AboutPage } from "./AboutPage";
import { AccountPage } from "./AccountPage";
import { CreateProjectPage } from "./CreateProjectPage";
import { HomePage } from "./HomePage";
import { LocalProjectPage } from "./LocalProjectPage";
import { PartPage } from "./PartPage";
import { ProjectPage } from "./ProjectPage";
import { SettingPage } from "./SettingPage";
import { SoundQuiz } from "../tool/SoundQuiz";
import { ThemeColorRainbow } from "../tool/ThemeColorRainbow";
import { TypePartPage } from "./TypePartPage";
import type { UseDefinyAppResult } from "../hook/useDefinyApp";
import { css } from "@emotion/css";

export type Props = {
  readonly useDefinyAppResult: UseDefinyAppResult;
};

const titleItemList: ReadonlyArray<TitleItem> = [];

export const App: React.FC<Props> = ({ useDefinyAppResult }) => {
  switch (useDefinyAppResult.logInState._) {
    case "RequestingLogInUrl":
    case "JumpingToLogInPage":
      return <div>LogInMessage に移植済み</div>;
  }
  return (
    <div
      className={css({
        width: "100%",
        height: "100%",
        display: "grid",
        overflow: "hidden",
        gridTemplateRows: "48px 1fr",
        backgroundColor: "#222",
      })}
    >
      <Header
        logInState={useDefinyAppResult.logInState}
        accountResource={useDefinyAppResult.accountResource}
        language={useDefinyAppResult.language}
        titleItemList={titleItemList}
        onLogInButtonClick={useDefinyAppResult.logIn}
      />
      <div
        className={css({
          gridColumn: "1 / 2",
          gridRow: "2 / 3",
          overflow: "hidden",
        })}
      >
        <AppMain useDefinyAppResult={useDefinyAppResult} />
      </div>
      <div
        className={css({
          gridColumn: "1 / 2",
          gridRow: "1 / 3",
          justifySelf: "end",
          alignSelf: "end",
          overflow: "hidden",
        })}
      >
        {useDefinyAppResult.notificationElement}
      </div>
    </div>
  );
};

/**
 * Header を含まない部分
 */
const AppMain: React.FC<Props> = (props) => {
  const useDefinyAppResult = props.useDefinyAppResult;
  switch (useDefinyAppResult.location._) {
    case "Home":
      return (
        <HomePage
          topProjectsLoadingState={useDefinyAppResult.topProjectsLoadingState}
          accountResource={useDefinyAppResult.accountResource}
          language={useDefinyAppResult.language}
          logInState={useDefinyAppResult.logInState}
          projectResource={useDefinyAppResult.projectResource}
          requestTop50Project={useDefinyAppResult.requestTop50Project}
          typePartResource={useDefinyAppResult.typePartResource}
        />
      );
    case "About":
      return <AboutPage language={useDefinyAppResult.language} />;
    case "Setting":
      return (
        <SettingPage
          accountResource={useDefinyAppResult.accountResource}
          language={useDefinyAppResult.language}
          logInState={useDefinyAppResult.logInState}
          onLogOut={useDefinyAppResult.logOut}
        />
      );
    case "CreateProject":
      return (
        <CreateProjectPage
          createProjectState={useDefinyAppResult.createProjectState}
          onCreateProject={useDefinyAppResult.createProject}
        />
      );
    case "Project":
      return (
        <ProjectPage
          language={useDefinyAppResult.language}
          projectId={useDefinyAppResult.location.projectId}
          accountResource={useDefinyAppResult.accountResource}
          projectResource={useDefinyAppResult.projectResource}
          addTypePart={useDefinyAppResult.addTypePart}
          typePartIdListInProjectResource={
            useDefinyAppResult.typePartIdListInProjectResource
          }
          typePartResource={useDefinyAppResult.typePartResource}
          generateCode={useDefinyAppResult.generateCode}
          outputCode={useDefinyAppResult.outputCode}
        />
      );
    case "Account":
      return (
        <AccountPage
          language={useDefinyAppResult.language}
          accountId={useDefinyAppResult.location.accountId}
          accountResource={useDefinyAppResult.accountResource}
          projectResource={useDefinyAppResult.projectResource}
          typePartResource={useDefinyAppResult.typePartResource}
        />
      );
    case "TypePart":
      return (
        <TypePartPage
          typePartResource={useDefinyAppResult.typePartResource}
          typePartId={useDefinyAppResult.location.typePartId}
          accountResource={useDefinyAppResult.accountResource}
          projectResource={useDefinyAppResult.projectResource}
          language={useDefinyAppResult.language}
          typePartIdListInProjectResource={
            useDefinyAppResult.typePartIdListInProjectResource
          }
          saveTypePart={useDefinyAppResult.saveTypePart}
          isSavingTypePart={useDefinyAppResult.isSavingTypePart}
        />
      );
    case "Part":
      return <PartPage />;
    case "LocalProject":
      return <LocalProjectPage />;
    case "ToolList":
      return <div>next の route として移植済み</div>;
    case "Tool":
      return <Tool toolName={useDefinyAppResult.location.toolName} />;
  }
};

export const Tool = (props: {
  readonly toolName: d.ToolName;
}): React.ReactElement => {
  switch (props.toolName) {
    case "ThemeColorRainbow":
      return <ThemeColorRainbow />;
    case "SoundQuiz":
      return <SoundQuiz />;
  }
};

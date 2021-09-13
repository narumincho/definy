import * as React from "react";
import * as d from "../../localData";
import { ListItem, listItem } from "../editor/list";
import { listValue, projectIdValue } from "../editor/common";
import { Editor } from "./Editor";
import { Link } from "./Link";
import { ProjectCardSkeleton } from "./ProjectCard";
import type { UseDefinyAppResult } from "../hook/useDefinyApp";
import { css } from "@emotion/css";

export type Props = Pick<
  UseDefinyAppResult,
  | "topProjectsLoadingState"
  | "projectResource"
  | "accountResource"
  | "language"
  | "logInState"
  | "requestTop50Project"
  | "typePartResource"
> & {
  onJump: UseDefinyAppResult["jump"];
};

export const HomePage: React.VFC<Props> = (props) => {
  React.useEffect(() => {
    props.requestTop50Project();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={css({
        display: "grid",
        gridTemplateRows: "32px 1fr",
        gap: 8,
        padding: 16,
        width: "100%",
        height: "100%",
      })}
    >
      <HomeLinkList jumpHandler={props.onJump} language={props.language} />
      <TopProjectList
        topProjectsLoadingState={props.topProjectsLoadingState}
        onJump={props.onJump}
        language={props.language}
        projectResource={props.projectResource}
        accountResource={props.accountResource}
      />
      {props.logInState._ === "LoggedIn" ? (
        <CreateProjectButton language={props.language} onJump={props.onJump} />
      ) : (
        <></>
      )}
    </div>
  );
};

const HomeLinkList: React.VFC<{
  language: d.Language;
  jumpHandler: (urlData: d.LocationAndLanguage) => void;
}> = (props) => {
  return (
    <div
      className={css({
        gridColumn: "1 / 2",
        gridRow: "1 / 2",
        display: "grid",
        gridAutoFlow: "column",
        justifyContent: "end",
        alignItems: "center",
        height: 32,
        gap: 8,
      })}
    >
      <Link
        locationAndLanguage={{
          location: d.Location.About,
          language: props.language,
        }}
        style={{ padding: 4 }}
        onJump={props.jumpHandler}
      >
        definyについて
      </Link>
      <Link
        locationAndLanguage={{
          location: d.Location.LocalProject,
          language: props.language,
        }}
        style={{ padding: 4 }}
        onJump={props.jumpHandler}
      >
        ファイルから開く
      </Link>
    </div>
  );
};

const TopProjectList: React.VFC<
  Pick<
    UseDefinyAppResult,
    | "topProjectsLoadingState"
    | "projectResource"
    | "accountResource"
    | "language"
  > & {
    onJump: UseDefinyAppResult["jump"];
  }
> = (props) => {
  switch (props.topProjectsLoadingState._) {
    case "none":
      return (
        <div
          className={css({
            gridColumn: "1 / 2",
            gridRow: "2 / 3",
          })}
        >
          読み込み準備中
        </div>
      );
    case "loading":
      return (
        <div
          className={css({
            gridColumn: "1 / 2",
            gridRow: "2 / 3",
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
              gridColumn: "1 / 2",
              gridRow: "2 / 3",
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
            gridColumn: "1 / 2",
            gridRow: "2 / 3",
            height: "100%",
          })}
        >
          <Editor
            product={{
              items: [
                {
                  name: "おすすめのプロジェクト",
                  value: listValue({
                    isDirectionColumn: true,
                    items: props.topProjectsLoadingState.projectIdList.map(
                      projectIdToListItem({
                        projectResource: props.projectResource,
                        jump: props.onJump,
                        language: props.language,
                      })
                    ),
                  }),
                },
              ],
            }}
          />
        </div>
      );
  }
};

const projectIdToListItem =
  (option: Pick<UseDefinyAppResult, "projectResource" | "jump" | "language">) =>
  (projectId: d.ProjectId): ListItem => {
    const project = option.projectResource.getFromMemoryCache(projectId);
    return listItem(
      projectIdValue({
        canEdit: false,
        projectId,
        projectResource: option.projectResource,
        jump: option.jump,
        language: option.language,
      }),
      project?._ === "Loaded" ? project.dataWithTime.data.name : ""
    );
  };

const CreateProjectButton: React.VFC<{
  language: d.Language;
  onJump: (urlData: d.LocationAndLanguage) => void;
}> = (props) => (
  <div
    className={css({
      gridColumn: "1 / 2",
      gridRow: "1 / 3",
      alignSelf: "end",
      justifySelf: "end",
      padding: 16,
    })}
  >
    <Link
      locationAndLanguage={{
        language: props.language,
        location: d.Location.CreateProject,
      }}
      onJump={props.onJump}
      style={{ padding: 8 }}
      isActive
    >
      {createProjectMessage(props.language)}
    </Link>
  </div>
);

const createProjectMessage = (language: d.Language): string => {
  switch (language) {
    case "English":
      return "Create a new project";
    case "Esperanto":
      return "Krei novan projekton";
    case "Japanese":
      return "+ プロジェクトを新規作成";
  }
};

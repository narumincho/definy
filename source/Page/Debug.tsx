import * as React from "react";
import * as d from "definy-core/source/data";
import * as ui from "../ui";
import { About } from "./About";
import { Header } from "../Header";
import { Home } from "./Home";
import { Model } from "../model";
import styled from "styled-components";

const defaultModel: Model = {
  clientMode: "DebugMode",
  language: "English",
  location: d.Location.Home,
  logInState: d.LogInState.Guest,
  onJump: () => {},
  projectMap: new Map(),
  userMap: new Map(),
  imageMap: new Map(),
  ideaMap: new Map(),
  projectIdeaIdMap: new Map(),
  allProjectIdListMaybe: d.Maybe.Nothing(),
  createProjectState: { _: "None" },
  requestLogOut: () => {},
  requestAllProject: () => {},
  requestProject: () => {},
  requestUser: () => {},
  requestImage: () => {},
  createProject: () => {},
  createIdea: () => {},
  requestIdea: () => {},
  requestProjectIdea: () => {},
  requestLogIn: () => {},
};

const sampleProject: ReadonlyArray<[
  d.ProjectId,
  d.ResourceState<d.Project>
]> = [
  [
    "6b9495528e9a12186b9c210448bdc90b" as d.ProjectId,
    d.ResourceState.Loaded({
      dataMaybe: d.Maybe.Just<d.Project>({
        name: "プロジェクトA",
        createTime: { day: 0, millisecond: 0 },
        createUserId: "6b9495528e9a12186b9c210448bdc90b" as d.UserId,
        iconHash: "a3acd80b2cc41ae8977ad486a8bdad7039a6e6a5d4ac19ecb66aab3231addce4" as d.ImageToken,
        imageHash: "a3acd80b2cc41ae8977ad486a8bdad7039a6e6a5d4ac19ecb66aab3231addce4" as d.ImageToken,
        updateTime: { day: 0, millisecond: 0 },
        commitId: "4b21c121436718dda1ec3a6c356dfcde" as d.CommitId,
        rootIdeaId: "2c631445a030dc42a895fd8077eeb685" as d.IdeaId,
      }),
      getTime: { day: 0, millisecond: 0 },
    }),
  ],
  [
    "dc2c318f1cab573562497ea1e4b96c0e" as d.ProjectId,
    d.ResourceState.Loaded({
      dataMaybe: d.Maybe.Just<d.Project>({
        name: "プロジェクトB",
        createTime: { day: 0, millisecond: 0 },
        createUserId: "6b9495528e9a12186b9c210448bdc90b" as d.UserId,
        iconHash: "a3acd80b2cc41ae8977ad486a8bdad7039a6e6a5d4ac19ecb66aab3231addce4" as d.ImageToken,
        imageHash: "a3acd80b2cc41ae8977ad486a8bdad7039a6e6a5d4ac19ecb66aab3231addce4" as d.ImageToken,
        updateTime: { day: 0, millisecond: 0 },
        commitId: "ace57e8c338740d74206299be8ad081a" as d.CommitId,
        rootIdeaId: "2c631445a030dc42a895fd8077eeb685" as d.IdeaId,
      }),
      getTime: { day: 0, millisecond: 0 },
    }),
  ],
  [
    "4e7e1c9629b3eff2e908a151d501b8c6" as d.ProjectId,
    d.ResourceState.Loaded({
      dataMaybe: d.Maybe.Just<d.Project>({
        name: "プロジェクトC",
        createTime: { day: 0, millisecond: 0 },
        createUserId: "6b9495528e9a12186b9c210448bdc90b" as d.UserId,
        iconHash: "a3acd80b2cc41ae8977ad486a8bdad7039a6e6a5d4ac19ecb66aab3231addce4" as d.ImageToken,
        imageHash: "a3acd80b2cc41ae8977ad486a8bdad7039a6e6a5d4ac19ecb66aab3231addce4" as d.ImageToken,
        updateTime: { day: 0, millisecond: 0 },
        commitId: "5698010f59c9ca980de3f1c53ab16f8b" as d.CommitId,
        rootIdeaId: "2c631445a030dc42a895fd8077eeb685" as d.IdeaId,
      }),
      getTime: { day: 0, millisecond: 0 },
    }),
  ],
];

const ImageFixSizeAndWithBorder = styled(ui.Image)({
  border: "solid 1px red",
});

const IconImage: React.FC<{
  imageStaticResource: d.StaticResourceState<string>;
}> = (prop) => {
  return (
    <ImageFixSizeAndWithBorder
      imageStyle={{ width: 64, height: 64, padding: 0, round: false }}
      imageToken={"a" as d.ImageToken}
      model={{
        ...defaultModel,
        imageMap: new Map([["a" as d.ImageToken, prop.imageStaticResource]]),
      }}
    />
  );
};

const sampleComponentList = {
  header: <Header model={defaultModel} onRequestLogIn={() => {}} />,
  home: <Home model={defaultModel} />,
  homeWithProject: (
    <Home
      model={{
        ...defaultModel,
        projectMap: new Map([
          sampleProject[0],
          sampleProject[1],
          sampleProject[2],
        ]),
        createProjectState: { _: "None" },
        allProjectIdListMaybe: d.Maybe.Just(
          d.ResourceState.Loaded({
            dataMaybe: d.Maybe.Just([
              sampleProject[0][0],
              sampleProject[1][0],
              sampleProject[2][0],
            ]),
            getTime: { day: 0, millisecond: 0 },
          })
        ),
      }}
    />
  ),
  about: <About />,
  requestingImage: (
    <div>
      WaitLoading
      <IconImage imageStaticResource={d.StaticResourceState.WaitLoading()} />
      Loading
      <IconImage imageStaticResource={d.StaticResourceState.Loading()} />
      WaitRequesting
      <IconImage imageStaticResource={d.StaticResourceState.WaitRequesting()} />
      Requesting
      <IconImage imageStaticResource={d.StaticResourceState.Requesting()} />
    </div>
  ),
};

const allTab = Object.keys(sampleComponentList) as ReadonlyArray<
  keyof typeof sampleComponentList
>;
type Tab = keyof typeof sampleComponentList;

const DebugDiv = styled.div({
  display: "grid",
  gridTemplateColumns: "auto 1fr",
});

const TabListContainer = styled.div({ display: "grid", alignSelf: "start" });

const SelectedTab = styled(ui.ActiveDiv)({
  fontSize: 16,
  padding: 8,
});

const TabButton = styled(ui.Button)({
  backgroundColor: "#000",
  color: "#ddd",
  border: "none",
  padding: 8,
  fontSize: 16,
});

export const Debug: React.FC<Record<never, never>> = () => {
  const [tab, dispatchTab] = React.useState<Tab>("header");
  return (
    <DebugDiv>
      <TabListContainer>
        {allTab.map((tabName) => {
          if (tabName === tab) {
            return <SelectedTab key={tabName}>{tabName}</SelectedTab>;
          }
          return (
            <TabButton
              key={tabName}
              onClick={() => {
                dispatchTab(tabName);
              }}
            >
              {tabName}
            </TabButton>
          );
        })}
      </TabListContainer>
      {sampleComponentList[tab]}
    </DebugDiv>
  );
};

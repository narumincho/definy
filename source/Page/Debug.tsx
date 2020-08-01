import * as React from "react";
import * as ui from "../ui";
import {
  ImageToken,
  LogInState,
  Maybe,
  Project,
  ProjectId,
  ResourceState,
  StaticResourceState,
  UserId,
} from "definy-core/source/data";
import { About } from "./About";
import { Home } from "./Home";
import { Model } from "../model";
import { SidePanel } from "../SidePanel";
import styled from "styled-components";

const defaultModel: Model = {
  clientMode: "DebugMode",
  language: "English",
  logInState: LogInState.Guest,
  onJump: () => {},
  projectMap: new Map(),
  userMap: new Map(),
  imageMap: new Map(),
  allProjectIdListMaybe: Maybe.Nothing(),
  createProjectState: { _: "None" },
  requestLogOut: () => {},
  requestAllProject: () => {},
  requestProject: () => {},
  requestUser: () => {},
  requestImage: () => {},
  createProject: () => {},
};

const sampleProject: ReadonlyArray<[ProjectId, ResourceState<Project>]> = [
  [
    "6b9495528e9a12186b9c210448bdc90b" as ProjectId,
    ResourceState.Loaded({
      dataMaybe: Maybe.Just({
        name: "プロジェクトA",
        createTime: { day: 0, millisecond: 0 },
        createUserId: "6b9495528e9a12186b9c210448bdc90b" as UserId,
        getTime: { day: 0, millisecond: 0 },
        iconHash: "a3acd80b2cc41ae8977ad486a8bdad7039a6e6a5d4ac19ecb66aab3231addce4" as ImageToken,
        imageHash: "a3acd80b2cc41ae8977ad486a8bdad7039a6e6a5d4ac19ecb66aab3231addce4" as ImageToken,
        partIdList: [],
        typePartIdList: [],
        updateTime: { day: 0, millisecond: 0 },
      }),
      getTime: { day: 0, millisecond: 0 },
    }),
  ],
  [
    "dc2c318f1cab573562497ea1e4b96c0e" as ProjectId,
    ResourceState.Loaded({
      dataMaybe: Maybe.Just({
        name: "プロジェクトB",
        createTime: { day: 0, millisecond: 0 },
        createUserId: "6b9495528e9a12186b9c210448bdc90b" as UserId,
        getTime: { day: 0, millisecond: 0 },
        iconHash: "a3acd80b2cc41ae8977ad486a8bdad7039a6e6a5d4ac19ecb66aab3231addce4" as ImageToken,
        imageHash: "a3acd80b2cc41ae8977ad486a8bdad7039a6e6a5d4ac19ecb66aab3231addce4" as ImageToken,
        partIdList: [],
        typePartIdList: [],
        updateTime: { day: 0, millisecond: 0 },
      }),
      getTime: { day: 0, millisecond: 0 },
    }),
  ],
  [
    "4e7e1c9629b3eff2e908a151d501b8c6" as ProjectId,
    ResourceState.Loaded({
      dataMaybe: Maybe.Just({
        name: "プロジェクトC",
        createTime: { day: 0, millisecond: 0 },
        createUserId: "6b9495528e9a12186b9c210448bdc90b" as UserId,
        getTime: { day: 0, millisecond: 0 },
        iconHash: "a3acd80b2cc41ae8977ad486a8bdad7039a6e6a5d4ac19ecb66aab3231addce4" as ImageToken,
        imageHash: "a3acd80b2cc41ae8977ad486a8bdad7039a6e6a5d4ac19ecb66aab3231addce4" as ImageToken,
        partIdList: [],
        typePartIdList: [],
        updateTime: { day: 0, millisecond: 0 },
      }),
      getTime: { day: 0, millisecond: 0 },
    }),
  ],
];

const ImageFixSizeAndWithBorder = styled(ui.Image)({
  border: "solid 1px red",
});

const IconImage: React.FC<{
  imageStaticResource: StaticResourceState<string>;
}> = (prop) => {
  return (
    <ImageFixSizeAndWithBorder
      imageStyle={{ width: 64, height: 64, padding: 0, round: false }}
      imageToken={"a" as ImageToken}
      model={{
        ...defaultModel,
        imageMap: new Map([["a" as ImageToken, prop.imageStaticResource]]),
      }}
    />
  );
};

const sampleComponentList = {
  sidePanel: <SidePanel model={defaultModel} onRequestLogIn={() => {}} />,
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
        allProjectIdListMaybe: Maybe.Just(
          ResourceState.Loaded({
            dataMaybe: Maybe.Just([
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
      <IconImage imageStaticResource={StaticResourceState.WaitLoading()} />
      Loading
      <IconImage imageStaticResource={StaticResourceState.Loading()} />
      WaitRequesting
      <IconImage imageStaticResource={StaticResourceState.WaitRequesting()} />
      Requesting
      <IconImage imageStaticResource={StaticResourceState.Requesting()} />
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
  const [tab, dispatchTab] = React.useState<Tab>("sidePanel");
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

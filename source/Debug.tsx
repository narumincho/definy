/** @jsx jsx */

import * as React from "react";
import * as ui from "./ui";
import {
  ImageToken,
  Maybe,
  Project,
  ProjectId,
  ResourceState,
  StaticResourceState,
  UserId,
} from "definy-core/source/data";
import { About } from "./About";
import { Home } from "./Home";
import { SidePanel } from "./SidePanel";
import { jsx } from "react-free-style";

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

const sampleComponentList = {
  sidePanel: (
    <SidePanel
      model={{
        clientMode: "DebugMode",
        language: "English",
        logInState: { _: "Guest" },
        onJump: () => {},
        projectData: new Map(),
        userData: new Map(),
        imageData: new Map(),
        allProjectIdListMaybe: Maybe.Nothing(),
        requestAllProject: () => {},
        requestProject: () => {},
        requestUser: () => {},
        requestImage: () => {},
      }}
      onRequestLogIn={() => {}}
    />
  ),
  home: (
    <Home
      model={{
        clientMode: "DebugMode",
        language: "English",
        logInState: { _: "Guest" },
        onJump: () => {},
        projectData: new Map(),
        userData: new Map(),
        imageData: new Map(),
        allProjectIdListMaybe: Maybe.Nothing(),
        requestAllProject: () => {},
        requestProject: () => {},
        requestUser: () => {},
        requestImage: () => {},
      }}
    />
  ),
  homeWithProject: (
    <Home
      model={{
        clientMode: "DebugMode",
        language: "English",
        logInState: { _: "Guest" },
        onJump: () => {},
        projectData: new Map([
          sampleProject[0],
          sampleProject[1],
          sampleProject[2],
        ]),
        userData: new Map(),
        imageData: new Map(),
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
        requestAllProject: () => {},
        requestProject: () => {},
        requestUser: () => {},
        requestImage: () => {},
      }}
    />
  ),
  about: <About />,
  requestingImage: (
    <div>
      WaitLoading
      <ui.Image
        css={{ width: 64, height: 64, border: "solid 1px red" }}
        imageToken={"a" as ImageToken}
        model={{
          clientMode: "DebugMode",
          language: "English",
          logInState: { _: "Guest" },
          onJump: () => {},
          projectData: new Map(),
          userData: new Map(),
          imageData: new Map([
            ["a" as ImageToken, StaticResourceState.WaitLoading()],
          ]),
          allProjectIdListMaybe: Maybe.Nothing(),
          requestAllProject: () => {},
          requestProject: () => {},
          requestUser: () => {},
          requestImage: () => {},
        }}
      />
      Loading
      <ui.Image
        css={{ width: 64, height: 64, border: "solid 1px red" }}
        imageToken={"a" as ImageToken}
        model={{
          clientMode: "DebugMode",
          language: "English",
          logInState: { _: "Guest" },
          onJump: () => {},
          projectData: new Map(),
          userData: new Map(),
          imageData: new Map([
            ["a" as ImageToken, StaticResourceState.Loading()],
          ]),
          allProjectIdListMaybe: Maybe.Nothing(),
          requestAllProject: () => {},
          requestProject: () => {},
          requestUser: () => {},
          requestImage: () => {},
        }}
      />
      WaitRequesting
      <ui.Image
        css={{ width: 64, height: 64, border: "solid 1px red" }}
        imageToken={"a" as ImageToken}
        model={{
          clientMode: "DebugMode",
          language: "English",
          logInState: { _: "Guest" },
          onJump: () => {},
          projectData: new Map(),
          userData: new Map(),
          imageData: new Map([
            ["a" as ImageToken, StaticResourceState.WaitRequesting()],
          ]),
          allProjectIdListMaybe: Maybe.Nothing(),
          requestAllProject: () => {},
          requestProject: () => {},
          requestUser: () => {},
          requestImage: () => {},
        }}
      />
      Requesting
      <ui.Image
        css={{ width: 64, height: 64, border: "solid 1px red" }}
        imageToken={"a" as ImageToken}
        model={{
          clientMode: "DebugMode",
          language: "English",
          logInState: { _: "Guest" },
          onJump: () => {},
          projectData: new Map(),
          userData: new Map(),
          imageData: new Map([
            ["a" as ImageToken, StaticResourceState.Requesting()],
          ]),
          allProjectIdListMaybe: Maybe.Nothing(),
          requestAllProject: () => {},
          requestProject: () => {},
          requestUser: () => {},
          requestImage: () => {},
        }}
      />
    </div>
  ),
};

const allTab = Object.keys(sampleComponentList) as ReadonlyArray<
  keyof typeof sampleComponentList
>;
type Tab = keyof typeof sampleComponentList;

export const Debug: React.FC<Record<never, never>> = () => {
  const [tab, dispatchTab] = React.useState<Tab>("sidePanel");
  return (
    <div css={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <div css={{ display: "grid", alignSelf: "start" }}>
        {allTab.map((tabName) => {
          if (tabName === tab) {
            return (
              <ui.ActiveDiv
                css={{
                  fontSize: 16,
                  padding: 8,
                }}
                key={tabName}
              >
                {tabName}
              </ui.ActiveDiv>
            );
          }
          return (
            <ui.Button
              css={{
                backgroundColor: "#000",
                color: "#ddd",
                border: "none",
                padding: 8,
                fontSize: 16,
              }}
              key={tabName}
              onClick={() => {
                dispatchTab(tabName);
              }}
            >
              {tabName}
            </ui.Button>
          );
        })}
      </div>
      {sampleComponentList[tab]}
    </div>
  );
};

export default {
  title: "App",
  component: { SidePanel, Home },
};

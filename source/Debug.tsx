/** @jsx jsx */

import * as React from "react";
import * as ui from "./ui";
import { About } from "./About";
import { Home } from "./Home";
import { Resource } from "./data";
import { SidePanel } from "./SidePanel";
import { data } from "definy-common";
import { jsx } from "react-free-style";

const sampleProject: ReadonlyArray<[
  data.ProjectId,
  Resource<data.Maybe<data.Project>>
]> = [
  [
    "6b9495528e9a12186b9c210448bdc90b" as data.ProjectId,

    Resource.Loaded(
      data.Maybe.Just({
        name: "プロジェクトA",
        createTime: { day: 0, millisecond: 0 },
        createUserId: "6b9495528e9a12186b9c210448bdc90b" as data.UserId,
        getTime: { day: 0, millisecond: 0 },
        iconHash: "a3acd80b2cc41ae8977ad486a8bdad7039a6e6a5d4ac19ecb66aab3231addce4" as data.ImageToken,
        imageHash: "a3acd80b2cc41ae8977ad486a8bdad7039a6e6a5d4ac19ecb66aab3231addce4" as data.ImageToken,
        partIdList: [],
        typePartIdList: [],
        updateTime: { day: 0, millisecond: 0 },
      })
    ),
  ],
  [
    "dc2c318f1cab573562497ea1e4b96c0e" as data.ProjectId,
    Resource.Loaded(
      data.Maybe.Just({
        name: "プロジェクトB",
        createTime: { day: 0, millisecond: 0 },
        createUserId: "6b9495528e9a12186b9c210448bdc90b" as data.UserId,
        getTime: { day: 0, millisecond: 0 },
        iconHash: "a3acd80b2cc41ae8977ad486a8bdad7039a6e6a5d4ac19ecb66aab3231addce4" as data.ImageToken,
        imageHash: "a3acd80b2cc41ae8977ad486a8bdad7039a6e6a5d4ac19ecb66aab3231addce4" as data.ImageToken,
        partIdList: [],
        typePartIdList: [],
        updateTime: { day: 0, millisecond: 0 },
      })
    ),
  ],
  [
    "4e7e1c9629b3eff2e908a151d501b8c6" as data.ProjectId,
    Resource.Loaded(
      data.Maybe.Just({
        name: "プロジェクトC",
        createTime: { day: 0, millisecond: 0 },
        createUserId: "6b9495528e9a12186b9c210448bdc90b" as data.UserId,
        getTime: { day: 0, millisecond: 0 },
        iconHash: "a3acd80b2cc41ae8977ad486a8bdad7039a6e6a5d4ac19ecb66aab3231addce4" as data.ImageToken,
        imageHash: "a3acd80b2cc41ae8977ad486a8bdad7039a6e6a5d4ac19ecb66aab3231addce4" as data.ImageToken,
        partIdList: [],
        typePartIdList: [],
        updateTime: { day: 0, millisecond: 0 },
      })
    ),
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
        allProjectIdListMaybe: data.Maybe.Nothing(),
        requestAllProject: () => {},
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
        allProjectIdListMaybe: data.Maybe.Nothing(),
        requestAllProject: () => {},
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
        allProjectIdListMaybe: data.Maybe.Just(
          Resource.Loaded([
            sampleProject[0][0],
            sampleProject[1][0],
            sampleProject[2][0],
          ])
        ),
        requestAllProject: () => {},
        requestImage: () => {},
      }}
    />
  ),
  about: <About />,
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

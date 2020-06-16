import * as React from "react";
import * as ui from "./ui";
import { SidePanel } from "./SidePanel";
import { Home } from "./Home";
import { About } from "./About";
import { data } from "definy-common";
import { Context, StyleSheetRenderer } from "react-free-style";
import { Resource } from "./data";

type Tab = "SidePanel" | "Home" | "HomeWithProject";

export const Debug: React.FC<Record<never, never>> = () => {
  const [tab, dispatchTab] = React.useState<Tab>("SidePanel");
  return (
    <div>
      <div>
        <button
          onClick={() => {
            dispatchTab("SidePanel");
          }}
        >
          SidePanel
        </button>
        <button
          onClick={() => {
            dispatchTab("Home");
          }}
        >
          Home
        </button>
        <button
          onClick={() => {
            dispatchTab("HomeWithProject");
          }}
        >
          HomeWithProject
        </button>
      </div>
      <DebugMain tab={tab} />
    </div>
  );
};

const DebugMain: React.FC<{ tab: Tab }> = (prop) => {
  switch (prop.tab) {
    case "SidePanel":
      return <SidePanelComp />;
    case "Home":
      return <HomeComp />;
    case "HomeWithProject":
      return <HomeWithProject />;
  }
};

export default {
  title: "App",
  component: { SidePanel, Home },
};

export const SidePanelComp = () => (
  <Context.Provider value={new StyleSheetRenderer()}>
    <style>{ui.commonStyle}</style>
    <SidePanel
      onRequestLogIn={() => {}}
      model={{
        clientMode: "DebugMode",
        language: "English",
        logInState: { _: "Guest" },
        onJump: () => {},
        projectData: new Map(),
        allProjectDataRequestState: "Respond",
      }}
    />
  </Context.Provider>
);

export const HomeComp = () => (
  <Context.Provider value={new StyleSheetRenderer()}>
    <style>{ui.commonStyle}</style>
    <Home
      model={{
        clientMode: "DebugMode",
        language: "English",
        logInState: { _: "Guest" },
        onJump: () => {},
        projectData: new Map(),
        allProjectDataRequestState: "Respond",
      }}
    />
  </Context.Provider>
);

const sampleProject: ReadonlyArray<[
  data.ProjectId,
  Resource<data.ProjectSnapshot>
]> = [
  [
    "6b9495528e9a12186b9c210448bdc90b" as data.ProjectId,
    Resource.Loaded({
      name: "プロジェクトA",
      createTime: { day: 0, millisecond: 0 },
      createUserId: "6b9495528e9a12186b9c210448bdc90b" as data.UserId,
      getTime: { day: 0, millisecond: 0 },
      iconHash: "a3acd80b2cc41ae8977ad486a8bdad7039a6e6a5d4ac19ecb66aab3231addce4" as data.ImageToken,
      imageHash: "a3acd80b2cc41ae8977ad486a8bdad7039a6e6a5d4ac19ecb66aab3231addce4" as data.ImageToken,
      partIdList: [],
      typePartIdList: [],
      updateTime: { day: 0, millisecond: 0 },
    }),
  ],
  [
    "dc2c318f1cab573562497ea1e4b96c0e" as data.ProjectId,
    Resource.Loaded({
      name: "プロジェクトB",
      createTime: { day: 0, millisecond: 0 },
      createUserId: "6b9495528e9a12186b9c210448bdc90b" as data.UserId,
      getTime: { day: 0, millisecond: 0 },
      iconHash: "a3acd80b2cc41ae8977ad486a8bdad7039a6e6a5d4ac19ecb66aab3231addce4" as data.ImageToken,
      imageHash: "a3acd80b2cc41ae8977ad486a8bdad7039a6e6a5d4ac19ecb66aab3231addce4" as data.ImageToken,
      partIdList: [],
      typePartIdList: [],
      updateTime: { day: 0, millisecond: 0 },
    }),
  ],
  [
    "4e7e1c9629b3eff2e908a151d501b8c6" as data.ProjectId,
    Resource.Loaded({
      name: "プロジェクトC",
      createTime: { day: 0, millisecond: 0 },
      createUserId: "6b9495528e9a12186b9c210448bdc90b" as data.UserId,
      getTime: { day: 0, millisecond: 0 },
      iconHash: "a3acd80b2cc41ae8977ad486a8bdad7039a6e6a5d4ac19ecb66aab3231addce4" as data.ImageToken,
      imageHash: "a3acd80b2cc41ae8977ad486a8bdad7039a6e6a5d4ac19ecb66aab3231addce4" as data.ImageToken,
      partIdList: [],
      typePartIdList: [],
      updateTime: { day: 0, millisecond: 0 },
    }),
  ],
];

export const HomeWithProject = () => (
  <Context.Provider value={new StyleSheetRenderer()}>
    <style>{ui.commonStyle}</style>
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
        allProjectDataRequestState: "Respond",
      }}
    />
  </Context.Provider>
);

export const AboutComp = () => (
  <Context.Provider value={new StyleSheetRenderer()}>
    <style>{ui.commonStyle}</style>
    <About />
  </Context.Provider>
);

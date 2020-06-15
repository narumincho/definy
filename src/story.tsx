import * as React from "react";
import * as ui from "./ui";
import { SidePanel } from "./SidePanel";
import { Home } from "./Home";
import { About } from "./About";
import { data } from "definy-common";
import { Context, StyleSheetRenderer } from "react-free-style";
import { Resource } from "./model";

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
    {
      _: "Loaded",
      snapshot: {
        name: "プロジェクトA",
        createTime: { day: 0, millisecond: 0 },
        createUserId: "6b9495528e9a12186b9c210448bdc90b" as data.UserId,
        getTime: { day: 0, millisecond: 0 },
        iconHash: "a3acd80b2cc41ae8977ad486a8bdad7039a6e6a5d4ac19ecb66aab3231addce4" as data.ImageToken,
        imageHash: "a3acd80b2cc41ae8977ad486a8bdad7039a6e6a5d4ac19ecb66aab3231addce4" as data.ImageToken,
        partIdList: [],
        typePartIdList: [],
        updateTime: { day: 0, millisecond: 0 },
      },
    },
  ],
  [
    "dc2c318f1cab573562497ea1e4b96c0e" as data.ProjectId,
    {
      _: "Loaded",
      snapshot: {
        name: "プロジェクトB",
        createTime: { day: 0, millisecond: 0 },
        createUserId: "6b9495528e9a12186b9c210448bdc90b" as data.UserId,
        getTime: { day: 0, millisecond: 0 },
        iconHash: "a3acd80b2cc41ae8977ad486a8bdad7039a6e6a5d4ac19ecb66aab3231addce4" as data.ImageToken,
        imageHash: "a3acd80b2cc41ae8977ad486a8bdad7039a6e6a5d4ac19ecb66aab3231addce4" as data.ImageToken,
        partIdList: [],
        typePartIdList: [],
        updateTime: { day: 0, millisecond: 0 },
      },
    },
  ],
  [
    "4e7e1c9629b3eff2e908a151d501b8c6" as data.ProjectId,
    {
      _: "Loaded",
      snapshot: {
        name: "プロジェクトC",
        createTime: { day: 0, millisecond: 0 },
        createUserId: "6b9495528e9a12186b9c210448bdc90b" as data.UserId,
        getTime: { day: 0, millisecond: 0 },
        iconHash: "a3acd80b2cc41ae8977ad486a8bdad7039a6e6a5d4ac19ecb66aab3231addce4" as data.ImageToken,
        imageHash: "a3acd80b2cc41ae8977ad486a8bdad7039a6e6a5d4ac19ecb66aab3231addce4" as data.ImageToken,
        partIdList: [],
        typePartIdList: [],
        updateTime: { day: 0, millisecond: 0 },
      },
    },
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

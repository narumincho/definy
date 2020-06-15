import * as React from "react";
import { SidePanel } from "./SidePanel";
import { Home } from "./Home";
import { Location } from "definy-common/source/data";
import { Context, StyleSheetRenderer } from "react-free-style";

export default {
  title: "App",
  component: { SidePanel, Home },
};

export const SidePanelComp = () => (
  <Context.Provider value={new StyleSheetRenderer()}>
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

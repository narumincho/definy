import type { ReactNode, JSX } from "react";
import { ActivityBar } from "./ActivityBar.tsx";
import { CommandPalette } from "./CommandPalette.tsx";
import { ExplorerSidebar } from "./ExplorerSidebar.tsx";
import { Header } from "./Header.tsx";
import { RunPanel } from "./RunPanel.tsx";
import { StatusBar } from "./StatusBar.tsx";
import { useDefiny } from "../state.tsx";

export function Workbench({
  children,
}: {
  readonly children: ReactNode;
}): JSX.Element {
  const { sidebarOpen, setSidebarOpen } = useDefiny();

  return (
    <div className={`workbench ${sidebarOpen ? "sidebar-open" : ""}`}>
      <Header />
      <ActivityBar />
      <ExplorerSidebar />

      <div
        className="sidebar-scrim"
        onClick={() => {
          setSidebarOpen(false);
        }}
        aria-hidden="true"
      />

      <main id="main-content" className="workbench-editor">
        <div className="workbench-editor-scroll">{children}</div>
        <RunPanel />
      </main>

      <StatusBar />
      <CommandPalette />
    </div>
  );
}

import type { ReactNode, JSX } from "react";
import "../src/main.css";
import { Workbench } from "../src/components/Workbench.tsx";
import { DefinyProvider } from "../src/state.tsx";

export default function RootLayout({
  children,
}: {
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <DefinyProvider>
      <Workbench>{children}</Workbench>
    </DefinyProvider>
  );
}

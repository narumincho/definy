import React from "https://esm.sh/react@18.2.0?pin=v119";
import { Language } from "../../zodType.ts";
import { styled } from "https://esm.sh/@stitches/react@1.2.8?pin=v119";
import { PageLocation } from "./location.ts";

const StyledContainer = styled("div", {
  backgroundColor: "black",
  color: "white",
  height: "100%",
  fontFamily: "Hack",
  display: "grid",
  gridTemplateRows: "48px 1fr",
});

const StyledHeader = styled("div", {
  display: "flex",
  alignItems: "center",
  backgroundColor: "#333",
  padding: "0 8px",
});

const StyledLogo = styled("div", {
  color: "#b9d09b",
  fontSize: 32,
  lineHeight: "1",
});

const Spacer = styled("div", {
  flexGrow: "1",
});

export type AppProps = {
  readonly language: Language;
  readonly location: PageLocation | undefined;
  readonly onChangeUrl?: ((newURL: URL) => void) | undefined;
  readonly onChangeLanguage?: ((language: Language) => void) | undefined;
};

type LogInState = "noLogIn" | "requestingLogInUrl" | "jumping" | "error";

export const App = (props: AppProps): React.ReactElement => {
  return <div>commection の UIは構想中</div>;
};

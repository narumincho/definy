import * as React from "react";
import * as ui from "./ui";
import styled from "styled-components";

const AboutDiv = styled.div({ padding: 16 });

export const About: React.FC<Record<never, never>> = () => {
  return (
    <AboutDiv>
      <div>DefinyはWebアプリのためのWebアプリです </div>
      <GitHubLink />
    </AboutDiv>
  );
};

const GitHubLinkA = (() => {
  const theme = ui.areaThemeToValue("Gray");
  return styled.a({
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    gap: 8,
    padding: 16,
    color: theme.color,
    backgroundColor: theme.backgroundColor,
    "&:hover": {
      color: theme.hoveredColor,
      backgroundColor: theme.hoveredBackgroundColor,
    },
    borderRadius: 8,
    textDecoration: "none",
    alignItems: "center",
  });
})();

const GitHubIconContainer = styled.div({ width: 32, height: 32 });

const GitHubLink = () => {
  return (
    <GitHubLinkA href="https://github.com/narumincho/Definy">
      <GitHubIconContainer>
        <ui.GitHubIcon color="#ddd" />
      </GitHubIconContainer>
      <div>GitHub: narumincho/Definy</div>
    </GitHubLinkA>
  );
};

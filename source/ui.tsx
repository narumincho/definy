/* eslint-disable react/forbid-component-props */
import * as React from "react";
import {
  ImageToken,
  Location,
  Maybe,
  ProjectId,
  ResourceState,
  UrlData,
  UserId,
} from "definy-core/source/data";
import styled, { CSSObject, keyframes } from "styled-components";
import { Model } from "./model";
import { urlDataAndAccessTokenToUrl } from "definy-core";

export type AreaTheme = "Gray" | "Black" | "Active";

export type AreaThemeValue = {
  readonly backgroundColor: string;
  readonly hoveredBackgroundColor: string;
  readonly color: string;
  readonly hoveredColor: string;
};

export const areaThemeToValue = (areaTheme: AreaTheme): AreaThemeValue => {
  switch (areaTheme) {
    case "Gray":
      return {
        backgroundColor: "#242424",
        hoveredBackgroundColor: "#2f2f2f",
        color: "#ddd",
        hoveredColor: "#dfdfdf",
      };
    case "Black":
      return {
        backgroundColor: "#000",
        hoveredBackgroundColor: "#111",
        color: "#ddd",
        hoveredColor: "#dfdfdf",
      };
    case "Active":
      return {
        backgroundColor: "#f0932b",
        hoveredBackgroundColor: "#f69d3a",
        color: "#000",
        hoveredColor: "#000",
      };
  }
};

const LinkA = styled.a((prop: { areaTheme: AreaTheme }) => {
  const theme = areaThemeToValue(prop.areaTheme);
  return {
    display: "block",
    textDecoration: "none",
    color: theme.color,
    backgroundColor: theme.backgroundColor,
    "&:hover": {
      color: theme.hoveredColor,
      backgroundColor: theme.hoveredBackgroundColor,
    },
  };
});

export const Link: React.FC<{
  urlData: UrlData;
  onJump: (urlData: UrlData) => void;
  areaTheme: AreaTheme;
  className?: string;
}> = (prop): JSX.Element => {
  return (
    <LinkA
      areaTheme={prop.areaTheme}
      className={prop.className}
      href={urlDataAndAccessTokenToUrl(
        prop.urlData,
        Maybe.Nothing()
      ).toString()}
      onClick={(event) => {
        if (
          !event.ctrlKey &&
          !event.metaKey &&
          !event.shiftKey &&
          event.button === 0
        ) {
          event.preventDefault();
          prop.onJump(prop.urlData);
        }
      }}
    >
      {prop.children}
    </LinkA>
  );
};

const StyledButton = styled.button({
  cursor: "pointer",
  border: "none",
  padding: 0,
  textAlign: "left",
});

export const Button: React.FC<{
  onClick: () => void;
  className?: string;
}> = (prop) => (
  <StyledButton className={prop.className} onClick={prop.onClick} type="button">
    {prop.children}
  </StyledButton>
);

const LoadingBoxDiv = styled.div({
  display: "grid",
  overflow: "hidden",
  justifyItems: "center",
});

export const LoadingBox: React.FC<Record<never, never>> = (prop) => (
  <LoadingBoxDiv>
    {prop.children}
    <LoadingDefinyIcon />
  </LoadingBoxDiv>
);

const rotationAnimationKeyframes = keyframes`
0% {
  transform: rotate(0)
}
100% {
  transform: rotate(1turn)
}`;

const LoadingDefinyIconDiv = styled.div`
  width: 96px;
  height: 96px;
  display: grid;
  justify-items: center;
  align-items: center;
  border-radius: 50%;
  animation: 1s ${rotationAnimationKeyframes} infinite linear;
  fontsize: 24px;
  padding: 8px;
  color: ${areaThemeToValue("Gray").color};
  background-color: ${areaThemeToValue("Gray").backgroundColor};
`;

export const LoadingDefinyIcon: React.FC<Record<never, never>> = () => (
  <LoadingDefinyIconDiv>Definy</LoadingDefinyIconDiv>
);

export const GitHubIcon: React.FC<{ color: string }> = (prop) => (
  <svg viewBox="0 0 20 20">
    <path
      d="M10 0C4.476 0 0 4.477 0 10c0 4.418 2.865 8.166 6.84 9.49.5.09.68-.218.68-.483 0-.237-.007-.866-.012-1.7-2.782.603-3.37-1.34-3.37-1.34-.454-1.157-1.11-1.464-1.11-1.464-.907-.62.07-.608.07-.608 1.003.07 1.53 1.03 1.53 1.03.893 1.53 2.342 1.087 2.912.83.09-.645.35-1.085.634-1.335-2.22-.253-4.555-1.11-4.555-4.943 0-1.09.39-1.984 1.03-2.683-.105-.253-.448-1.27.096-2.647 0 0 .84-.268 2.75 1.026C8.294 4.95 9.15 4.84 10 4.836c.85.004 1.705.115 2.504.337 1.91-1.294 2.747-1.026 2.747-1.026.548 1.377.204 2.394.1 2.647.64.7 1.03 1.592 1.03 2.683 0 3.842-2.34 4.687-4.566 4.935.36.308.678.92.678 1.852 0 1.336-.01 2.415-.01 2.743 0 .267.18.578.687.48C17.14 18.163 20 14.417 20 10c0-5.522-4.478-10-10-10"
      fill={prop.color}
    />
  </svg>
);

export const ActiveDiv = (() => {
  const activeTheme = areaThemeToValue("Active");
  return styled.div({
    backgroundColor: activeTheme.backgroundColor,
    color: activeTheme.color,
  });
})();

const CenterDiv = styled.div({
  display: "grid",
  justifyContent: "center",
  alignContent: "center",
});

export const CommonResourceStateView = <data extends unknown>(prop: {
  resourceState: ResourceState<data> | undefined;
}): React.ReactElement<any, any> | null => {
  if (prop.resourceState === undefined) {
    return <div>...</div>;
  }
  switch (prop.resourceState._) {
    case "WaitLoading":
      return (
        <CenterDiv>
          <NewLoadingIcon isWait />
        </CenterDiv>
      );
    case "Loading":
      return (
        <CenterDiv>
          <NewLoadingIcon isWait={false} />
        </CenterDiv>
      );
    case "WaitRequesting":
      return (
        <CenterDiv>
          <NewLoadingIcon isWait />
        </CenterDiv>
      );
    case "Requesting":
      return (
        <CenterDiv>
          <NewLoadingIcon isWait={false} />
        </CenterDiv>
      );
    case "WaitRetrying":
      return <CenterDiv>WRetry</CenterDiv>;
    case "Retrying":
      return <CenterDiv>Retry</CenterDiv>;
    case "WaitUpdating":
      return <CenterDiv>WU</CenterDiv>;
    case "Updating":
      return <CenterDiv>Updating</CenterDiv>;
    case "Loaded":
      if (prop.resourceState.dataResource.dataMaybe._ === "Just") {
        return (
          <div>
            {JSON.stringify(prop.resourceState.dataResource.dataMaybe.value)}
          </div>
        );
      }
      return <CenterDiv>?</CenterDiv>;
    case "Unknown":
      return <CenterDiv>Unknown</CenterDiv>;
  }
};

type ImageStyle = {
  width: number;
  height: number;
  padding: number;
  round: boolean;
};

const ImageStyledDiv = styled.div((prop: { imageStyle: ImageStyle }) =>
  imageStyleToCSSObject(prop.imageStyle)
);

const ImageStyledImg = styled.img((prop: { imageStyle: ImageStyle }) =>
  imageStyleToCSSObject(prop.imageStyle)
);

const imageStyleToCSSObject = (imageStyle: ImageStyle): CSSObject => ({
  width: imageStyle.width,
  height: imageStyle.height,
  padding: imageStyle.padding,
  borderRadius: imageStyle.round ? "50%" : undefined,
});

export const Image: React.FC<{
  model: Model;
  imageToken: ImageToken;
  imageStyle: ImageStyle;
  className?: string;
}> = (prop) => {
  React.useEffect(() => {
    prop.model.requestImage(prop.imageToken);
  });
  const blobUrlResource = prop.model.imageMap.get(prop.imageToken);
  if (blobUrlResource === undefined) {
    return (
      <ImageStyledDiv imageStyle={prop.imageStyle}>
        <CenterDiv>...</CenterDiv>
      </ImageStyledDiv>
    );
  }
  switch (blobUrlResource._) {
    case "WaitLoading":
      return (
        <ImageStyledDiv imageStyle={prop.imageStyle}>
          <CenterDiv>
            <NewLoadingIcon isWait />
          </CenterDiv>
        </ImageStyledDiv>
      );
    case "Loading":
      return (
        <ImageStyledDiv imageStyle={prop.imageStyle}>
          <CenterDiv>
            <NewLoadingIcon isWait={false} />
          </CenterDiv>
        </ImageStyledDiv>
      );
    case "WaitRequesting":
      return (
        <ImageStyledDiv imageStyle={prop.imageStyle}>
          <CenterDiv>
            <RequestingIcon isWait />
          </CenterDiv>
        </ImageStyledDiv>
      );
    case "Requesting":
      return (
        <ImageStyledDiv imageStyle={prop.imageStyle}>
          <CenterDiv>
            <RequestingIcon isWait={false} />
          </CenterDiv>
        </ImageStyledDiv>
      );
    case "WaitRetrying":
      return (
        <ImageStyledDiv imageStyle={prop.imageStyle}>
          <CenterDiv>再挑戦準備中</CenterDiv>
        </ImageStyledDiv>
      );
    case "Retrying":
      return (
        <ImageStyledDiv imageStyle={prop.imageStyle}>
          <CenterDiv>再挑戦中</CenterDiv>
        </ImageStyledDiv>
      );
    case "Unknown":
      return (
        <ImageStyledDiv imageStyle={prop.imageStyle}>
          <CenterDiv>取得に失敗</CenterDiv>
        </ImageStyledDiv>
      );
    case "Loaded":
      return (
        <ImageStyledImg
          imageStyle={prop.imageStyle}
          src={blobUrlResource.data}
        />
      );
  }
};

const StyledUserResourceState = styled(CommonResourceStateView)({
  width: "100%",
  height: 32,
});

const UserDiv = styled.div({
  display: "grid",
  gridTemplateColumns: "32px 1fr",
  height: 32,
  alignItems: "center",
  gap: 8,
  padding: 8,
});

export const User: React.FC<{
  model: Model;
  userId: UserId;
}> = (prop) => {
  React.useEffect(() => {
    prop.model.requestUser(prop.userId);
  });
  const userResource = prop.model.userMap.get(prop.userId);
  if (
    userResource?._ === "Loaded" &&
    userResource.dataResource.dataMaybe._ === "Just"
  ) {
    return (
      <UserDiv>
        <UserImage
          imageStyle={{ width: 32, height: 32, padding: 0, round: true }}
          imageToken={userResource.dataResource.dataMaybe.value.imageHash}
          model={prop.model}
        />
        {userResource.dataResource.dataMaybe.value.name}
      </UserDiv>
    );
  }
  return <StyledUserResourceState resourceState={userResource} />;
};

const UserImage = styled(Image)({ width: 32, height: 32, borderRadius: "50%" });

const ProjectLink = styled(Link)({
  display: "grid",
  gridTemplateRows: "128px 48px",
  width: 256,
});

const ProjectIconAndName = styled.div({
  display: "grid",
  gridTemplateColumns: "32px 1fr",
  gap: 8,
  alignItems: "center",
  padding: 8,
});

export const Project: React.FC<{
  model: Model;
  projectId: ProjectId;
}> = (prop) => {
  React.useEffect(() => {
    prop.model.requestProject(prop.projectId);
  });
  const projectResource = prop.model.projectMap.get(prop.projectId);
  if (
    projectResource?._ === "Loaded" &&
    projectResource.dataResource.dataMaybe._ === "Just"
  ) {
    return (
      <ProjectLink
        areaTheme="Gray"
        onJump={prop.model.onJump}
        urlData={{
          ...prop.model,
          location: Location.Project(prop.projectId),
        }}
      >
        <Image
          imageStyle={{
            width: 250,
            height: 100,
            padding: 0,
            round: false,
          }}
          imageToken={projectResource.dataResource.dataMaybe.value.imageHash}
          model={prop.model}
        />
        <ProjectIconAndName>
          <Image
            imageStyle={{
              width: 32,
              height: 32,
              padding: 0,
              round: false,
            }}
            imageToken={projectResource.dataResource.dataMaybe.value.iconHash}
            model={prop.model}
          />
          {projectResource.dataResource.dataMaybe.value.name}
        </ProjectIconAndName>
      </ProjectLink>
    );
  }
  return <StyledUserResourceState resourceState={projectResource} />;
};

const NormalSizeSvg = styled.svg({ width: 32, height: 32 });

const NewLoadingIcon: React.FC<{ isWait: boolean }> = (prop) => (
  <NormalSizeSvg viewBox="0 0 40 40">
    <circle cx={20} cy={20} r={8} stroke="#eee">
      <animate
        attributeName="r"
        dur={1}
        repeatCount="indefinite"
        values={prop.isWait ? "12" : "12;0"}
      />
      <animate
        attributeName="stroke"
        dur={1}
        repeatCount="indefinite"
        values="#eee;transparent"
      />
    </circle>
  </NormalSizeSvg>
);

const RequestingIcon: React.FC<{ isWait: boolean }> = (prop) => (
  <NormalSizeSvg viewBox="0 0 40 40">
    {new Array(5).fill(0).map((_, index) => {
      return (
        <circle
          cx={20}
          cy={index * 10}
          fill="transparent"
          key={index.toString()}
          r={3}
          stroke="#eee"
        >
          <animate
            attributeName="cy"
            dur={0.2}
            repeatCount="indefinite"
            values={
              prop.isWait
                ? (index * 10 - 5).toString()
                : (index * 10 - 5).toString() +
                  ";" +
                  (index * 10 + 5).toString()
            }
          />
        </circle>
      );
    })}
  </NormalSizeSvg>
);

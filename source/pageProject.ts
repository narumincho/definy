import * as d from "definy-core/source/data";
import {
  Component,
  FunctionComponent,
  ReactElement,
  createElement as h,
} from "react";
import { Icon } from "./icon";
import { Image } from "./image";
import { Model } from "./model";
import { TypePartListEditor } from "./typePartListEditor";
import { User } from "./user";
import styled from "styled-components";

type Props = {
  readonly projectId: d.ProjectId;
  readonly model: Model;
};

export class PageProject extends Component<Props> {
  constructor(props: Props) {
    super(props);
    props.model.requestProject(props.projectId);
    props.model.requestTypePartInProject(props.projectId);
  }

  render(): ReactElement {
    const projectState = this.props.model.projectMap.get(this.props.projectId);
    if (projectState === undefined) {
      return h(StyledPageProject, {}, "...");
    }
    switch (projectState._) {
      case "WaitLoading":
      case "Loading":
        return h(StyledPageProject, {}, h(Icon, { iconType: "Loading" }));
      case "WaitRequesting":
      case "Requesting":
        return h(StyledPageProject, {}, h(Icon, { iconType: "Requesting" }));
      case "Unknown":
      case "Updating":
        return h(StyledPageProject, {}, "?");
      case "Loaded":
        if (projectState.dataResource.dataMaybe._ === "Nothing") {
          return h(StyledPageProject, {}, "??");
        }
        return h(
          StyledPageProject,
          {},
          h(ProjectMain, {
            model: this.props.model,
            project: projectState.dataResource.dataMaybe.value,
            projectId: this.props.projectId,
          })
        );
    }
    return h(StyledPageProject, {}, "www");
  }
}

const StyledPageProject = styled.div({
  display: "grid",
  gridTemplateColumns: "1fr",
  gridTemplateRows: "100%",
  justifyItems: "center",
  alignContent: "start",
  height: "100%",
  overflow: "auto",
});

const ProjectMain: FunctionComponent<{
  model: Model;
  project: d.Project;
  projectId: d.ProjectId;
}> = (props) => {
  return h(StyledProjectMain, {}, [
    h(ProjectIconAndName, { key: "iconAndName" }, [
      h(ProjectIcon, {
        imageToken: props.project.iconHash,
        model: props.model,
        key: "icon",
        alternativeText: props.project.name + "のアイコン",
      }),
      h("div", { key: "name" }, [props.project.name]),
    ]),
    h(ProjectImage, {
      imageToken: props.project.imageHash,
      model: props.model,
      key: "project-icon",
      alternativeText: "image",
    }),
    h("div", { key: "creator" }, [
      "作成者",
      h(User, {
        model: props.model,
        userId: props.project.createUserId,
        key: "creator-link",
      }),
    ]),
    h(TypePartListEditor, {
      model: props.model,
      projectId: props.projectId,
      key: "typePartListEditor",
    }),
  ]);
};

const StyledProjectMain = styled.div({
  padding: 16,
  display: "grid",
  gap: 4,
  alignContent: "start",
});

const ProjectIconAndName = styled.h1({
  padding: 8,
  display: "grid",
  alignItems: "center",
  gridTemplateColumns: "48px 1fr",
  gap: 8,
  width: "100%",
  margin: 0,
});

const ProjectIcon = styled(Image)({
  width: 48,
  height: 48,
});

const ProjectImage = styled(Image)({
  width: 512,
  height: 316.5,
});

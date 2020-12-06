import * as d from "definy-core/source/data";
import { Component, ReactElement } from "react";
import { Icon } from "./icon";
import { Model } from "./model";
import { TypePartListEditorLoaded } from "./typePartListEditorLoaded";
import { jsx as h } from "@emotion/react";

export type Props = {
  readonly model: Model;
  readonly projectId: d.ProjectId;
};

export class TypePartListEditor extends Component<Props, never> {
  constructor(props: Props) {
    super(props);
    props.model.requestTypePartInProject(props.projectId);
  }

  getLoadedTypePartList(): ReadonlyMap<d.TypePartId, d.TypePart> | undefined {
    if (this.props.model.getTypePartInProjectState._ === "Requesting") {
      return undefined;
    }
    const result: Map<d.TypePartId, d.TypePart> = new Map();
    for (const [id, typePartState] of this.props.model.typePartMap) {
      const typePart = getTypePartInResourceState(
        typePartState,
        this.props.projectId
      );
      if (typePart !== undefined) {
        result.set(id, typePart);
      }
    }
    return result;
  }

  render(): ReactElement {
    const loadedTypePartList = this.getLoadedTypePartList();
    return h(
      "div",
      {},
      loadedTypePartList === undefined
        ? h(Icon, { iconType: "Requesting" })
        : h(TypePartListEditorLoaded, {
            projectId: this.props.projectId,
            initTypePartList: loadedTypePartList,
            model: this.props.model,
          })
    );
  }
}

const getTypePartInResourceState = (
  typePartResourceState: d.ResourceState<d.TypePart>,
  projectId: d.ProjectId
): d.TypePart | undefined => {
  if (typePartResourceState._ !== "Loaded") {
    return;
  }
  if (typePartResourceState.dataWithTime.data.projectId !== projectId) {
    return;
  }
  return typePartResourceState.dataWithTime.data;
};

import * as d from "definy-core/source/data";
import {
  Component,
  FunctionComponent,
  ReactElement,
  createElement as h,
} from "react";
import { Button } from "./button";
import { Model } from "./model";

export type Props = {
  readonly model: Model;
  readonly projectId: d.ProjectId;
};

export class TypePartListEditor extends Component<Props> {
  constructor(props: Props) {
    super(props);
    props.model.requestTypePartInProject(props.projectId);
  }

  addTypePart(): void {
    console.log("addTypePart!");
  }

  render(): ReactElement {
    return h("div", {}, [
      ...[...this.props.model.typePartMap]
        .filter(
          ([_, typePart]) =>
            typePart._ === "Loaded" &&
            typePart.dataResource.dataMaybe._ === "Just" &&
            typePart.dataResource.dataMaybe.value.projectId ===
              this.props.projectId
        )
        .map(([typePartId, typePartResourceState]) => {
          switch (typePartResourceState._) {
            case "Loaded": {
              if (typePartResourceState.dataResource.dataMaybe._ === "Just") {
                return h(TypePart, {
                  key: typePartId,
                  typePart: typePartResourceState.dataResource.dataMaybe.value,
                });
              }
            }
          }
          return h("div", { key: typePartId }, "...");
        }),
      h(
        Button,
        {
          onClick: this.addTypePart,
          key: "typePartAddButton",
        },
        ["型パーツ追加"]
      ),
    ]);
  }
}

const TypePart: FunctionComponent<{ typePart: d.TypePart }> = (props) =>
  h("div", {}, props.typePart.name);

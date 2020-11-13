import * as d from "definy-core/source/data";
import {
  Component,
  FunctionComponent,
  ReactElement,
  createElement as h,
} from "react";
import { Button } from "./button";
import { Model } from "./model";
import { MultiLineTextInput } from "./multiLineTextInput";
import { OneLineTextInput } from "./oneLineTextInput";
import styled from "styled-components";

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
    return h(StyledTypePartListEditor, {}, [
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
                return h(TypePartEditor, {
                  key: typePartId,
                  typePartId,
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

const StyledTypePartListEditor = styled.div({
  display: "grid",
  gap: 8,
});

const TypePartEditor: FunctionComponent<{
  typePartId: d.TypePartId;
  typePart: d.TypePart;
}> = (props) =>
  h(StyledTypePartEditor, {}, [
    h(
      EditorLabel,
      {
        key: "name",
      },
      [
        "name",
        h(OneLineTextInput, {
          name: "typePartName-" + props.typePartId,
          value: props.typePart.name,
          onChange: () => {},
          key: "input",
        }),
      ]
    ),
    h(
      EditorLabel,
      {
        key: "description",
      },
      [
        "description",
        h(MultiLineTextInput, {
          name: "typePartDescription-" + props.typePartId,
          initValue: props.typePart.description,
          onChange: () => {},
          key: "input",
        }),
      ]
    ),
  ]);

const StyledTypePartEditor = styled.div({
  display: "grid",
  gap: 4,
  padding: 16,
  backgroundColor: "#111",
});

const EditorLabel = styled.label({
  display: "grid",
  gridTemplateColumns: "128px 1fr",
});

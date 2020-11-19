import * as d from "definy-core/source/data";
import {
  Component,
  FunctionComponent,
  ReactElement,
  createElement as h,
} from "react";
import { Button } from "./button";
import { Icon } from "./icon";
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
    this.props.model.addTypePart(this.props.projectId);
  }

  render(): ReactElement {
    return h(
      StyledTypePartListEditor,
      {},
      this.props.model.getTypePartInProjectState._ === "Requesting"
        ? h(Icon, { iconType: "Requesting" })
        : [
            ...[...this.props.model.typePartMap]
              .filter(
                ([_, typePart]) =>
                  typePart._ === "Loaded" &&
                  typePart.dataWithTime.data.projectId === this.props.projectId
              )
              .map(([typePartId, typePartResourceState]) => {
                switch (typePartResourceState._) {
                  case "Loaded": {
                    return h(TypePartEditor, {
                      model: this.props.model,
                      key: typePartId,
                      typePartId,
                      typePart: typePartResourceState.dataWithTime.data,
                    });
                  }
                }
                return h("div", { key: typePartId }, "...");
              }),
            h(
              Button,
              {
                onClick: () => this.addTypePart(),
                key: "typePartAddButton",
              },
              "型パーツ追加"
            ),
          ]
    );
  }
}

const StyledTypePartListEditor = styled.div({
  display: "grid",
  gap: 8,
});

const TypePartEditor: FunctionComponent<{
  model: Model;
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
          onBlur: (newDescription) => {
            props.model.setTypePartDescription(
              props.typePartId,
              newDescription
            );
          },
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

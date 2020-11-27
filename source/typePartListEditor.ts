import * as d from "definy-core/source/data";
import {
  Component,
  FunctionComponent,
  ReactElement,
  createElement as h,
  useState,
} from "react";
import {
  createNoParameterTagEditor,
  createWithParameterSumEditor,
} from "./sumEditor";
import { Button } from "./button";
import { Editor } from "./ui";
import { Icon } from "./icon";
import { Model } from "./model";
import { OneLineTextInput } from "./oneLineTextInput";
import { ProjectIdEditor } from "./projectIdEditor";
import { TypePartBodyEditor } from "./typePartBodyEditor";
import { TypePartIdEditor } from "./typePartIdEditor";
import { createListEditor } from "./listEditor";
import { createProductEditor } from "./productEditor";
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

  save(): void {
    console.log("保存するAPIを呼ぶ");
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
                    return h(TypePartIdAndDataEditorWithState, {
                      key: typePartId,
                      initTypePartId: typePartId,
                      initTypePart: typePartResourceState.dataWithTime.data,
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
            h(
              Button,
              {
                onClick: () => this.save(),
                key: "save",
              },
              "保存"
            ),
          ]
    );
  }
}

const StyledTypePartListEditor = styled.div({
  display: "grid",
  gap: 8,
});

const AttributeEditor: Editor<d.TypeAttribute> = createNoParameterTagEditor<d.TypeAttribute>(
  [d.TypeAttribute.AsBoolean, d.TypeAttribute.AsUndefined]
);

const AttributeMaybeEditor: Editor<
  d.Maybe<d.TypeAttribute>
> = createWithParameterSumEditor<
  {
    Just: d.TypeAttribute;
    Nothing: undefined;
  },
  "Just" | "Nothing",
  d.Maybe<d.TypeAttribute>
>(
  {
    Just: AttributeEditor,
    Nothing: undefined,
  },
  {
    Just: d.Maybe.Just(d.TypeAttribute.AsBoolean),
    Nothing: d.Maybe.Nothing(),
  }
);

const TypeParameterListEditor: Editor<
  ReadonlyArray<d.TypeParameter>
> = createListEditor<d.TypeParameter>(
  createProductEditor<d.TypeParameter>({
    name: OneLineTextInput,
    typePartId: TypePartIdEditor,
  }),
  {
    name: "initTypeParameterValue",
    typePartId: "15585b6605524aea7b86e0803ad95163" as d.TypePartId,
  }
);

const TypePartEditor: Editor<d.TypePart> = createProductEditor<d.TypePart>({
  name: OneLineTextInput,
  description: OneLineTextInput,
  attribute: AttributeMaybeEditor,
  projectId: ProjectIdEditor,
  typeParameterList: TypeParameterListEditor,
  body: TypePartBodyEditor,
});

const TypePartIdAndDataEditor = createProductEditor<
  d.IdAndData<d.TypePartId, d.TypePart>
>({
  id: TypePartIdEditor,
  data: TypePartEditor,
});

const TypePartIdAndDataEditorWithState: FunctionComponent<{
  initTypePartId: d.TypePartId;
  initTypePart: d.TypePart;
}> = (props) => {
  const [state, setState] = useState<d.IdAndData<d.TypePartId, d.TypePart>>({
    id: props.initTypePartId,
    data: props.initTypePart,
  });
  return h(TypePartIdAndDataEditor, {
    value: state,
    onChange: setState,
    name: "typePart",
  });
};

import * as d from "definy-core/source/data";
import { Component, ReactElement, createElement as h } from "react";
import { Button } from "./button";
import { Editor } from "./ui";
import { Model } from "./model";
import { OneLineTextInput } from "./oneLineTextInput";
import { ProjectIdEditor } from "./projectIdEditor";
import { TypePartBodyEditor } from "./typePartBodyEditor";
import { TypePartIdEditor } from "./typePartIdEditor";
import { createListEditor } from "./listEditor";
import { createMaybeEditor } from "./maybeEditor";
import { createNoParameterTagEditor } from "./sumEditor";
import { createProductEditor } from "./productEditor";
import styled from "styled-components";

export type Props = {
  readonly initTypePartList: ReadonlyMap<d.TypePartId, d.TypePart>;
  readonly projectId: d.ProjectId;
  readonly model: Model;
};

type State = {
  readonly typePartList: ReadonlyMap<d.TypePartId, d.TypePart>;
};

export class TypePartListEditorLoaded extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      typePartList: props.initTypePartList,
    };
  }

  addTypePart(): void {
    this.props.model.addTypePart(this.props.projectId);
  }

  setAt(typePartId: d.TypePartId, typePart: d.TypePart): void {
    this.setState({
      typePartList: new Map(this.state.typePartList).set(typePartId, typePart),
    });
  }

  save(): void {
    this.props.model.setTypePartList(
      this.props.projectId,
      [...this.state.typePartList].map(([id, data]) => ({
        id,
        data,
      }))
    );
  }

  render(): ReactElement {
    return h(
      StyledTypePartListEditor,
      {},
      [...this.state.typePartList].map(([id, data]) =>
        h(TypePartIdAndDataEditor, {
          key: id,
          name: "typePart-" + id,
          value: { id, data },
          onChange: (newTypePart: d.IdAndData<d.TypePartId, d.TypePart>) => {
            this.setAt(id, newTypePart.data);
          },
        })
      ),
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
      )
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
> = createMaybeEditor<d.TypeAttribute>(
  AttributeEditor,
  d.TypeAttribute.AsBoolean
);

const TypeParameterListEditor: Editor<
  ReadonlyArray<d.TypeParameter>
> = createListEditor<d.TypeParameter>({
  isLazy: false,
  editor: createProductEditor<d.TypeParameter>(
    {
      name: OneLineTextInput,
      typePartId: TypePartIdEditor,
    },
    "TypeParameter"
  ),
  initValue: {
    name: "initTypeParameterValue",
    typePartId: "15585b6605524aea7b86e0803ad95163" as d.TypePartId,
  },
  displayName: "TypeParameterListEditor",
});

const TypePartEditor: Editor<d.TypePart> = createProductEditor<d.TypePart>(
  {
    name: OneLineTextInput,
    description: OneLineTextInput,
    attribute: AttributeMaybeEditor,
    projectId: ProjectIdEditor,
    typeParameterList: TypeParameterListEditor,
    body: TypePartBodyEditor,
  },
  "TypePartEditor"
);

const TypePartIdAndDataEditor = createProductEditor<
  d.IdAndData<d.TypePartId, d.TypePart>
>(
  {
    id: TypePartIdEditor,
    data: TypePartEditor,
  },
  "TypeIdAndDataEditor"
);

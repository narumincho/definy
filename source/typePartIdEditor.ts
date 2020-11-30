import * as d from "definy-core/source/data";
import { Editor, editorToReactElement } from "./ui";
import { createElement as h, useState } from "react";
import { Button } from "./button";
import { OneLineTextInput } from "./oneLineTextInput";

export const TypePartIdEditor: Editor<d.TypePartId> = (props) => {
  const [text, setText] = useState<string>("");

  return h(
    "div",
    {},
    editorToReactElement(OneLineTextInput, {
      name: "type-name",
      model: props.model,
      onChange: setText,
      value: text,
      key: "input",
    }),
    typePartListSuggestion(text, props.model.typePartMap).map((suggestion) => {
      h(Button, {
        onClick: () => {
          setText(suggestion.typeName);
          props.onChange(suggestion.id);
        },
        key: suggestion.id,
      });
    })
  );
};

const typePartListSuggestion = (
  text: string,
  typePartMap: ReadonlyMap<d.TypePartId, d.ResourceState<d.TypePart>>
): ReadonlyArray<{ id: d.TypePartId; typeName: string }> => {
  const trimmedText = text.trim();
  const perfectMatch = typePartMap.get(trimmedText as d.TypePartId);
  if (perfectMatch !== undefined) {
    return [
      {
        id: trimmedText as d.TypePartId,
        typeName: getTypePartNameAndDescriptionFromResourceState(perfectMatch)
          .name,
      },
    ];
  }

  return [...typePartMap].flatMap(([id, typePartResource]) => {
    const typePart = getTypePartNameAndDescriptionFromResourceState(
      typePartResource
    );
    if (
      id.includes(text) ||
      typePart.name.includes(text) ||
      typePart.description.includes(text)
    ) {
      return [{ id, typeName: typePart.name }];
    }
    return [];
  });
};

const getTypePartNameAndDescriptionFromResourceState = (
  typePartResourceState: d.ResourceState<d.TypePart>
): { name: string; description: string } => {
  if (typePartResourceState._ !== "Loaded") {
    return { name: "???", description: "" };
  }
  return {
    name: typePartResourceState.dataWithTime.data.name,
    description: typePartResourceState.dataWithTime.data.description,
  };
};

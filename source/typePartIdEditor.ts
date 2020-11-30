import * as d from "definy-core/source/data";
import { Editor, editorToReactElement, styledDiv } from "./ui";
import { createElement as h, useState } from "react";
import { Button } from "./button";
import { OneLineTextInput } from "./oneLineTextInput";

export const TypePartIdEditor: Editor<d.TypePartId> = (props) => {
  const [text, setText] = useState<string>("");
  const suggestionList = typePartListSuggestion(text, props.model.typePartMap);
  const typeName = getTypePartNameAndDescriptionFromResourceState(
    props.model.typePartMap.get(props.value)
  ).name;

  return h(
    "div",
    {},
    h("div", { key: "id" }, props.value),
    h("div", { id: "typeName" }, typeName),
    editorToReactElement(OneLineTextInput, {
      name: "type-name",
      model: props.model,
      onChange: setText,
      value: text,
      key: "input",
    }),
    h(
      SuggestionList,
      { key: "suggestionList" },
      suggestionList.length === 0
        ? "none"
        : suggestionList.map((suggestion) =>
            h(
              Button,
              {
                onClick: () => {
                  props.onChange(suggestion.id);
                },
                key: suggestion.id,
              },
              suggestion.typeName
            )
          )
    )
  );
};

const SuggestionList = styledDiv({
  direction: "y",
  padding: 8,
});

const typePartListSuggestion = (
  text: string,
  typePartMap: ReadonlyMap<d.TypePartId, d.ResourceState<d.TypePart>>
): ReadonlyArray<{ id: d.TypePartId; typeName: string }> => {
  const trimmedText = text.trim().toLowerCase();
  if (trimmedText === "") {
    return [...typePartMap].map(([id, data]) => ({
      id,
      typeName: getTypePartNameAndDescriptionFromResourceState(data).name,
    }));
  }
  return [...typePartMap].flatMap(([id, typePartResource]) => {
    const typePart = getTypePartNameAndDescriptionFromResourceState(
      typePartResource
    );
    if (
      id.includes(trimmedText) ||
      typePart.name.toLowerCase().includes(trimmedText) ||
      typePart.description.toLowerCase().includes(trimmedText)
    ) {
      return [{ id, typeName: typePart.name }];
    }
    return [];
  });
};

const getTypePartNameAndDescriptionFromResourceState = (
  typePartResourceState: d.ResourceState<d.TypePart> | undefined
): { name: string; description: string } => {
  if (
    typePartResourceState === undefined ||
    typePartResourceState._ !== "Loaded"
  ) {
    return { name: "???", description: "" };
  }
  return {
    name: typePartResourceState.dataWithTime.data.name,
    description: typePartResourceState.dataWithTime.data.description,
  };
};

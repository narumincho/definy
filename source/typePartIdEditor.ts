import * as d from "definy-core/source/data";
import { Editor, editorToReactElement } from "./ui";
import { Button } from "./button";
import { OneLineTextInput } from "./oneLineTextInput";
import { jsx as h } from "@emotion/react";
import { useState } from "react";

export const TypePartIdEditor: Editor<d.TypePartId> = (props) => {
  const [text, setText] = useState<string>("");
  const suggestionList = typePartListSuggestion(text, props.model.typePartMap);
  const typeName = getTypePartNameFromTypePartMap(
    props.model.typePartMap,
    props.value
  );

  return h(
    "div",
    {},
    h("div", { key: "id" }, props.value),
    h("div", { kry: "typeName" }, typeName),
    editorToReactElement(OneLineTextInput, {
      name: "type-name",
      model: props.model,
      onChange: setText,
      value: text,
      key: "input",
    }),
    h(
      "div",
      {
        key: "suggestionList",
        css: {
          display: "grid",
          padding: 8,
        },
      },
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
              suggestion.name
            )
          )
    )
  );
};

const typePartListSuggestion = (
  text: string,
  typePartMap: ReadonlyMap<d.TypePartId, d.ResourceState<d.TypePart>>
): ReadonlyArray<{ id: d.TypePartId; name: string }> => {
  const trimmedText = text.trim().toLowerCase();
  const suggestionList = collectTypePartIdAndDescriptionName(typePartMap);
  if (trimmedText === "") {
    return suggestionList;
  }
  return suggestionList.filter(
    (suggestion) =>
      suggestion.id.includes(trimmedText) ||
      suggestion.name.includes(trimmedText) ||
      suggestion.description.includes(trimmedText)
  );
};

const collectTypePartIdAndDescriptionName = (
  typePartMap: ReadonlyMap<d.TypePartId, d.ResourceState<d.TypePart>>
): ReadonlyArray<{ id: d.TypePartId; name: string; description: string }> =>
  [...typePartMap].flatMap(([id, typePartState]) => {
    if (typePartState._ !== "Loaded") {
      return [{ id, name: "???", description: "???" }];
    }
    const typePart = typePartState.dataWithTime.data;
    return [
      ...typePartState.dataWithTime.data.typeParameterList.map(
        (typeParameter) => ({
          id: typeParameter.typePartId,
          name: typePart.name + "-" + typeParameter.name,
          description:
            typePart.name + "で定義された型パラメータ " + typeParameter.name,
        })
      ),
      {
        id,
        name: typePart.name,
        description: typePart.description,
      },
    ];
  });

const getTypePartNameFromTypePartMap = (
  typePartMap: ReadonlyMap<d.TypePartId, d.ResourceState<d.TypePart>>,
  typePartId: d.TypePartId
): string => {
  const typePart = typePartMap.get(typePartId);
  if (typePart === undefined || typePart._ !== "Loaded") {
    for (const [id, typePartState] of typePartMap) {
      if (typePartState._ === "Loaded") {
        const typePartName = getTypePartNameTypeParameterList(
          typePartState.dataWithTime.data.name,
          typePartState.dataWithTime.data.typeParameterList,
          typePartId
        );
        if (typePartName !== undefined) {
          return typePartName;
        }
      }
    }
    return "????";
  }
  return typePart.dataWithTime.data.name;
};

const getTypePartNameTypeParameterList = (
  typePartName: string,
  typeParameterList: ReadonlyArray<d.TypeParameter>,
  typePartId: d.TypePartId
): string | undefined => {
  for (const typeParameter of typeParameterList) {
    if (typeParameter.typePartId === typePartId) {
      return typePartName + "-" + typeParameter.name;
    }
  }
};

import * as d from "definy-core/source/data";
import { box, text } from "./ui";
import { Element } from "./view/view";
import { State } from "./messageAndState";
import { button } from "./button";
import { c } from "./view/viewUtil";

export const update = (oldType: d.Type, newType: d.Type): d.Type => {
  return newType;
};

export const view = (
  state: State,
  scopeTypePartId: d.TypePartId,
  type: d.Type
): Element<d.Type> => {
  return box(
    { padding: 2, direction: "x", gap: 4 },
    c([
      [
        "typePartId",
        text(getTypePartByState(state, type.typePartId, scopeTypePartId).name),
      ],
      ...type.parameter.map((parameter): readonly [string, Element<d.Type>] => {
        return [parameter.typePartId, view(state, scopeTypePartId, parameter)];
      }),
    ])
  );
};

const getTypePartByState = (
  state: State,
  typePartId: d.TypePartId,
  scopeTypePartId: d.TypePartId
): { name: string; description: string } => {
  const resource = state.typePartMap.get(typePartId);
  if (resource !== undefined && resource._ === "Loaded") {
    return resource.dataWithTime.data;
  }
  const scopeTypePart = state.typePartMap.get(scopeTypePartId);
  if (scopeTypePart !== undefined && scopeTypePart._ === "Loaded") {
    const targetedTypeParameter = scopeTypePart.dataWithTime.data.typeParameterList.find(
      (typeParameter) => {
        return typeParameter.typePartId === typePartId;
      }
    );
    if (targetedTypeParameter !== undefined) {
      return {
        name: targetedTypeParameter.name,
        description: scopeTypePart.dataWithTime.data.name + " の型パラメータ",
      };
    }
  }
  return {
    name: "???",
    description: "???",
  };
};

export const detailView = (
  state: State,
  scopeTypePartId: d.TypePartId,
  type: d.Type
): Element<d.Type> => {
  return box(
    { padding: 8, direction: "y" },
    c([
      ["selected", view(state, scopeTypePartId, type)],
      [
        "typeParameterList",
        box(
          {
            padding: 8,
            direction: "y",
          },
          c([
            ["title", text("typeParameter")],
            ...getTypePartLintInScope(
              state,
              scopeTypePartId
            ).map((data): readonly [string, Element<d.Type>] => [
              data.id,
              button<d.Type>(
                { click: { typePartId: data.id, parameter: [] } },
                c([["view", typeView(data)]])
              ),
            ]),
          ])
        ),
      ],
      [
        "typeList",
        box(
          {
            direction: "y",
            padding: 8,
          },
          c([
            ["title", text("typeList")],
            ...getTypePartList(state).map((data): readonly [
              string,
              Element<d.Type>
            ] => [
              data.id,
              button<d.Type>(
                { click: { typePartId: data.id, parameter: [] } },
                c([["view", typeView(data)]])
              ),
            ]),
          ])
        ),
      ],
    ])
  );
};

const typeView = (typeData: {
  id: d.TypePartId;
  name: string;
  description: string;
}): Element<never> => {
  return text(typeData.name);
};

const getTypePartList = (
  state: State
): ReadonlyArray<{ id: d.TypePartId; name: string; description: string }> => {
  const result: Array<{
    id: d.TypePartId;
    name: string;
    description: string;
  }> = [];
  for (const [typePartId, resource] of state.typePartMap) {
    if (resource._ === "Loaded") {
      result.push({
        id: typePartId,
        name: resource.dataWithTime.data.name,
        description: resource.dataWithTime.data.description,
      });
    }
  }
  return result;
};

const getTypePartLintInScope = (
  state: State,
  scopeTypePartId: d.TypePartId
): ReadonlyArray<{
  id: d.TypePartId;
  name: string;
  description: string;
}> => {
  const resource = state.typePartMap.get(scopeTypePartId);
  if (resource === undefined || resource._ !== "Loaded") {
    return [];
  }
  return resource.dataWithTime.data.typeParameterList.map((parameter) => ({
    id: parameter.typePartId,
    name: parameter.name,
    description: resource.dataWithTime.data.name + " の型パラメータ",
  }));
};

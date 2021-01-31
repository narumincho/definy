import * as d from "definy-core/source/data";
import * as definyType from "./definyType";
import * as util from "./util";
import { SelectBoxSelection, box, selectBox, text } from "./ui";
import { c, elementMap } from "@narumincho/html/source/viewUtil";
import { Element } from "@narumincho/html/source/view";
import { State } from "./messageAndState";
import { button } from "./button";
import { productEditor } from "./productEditor";

/** TODO */
export type Selection =
  | {
      tag: "self";
    }
  | {
      tag: "parameter";
      index: number;
      selection: Selection;
    };

export const update = (oldType: d.Type, newType: d.Type): d.Type => {
  return newType;
};

export const view = (
  state: State,
  scopeTypePartId: d.TypePartId,
  type: d.Type,
  selection: Selection | undefined
): Element<Selection> => {
  return selectBox(
    {
      padding: 2,
      direction: "x",
      selectMessage: { tag: "self" },
      selection: selectionToSelectBoxSelection(selection),
    },
    c([
      [
        "typePartId",
        text(getTypePartByState(state, type.typePartId, scopeTypePartId).name),
      ],
      ...type.parameter.map((parameter, index): readonly [
        string,
        Element<Selection>
      ] => {
        return [
          parameter.typePartId,
          elementMap(
            view(
              state,
              scopeTypePartId,
              parameter,
              selection?.tag === "parameter" && selection.index === index
                ? selection.selection
                : undefined
            ),
            (parameterSelection): Selection => ({
              tag: "parameter",
              index,
              selection: parameterSelection,
            })
          ),
        ];
      }),
    ])
  );
};

const selectionToSelectBoxSelection = (
  selection: Selection | undefined
): SelectBoxSelection => {
  if (selection === undefined) {
    return "notSelected";
  }
  if (selection.tag === "self") {
    return "selected";
  }
  return "innerSelected";
};

const getTypePartByState = (
  state: State,
  typePartId: d.TypePartId,
  scopeTypePartId: d.TypePartId
): {
  name: string;
  description: string;
  typeParameterList: ReadonlyArray<d.TypeParameter>;
} => {
  const resource = state.typePartMap.get(typePartId);
  if (resource !== undefined && resource._ === "Loaded") {
    return {
      name: resource.dataWithTime.data.name,
      description: resource.dataWithTime.data.description,
      typeParameterList: resource.dataWithTime.data.typeParameterList,
    };
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
        typeParameterList: [],
      };
    }
  }
  return {
    name: "???",
    description: "???",
    typeParameterList: [],
  };
};

export const editor = (
  state: State,
  scopeTypePartId: d.TypePartId,
  type: d.Type,
  selection: Selection | undefined
): Element<d.Type> => {
  if (selection === undefined || selection.tag === "self") {
    return editorSelectedSelf(state, scopeTypePartId, type);
  }
  const selectedTypeParameter = type.parameter[selection.index];
  if (selectedTypeParameter === undefined) {
    return text("編集する型パラメータがない in type editor");
  }
  return elementMap(
    editor(state, scopeTypePartId, selectedTypeParameter, selection.selection),
    (newParameter): d.Type => ({
      typePartId: type.typePartId,
      parameter: util.listReplaceAt(
        type.parameter,
        selection.index,
        newParameter
      ),
    })
  );
};

const editorSelectedSelf = (
  state: State,
  scopeTypePartId: d.TypePartId,
  type: d.Type
): Element<d.Type> => {
  const typeData = getTypePartByState(state, type.typePartId, scopeTypePartId);
  return productEditor({}, [
    {
      name: "選ばれている型",
      element: box(
        {
          direction: "y",
          padding: 0,
        },
        c([["main", text(typeData.name)]])
      ),
    },
    ...(typeData.typeParameterList.length === 0
      ? []
      : [
          {
            name: "paramter",
            element: productEditor(
              {},
              typeData.typeParameterList.map((typeParameterName, index) => ({
                name: typeParameterName.name,
                element: elementMap(
                  type.parameter[index] === undefined
                    ? typeMenu(state, scopeTypePartId)
                    : editor(
                        state,
                        scopeTypePartId,
                        type.parameter[index],
                        undefined
                      ),
                  (parameterType): d.Type => ({
                    typePartId: type.typePartId,
                    parameter: util.listReplaceAt<d.Type>(
                      type.parameter,
                      index,
                      {
                        typePartId: parameterType.typePartId,
                        parameter: [],
                      }
                    ),
                  })
                ),
                isSelected: false,
              }))
            ),
          },
        ]),
    {
      name: "選択肢",
      element: typeMenu(state, scopeTypePartId),
    },
  ]);
};

const typeMenu = (
  state: State,
  scopeTypePartId: d.TypePartId
): Element<d.Type> => {
  return productEditor({}, [
    {
      name: "型パラメータから",
      element: box(
        {
          padding: 8,
          direction: "y",
        },
        c(
          getTypePartLintInScope(state, scopeTypePartId).map((data): readonly [
            string,
            Element<d.Type>
          ] => [
            data.id,
            button<d.Type>(
              { click: { typePartId: data.id, parameter: [] } },
              c([["view", typeView(data)]])
            ),
          ])
        )
      ),
    },
    {
      name: "同じプロジェクトから",
      element: box(
        {
          direction: "y",
          padding: 8,
        },
        c(
          getTypePartList(state).map((data): readonly [
            string,
            Element<d.Type>
          ] => [
            data.id,
            button<d.Type>(
              {
                click: {
                  typePartId: data.id,
                  parameter: new Array<d.Type>(data.typeParameterCount).fill(
                    definyType.int32
                  ),
                },
              },
              c([["view", typeView(data)]])
            ),
          ])
        )
      ),
    },
  ]);
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
): ReadonlyArray<{
  id: d.TypePartId;
  name: string;
  description: string;
  typeParameterCount: number;
}> => {
  const result: Array<{
    id: d.TypePartId;
    name: string;
    description: string;
    typeParameterCount: number;
  }> = [];
  for (const [typePartId, resource] of state.typePartMap) {
    if (resource._ === "Loaded") {
      result.push({
        id: typePartId,
        name: resource.dataWithTime.data.name,
        description: resource.dataWithTime.data.description,
        typeParameterCount: resource.dataWithTime.data.typeParameterList.length,
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

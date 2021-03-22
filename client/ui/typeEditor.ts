import * as a from "../messageAndState";
import * as d from "../../data";
import * as util from "../util";
import { ProductItem, productEditor } from "./productEditor";
import { SelectBoxSelection, box, selectBox, text } from "../ui";
import { c, elementMap } from "@narumincho/html/viewUtil";
import { Element } from "@narumincho/html/view";
import { button } from "./button";
import { oneLineTextEditor } from "./oneLineTextInput";

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
  state: a.State,
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
  state: a.State,
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

/**
 * 型を入力し, 編集する 型エディタ
 */
export const editor = (
  state: a.State,
  scopeTypePartId: d.TypePartId,
  type: d.Type,
  selection: Selection | undefined,
  typeSelect: (t: d.Type) => a.Message
): Element<a.Message> => {
  if (selection === undefined || selection.tag === "self") {
    return editorSelectedSelf(state, scopeTypePartId, type, typeSelect);
  }
  const selectedTypeParameter = type.parameter[selection.index];
  if (selectedTypeParameter === undefined) {
    return text("編集する型パラメータがない in type editor");
  }
  return editor(
    state,
    scopeTypePartId,
    selectedTypeParameter,
    selection.selection,
    (newParameter): a.Message =>
      typeSelect({
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
  state: a.State,
  scopeTypePartId: d.TypePartId,
  type: d.Type,
  typeSelect: (t: d.Type) => a.Message
): Element<a.Message> => {
  const typeData = getTypePartByState(state, type.typePartId, scopeTypePartId);
  const searchTextEditor = {
    name: "検索",
    element: oneLineTextEditor(
      {},
      state.typeSearchText,
      (newSearchText): a.Message => ({
        tag: "SetTypeSearchText",
        text: newSearchText,
      })
    ),
  };
  const selectTypeElement: { name: string; element: Element<a.Message> } = {
    name: "選ばれている型",
    element: box(
      {
        direction: "y",
        padding: 0,
      },
      c([["main", text(typeData.name)]])
    ),
  };
  const typeSelectionMenu: { name: string; element: Element<a.Message> } = {
    name: "選択肢",
    element: typeMenu(state, scopeTypePartId, typeSelect),
  };
  if (typeData.typeParameterList.length === 0) {
    return productEditor({}, [
      searchTextEditor,
      selectTypeElement,
      typeSelectionMenu,
    ]);
  }
  return productEditor<a.Message>({}, [
    searchTextEditor,
    selectTypeElement,
    {
      name: "paramter",
      element: productEditor(
        {},
        typeData.typeParameterList.map((typeParameterName, index) => {
          const setTypeParameter = (parameterType: d.Type): a.Message =>
            typeSelect({
              typePartId: type.typePartId,
              parameter: util.listReplaceAt<d.Type>(type.parameter, index, {
                typePartId: parameterType.typePartId,
                parameter: [],
              }),
            });
          return {
            name: typeParameterName.name,
            element:
              type.parameter[index] === undefined
                ? typeMenu(state, scopeTypePartId, setTypeParameter)
                : editor(
                    state,
                    scopeTypePartId,
                    type.parameter[index],
                    undefined,
                    setTypeParameter
                  ),
            isSelected: false,
          };
        })
      ),
    },

    typeSelectionMenu,
  ]);
};

const typeMenu = (
  state: a.State,
  scopeTypePartId: d.TypePartId,
  typeSelect: (t: d.Type) => a.Message
): Element<a.Message> => {
  const typePartList = getTypePartList(state);
  const typePartListInScope = getTypePartLintInScope(state, scopeTypePartId);
  const typePartListProductItem: ProductItem<a.Message> = {
    name: "同じプロジェクトから",
    element: box(
      {
        direction: "y",
        padding: 8,
      },
      c([
        ...typePartList.list.map((data): readonly [
          string,
          Element<a.Message>
        ] => [
          data.id,
          button<a.Message>(
            {
              click: typeSelect({
                typePartId: data.id,
                parameter: new Array<d.Type>(data.typeParameterCount).fill({
                  parameter: [],
                  typePartId: d.Int32.typePartId,
                }),
              }),
            },
            c([["view", typeView(data)]])
          ),
        ]),
        ...(typePartList.more
          ? ([
              ["more", text<a.Message>("さらにある. 検索で絞り込んで!")],
            ] as const)
          : []),
      ])
    ),
  };

  const typeParameterProductItem: ProductItem<a.Message> = {
    name: "型パラメータから",
    element: box(
      {
        padding: 8,
        direction: "y",
      },
      c(
        typePartListInScope.map((data): readonly [
          string,
          Element<a.Message>
        ] => [
          data.id,
          button<a.Message>(
            { click: typeSelect({ typePartId: data.id, parameter: [] }) },
            c([["view", typeView(data)]])
          ),
        ])
      )
    ),
  };
  if (typePartListInScope.length === 0) {
    return productEditor({}, [typePartListProductItem]);
  }
  return productEditor({}, [typeParameterProductItem, typePartListProductItem]);
};

const typeView = (typeData: {
  id: d.TypePartId;
  name: string;
  description: string;
}): Element<never> => {
  return text(typeData.name);
};

type TypeMenuItem = {
  readonly id: d.TypePartId;
  readonly name: string;
  readonly description: string;
  readonly typeParameterCount: number;
};

const typeMenuMaxCount = 12;

const getTypePartList = (
  state: a.State
): {
  list: ReadonlyArray<TypeMenuItem>;
  /** さらにあるかどうか */
  more: boolean;
} => {
  const list = sortByMatch(
    state.typeSearchText.trim().toLowerCase(),
    state.typePartMap
  );
  return {
    list: list.slice(0, typeMenuMaxCount),
    more: typeMenuMaxCount <= list.length,
  };
};

const sortByMatch = (
  normalizedSearchText: string,
  typePartMap: ReadonlyMap<d.TypePartId, d.ResourceState<d.TypePart>>
): ReadonlyArray<TypeMenuItem> => {
  const list: Array<{ item: TypeMenuItem; point: number }> = [];
  for (const [typePartId, resource] of typePartMap) {
    if (resource._ === "Loaded") {
      if (
        resource.dataWithTime.data.name
          .toLowerCase()
          .includes(normalizedSearchText)
      ) {
        list.push({
          item: {
            id: typePartId,
            name: resource.dataWithTime.data.name,
            description: resource.dataWithTime.data.description,
            typeParameterCount:
              resource.dataWithTime.data.typeParameterList.length,
          },
          point: Math.abs(
            resource.dataWithTime.data.name.length - normalizedSearchText.length
          ),
        });
      }
    }
  }
  return list
    .sort((itemA, itemB) => itemA.point - itemB.point)
    .map((e) => e.item);
};

const getTypePartLintInScope = (
  state: a.State,
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
  if (
    !resource.dataWithTime.data.name
      .toLowerCase()
      .includes(state.typeSearchText.toLowerCase())
  ) {
    return [];
  }
  return resource.dataWithTime.data.typeParameterList.map((parameter) => ({
    id: parameter.typePartId,
    name: parameter.name,
    description: resource.dataWithTime.data.name + " の型パラメータ",
  }));
};

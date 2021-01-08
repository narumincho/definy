import { c, inputRadio, label } from "./view/viewUtil";
import { Element } from "./view/view";
import { box } from "./ui";

export const tagEditor = <tag extends string>(
  tagList: ReadonlyArray<tag>,
  selectedTag: string,
  groupName: string
): Element<tag> =>
  box(
    {
      borderRadius: 8,
      border: { width: 1, color: "#333" },
      padding: 0,
      direction: "x",
      xGridTemplate: [{ _: "OneFr" }, { _: "OneFr" }, { _: "OneFr" }],
    },
    c(
      tagList.flatMap((tagName, index) =>
        inputAndLabel(groupName, tagName, index, selectedTag === tagName)
      )
    )
  );

const inputAndLabel = <tag extends string>(
  name: string,
  tagName: tag,
  index: number,
  isChecked: boolean
): ReadonlyArray<readonly [string, Element<tag>]> => [
  [
    tagName + "-input",
    inputRadio({
      id: name + "-" + tagName,
      groupName: name,
      checked: isChecked,
      select: tagName,
      style: {
        width: 0,
        height: 0,
        gridColumn:
          ((index % 3) + 1).toString() + " / " + ((index % 3) + 2).toString(),
        gridRow:
          (Math.floor(index / 3) + 1).toString() +
          " / " +
          (Math.floor(index / 3) + 2).toString(),
      },
    }),
  ],
  [
    tagName + "-label",
    label(
      {
        targetElementId: name + "-" + tagName,
        style: {
          backgroundColor: isChecked ? "#aaa" : "#000",
          color: isChecked ? "#000" : "#ddd",
          padding: 4,
          cursor: "pointer",
          display: "block",
          gridColumn:
            ((index % 3) + 1).toString() + " / " + ((index % 3) + 2).toString(),
          gridRow:
            (Math.floor(index / 3) + 1).toString() +
            " / " +
            (Math.floor(index / 3) + 2).toString(),
          textAlign: "center",
          "&:active": {
            backgroundColor: "#303030",
          },
        },
      },
      tagName
    ),
  ],
];

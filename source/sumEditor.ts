import { c, elementMap, inputRadio, label } from "./view/viewUtil";
import { Element } from "./view/view";
import { box } from "./ui";

interface SumEditorMessage<
  tagAndMessage extends Record<string, unknown>,
  tag extends keyof tagAndMessage & string
> {
  tag: tag;
  content: tagAndMessage[tag] | undefined;
}

export const sumEditor = <tagAndMessage extends Record<string, unknown>>(
  tagAndElement: {
    [tag in keyof tagAndMessage & string]: Element<tagAndMessage[tag]>;
  },
  selectedTag: keyof tagAndMessage & string,
  name: string
): Element<SumEditorMessage<tagAndMessage, keyof tagAndMessage & string>> => {
  return box(
    { direction: "y", padding: 0 },
    c([
      [
        "tag",
        elementMap(
          tagEditor<keyof tagAndMessage & string>(
            Object.keys(tagAndElement) as Array<keyof tagAndMessage & string>,
            selectedTag as keyof tagAndMessage & string,
            name
          ),
          <newTag extends keyof tagAndMessage & string>(
            newTag: newTag
          ): SumEditorMessage<tagAndMessage, newTag> => ({
            tag: newTag,
            content: undefined,
          })
        ),
      ],
      [
        "content",
        elementMap(
          tagAndElement[selectedTag],
          (
            newContent
          ): SumEditorMessage<tagAndMessage, keyof tagAndMessage & string> => ({
            tag: selectedTag,
            content: newContent,
          })
        ),
      ],
    ])
  );
};

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

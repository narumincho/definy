import * as d from "definy-core/source/data";
import * as definyType from "./definyType";
import * as listEditor from "./listEditor";
import * as typeEditor from "./typeEditor";
import { c, elementMap } from "./view/viewUtil";
import { Element } from "./view/view";
import { box } from "./ui";
import { oneLineTextEditor } from "./oneLineTextInput";
import { productEditor } from "./productEditor";
import { tagEditor } from "./tagEditor";

export type Message =
  | {
      tag: "SetName";
      newName: string;
    }
  | {
      tag: "SetDescription";
      newDescription: string;
    }
  | {
      tag: "SetContentType";
      newContentType: d.Maybe<d.Type>;
    };

const setName = (name: string): Message => ({ tag: "SetName", newName: name });
const SetDescription = (name: string): Message => ({
  tag: "SetDescription",
  newDescription: name,
});

export const update = (pattern: d.Pattern, message: Message): d.Pattern => {
  switch (message.tag) {
    case "SetName":
      return {
        ...pattern,
        name: message.newName,
      };
    case "SetDescription":
      return {
        ...pattern,
        description: message.newDescription,
      };
    case "SetContentType":
      return {
        ...pattern,
        parameter: message.newContentType,
      };
  }
};

export const view = (pattern: d.Pattern): Element<Message> => {
  return productEditor(
    new Map([
      ["name", oneLineTextEditor(pattern.name, setName)],
      ["description", oneLineTextEditor(pattern.description, SetDescription)],
      ["parameter", parameterEditor(pattern.parameter)],
    ])
  );
};

type MaybeTag = "Just" | "Nothing";

const parameterEditor = (parameter: d.Maybe<d.Type>): Element<Message> => {
  return box(
    {
      padding: 0,
      direction: "y",
    },
    c([
      ["tag", parameterTagEditor(parameter._)],
      ...(parameter._ === "Just"
        ? ([
            [
              "content",
              elementMap(
                typeEditor.view(parameter.value),
                (ty): Message => ({
                  tag: "SetContentType",
                  newContentType: d.Maybe.Just(ty),
                })
              ),
            ],
          ] as const)
        : []),
    ])
  );
};

const parameterTagEditor = (maybeTag: MaybeTag): Element<Message> => {
  return elementMap(
    tagEditor<MaybeTag>(["Just", "Nothing"], maybeTag, "patternParameter"),
    (tag: MaybeTag): Message => {
      switch (tag) {
        case "Just":
          return {
            tag: "SetContentType",
            newContentType: d.Maybe.Just(definyType.int32),
          };
        case "Nothing":
          return {
            tag: "SetContentType",
            newContentType: d.Maybe.Nothing(),
          };
      }
    }
  );
};

export const listUpdate = listEditor.update<d.Pattern, Message>(update, {
  name: "initParameterName",
  description: "initParameterDescription",
  parameter: d.Maybe.Nothing<d.Type>(),
});

export const listView: (
  patternList: ReadonlyArray<d.Pattern>
) => Element<listEditor.Message<Message>> = listEditor.view(view);

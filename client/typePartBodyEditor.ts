import * as a from "./messageAndState";
import * as d from "../data";
import * as listEditor from "./listEditor";
import * as memberListEditor from "./memberListEditor";
import * as patternListEditor from "./patternListEditor";
import { SelectBoxSelection, selectBox, selectText, text } from "./ui";
import { c, div, elementMap } from "@narumincho/html/viewUtil";
import { Element } from "@narumincho/html/view";
import { tagEditor } from "./tagEditor";

export type Message =
  | {
      readonly tag: "ChangeTag";
      readonly newTag: a.TypePartBodyTag;
    }
  | {
      readonly tag: "ChangeKernel";
      readonly newKernel: d.TypePartBodyKernel;
    }
  | {
      readonly tag: "ChangePatternList";
      readonly patternListMessage: listEditor.Message<patternListEditor.Message>;
    }
  | {
      readonly tag: "ChangeMemberList";
      readonly memberListMessage: listEditor.Message<memberListEditor.ItemMessage>;
    };

export type Selection =
  | { tag: "self" }
  | {
      tag: "sum";
      content: patternListEditor.ListSelection;
    }
  | {
      tag: "product";
      content: memberListEditor.ListSelection;
    }
  | {
      tag: "kernel";
    };

export const update = (
  typePartBody: d.TypePartBody,
  message: Message
): d.TypePartBody => {
  switch (message.tag) {
    case "ChangeTag":
      return typePartBodyTagToInitTypePartBody(message.newTag);
    case "ChangeKernel":
      return d.TypePartBody.Kernel(message.newKernel);
    case "ChangePatternList":
      if (typePartBody._ !== "Sum") {
        return typePartBody;
      }
      return d.TypePartBody.Sum(
        patternListEditor.listUpdate(
          typePartBody.patternList,
          message.patternListMessage
        )
      );
    case "ChangeMemberList":
      if (typePartBody._ !== "Product") {
        return typePartBody;
      }
      return d.TypePartBody.Product(
        memberListEditor.listUpdate(
          typePartBody.memberList,
          message.memberListMessage
        )
      );
  }
};

const typePartBodyTagToInitTypePartBody = (
  typePartBodyTag: a.TypePartBodyTag
): d.TypePartBody => {
  switch (typePartBodyTag) {
    case "Product":
      return d.TypePartBody.Product([]);
    case "Sum":
      return d.TypePartBody.Sum([]);
    case "Kernel":
      return d.TypePartBody.Kernel(d.TypePartBodyKernel.String);
  }
};

export const view = (
  state: a.State,
  typePartId: d.TypePartId,
  typePartBody: d.TypePartBody,
  selection: Selection | undefined
): Element<Selection> => {
  return selectBox<Selection>(
    {
      padding: 8,
      direction: "y",
      selectMessage: { tag: "self" },
      selection: selectionToSelectBoxSelection(selection),
    },
    c([
      ["tag", text(typePartBody._)],
      ["content", bodyContentView(state, typePartId, typePartBody, selection)],
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

const bodyTagEditor = (
  typePartBody: d.TypePartBody,
  messageToAppMessageFunc: (message: Message) => a.Message
): Element<a.Message> => {
  return elementMap(
    tagEditor(["Sum", "Product", "Kernel"], typePartBody._, "typePartBody"),
    (tagEditorMessage): a.Message =>
      messageToAppMessageFunc({ tag: "ChangeTag", newTag: tagEditorMessage })
  );
};

const bodyContentView = (
  state: a.State,
  typePartId: d.TypePartId,
  typePartBody: d.TypePartBody,
  selection: Selection | undefined
): Element<Selection> => {
  switch (typePartBody._) {
    case "Sum":
      return elementMap(
        patternListEditor.listView(
          state,
          typePartId,
          typePartBody.patternList,
          selection?.tag === "sum" ? selection.content : undefined
        ),
        (content): Selection => ({
          tag: "sum",
          content,
        })
      );

    case "Product":
      return elementMap(
        memberListEditor.listView(
          state,
          typePartId,
          typePartBody.memberList,
          selection?.tag === "product" ? selection.content : undefined
        ),
        (content): Selection => ({
          tag: "product",
          content,
        })
      );
    case "Kernel":
      return selectText<Selection>(
        selection?.tag === "kernel",
        { tag: "kernel" },
        typePartBody.typePartBodyKernel
      );
  }
};

const bodyContentEditor = (
  state: a.State,
  typePartId: d.TypePartId,
  typePartBody: d.TypePartBody,
  messageToAppMessageFunc: (message: Message) => a.Message
): Element<a.Message> => {
  switch (typePartBody._) {
    case "Sum":
      return patternListEditor.editor(
        state,
        typePartId,
        typePartBody.patternList,
        "patternList",
        undefined,
        (patternListMessage): a.Message =>
          messageToAppMessageFunc({
            tag: "ChangePatternList",
            patternListMessage,
          })
      );
    case "Product":
      return memberListEditor.editor(
        "memberList",
        state,
        typePartId,
        typePartBody.memberList,
        undefined,
        (memberListMessage): a.Message =>
          messageToAppMessageFunc({
            tag: "ChangeMemberList",
            memberListMessage,
          })
      );
    case "Kernel":
      return elementMap(
        tagEditor(
          KernelEditorList,
          typePartBody.typePartBodyKernel,
          "typePartBodyKernel"
        ),
        (newKernel): a.Message =>
          messageToAppMessageFunc({ tag: "ChangeKernel", newKernel })
      );
  }
};

export const editor = (
  state: a.State,
  typePartId: d.TypePartId,
  typePartBody: d.TypePartBody,
  selection: Selection | undefined,
  messageToAppMessageFunc: (message: Message) => a.Message
): Element<a.Message> => {
  if (selection === undefined || selection.tag === "self") {
    return div<a.Message>(
      {},
      c([
        ["tag", bodyTagEditor(typePartBody, messageToAppMessageFunc)],
        [
          "content",
          bodyContentEditor(
            state,
            typePartId,
            typePartBody,
            messageToAppMessageFunc
          ),
        ],
      ])
    );
  }
  if (selection.tag === "sum" && typePartBody._ === "Sum") {
    return patternListEditor.editor(
      state,
      typePartId,
      typePartBody.patternList,
      "patternList",
      selection.content,
      (patternListMessage): a.Message =>
        messageToAppMessageFunc({
          tag: "ChangePatternList",
          patternListMessage,
        })
    );
  }
  if (selection.tag === "product" && typePartBody._ === "Product") {
    return memberListEditor.editor(
      "memberList",
      state,
      typePartId,
      typePartBody.memberList,
      selection.content,
      (memberListMessage): a.Message =>
        messageToAppMessageFunc({
          tag: "ChangeMemberList",
          memberListMessage,
        })
    );
  }
  if (selection.tag === "kernel" && typePartBody._ === "Kernel") {
    return elementMap(
      tagEditor(
        KernelEditorList,
        typePartBody.typePartBodyKernel,
        "typePartBodyKernel"
      ),
      (newKernel): a.Message =>
        messageToAppMessageFunc({ tag: "ChangeKernel", newKernel })
    );
  }
  return text("編集する値がない in TypePartBodyEditor");
};

export const KernelEditorList = [
  "Function",
  "Int32",
  "String",
  "Binary",
  "Id",
  "Token",
  "List",
  "Dict",
] as const;

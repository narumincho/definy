import * as d from "definy-core/source/data";
import { h, default as preact } from "preact";
import { ModelInterface } from "./modelInterface";

export type Theme = "Gray" | "Black" | "Active";

export const link = (
  prop: {
    modelInterface: ModelInterface;
    location: d.Location;
    areaTheme: Theme;
    class: string;
    key?: string;
  },
  children: VNodeChildren
): VNode =>
  h(
    "a",
    {
      href: prop.modelInterface.sameLanguageLink(prop.location).toString(),
      onclick: (event) => {
        if (
          !event.ctrlKey &&
          !event.metaKey &&
          !event.shiftKey &&
          event.button === 0
        ) {
          event.preventDefault();
          prop.modelInterface.jumpSameLanguageLink(prop.location);
        }
      },
      classes: {
        ui__link: true,
        "ui__link--gray": prop.areaTheme === "Gray",
        "ui__link--black": prop.areaTheme === "Black",
        "ui__link--active": prop.areaTheme === "Active",
        [prop.class]: true,
      },
      key: prop.key,
    },
    children
  );

export const button = (
  prop: {
    onClick: undefined | (() => void);
    class?: string;
    key?: string;
  },
  children: VNodeChildren
): VNode =>
  h(
    "button",
    {
      onclick: prop.onClick,
      class:
        "ui__button" + classNameOrUndefinedToSpaceClassNameOrEmpty(prop.class),
      key: prop.key,
    },
    children
  );

export const LoadingBox = (children: VNodeChildren): VNode =>
  h("div", { class: "ui__loading-box" }, [
    ...children,
    h("div", { class: "ui__loading-logo" }, ["Definy"]),
  ]);

export const commonResourceStateView = <data extends unknown>(prop: {
  resourceState: d.ResourceState<data> | undefined;
  dataView: (data_: data) => VNode;
  key: string;
}): VNode => {
  if (prop.resourceState === undefined) {
    return h("div", {}, []);
  }
  switch (prop.resourceState._) {
    case "WaitLoading":
      return h("div", { class: "ui__resource", key: prop.key }, [
        NewLoadingIcon({ isWait: true }),
      ]);
    case "Loading":
      return h("div", { class: "ui__resource", key: prop.key }, [
        NewLoadingIcon({ isWait: false }),
      ]);
    case "WaitRequesting":
      return h("div", { class: "ui__resource", key: prop.key }, [
        NewLoadingIcon({ isWait: true }),
      ]);
    case "Requesting":
      return h("div", { class: "ui__resource", key: prop.key }, [
        NewLoadingIcon({ isWait: false }),
      ]);
    case "WaitRetrying":
      return h("div", { class: "ui__resource", key: prop.key }, [
        "WaitRetrying",
      ]);
    case "Retrying":
      return h("div", { class: "ui__resource", key: prop.key }, ["Retry"]);
    case "WaitUpdating":
      return h("div", { class: "ui__resource", key: prop.key }, [
        "WaitUpdating",
      ]);
    case "Updating":
      return h("div", { class: "ui__resource", key: prop.key }, ["Updating"]);
    case "Loaded":
      if (prop.resourceState.dataResource.dataMaybe._ === "Just") {
        return prop.dataView(prop.resourceState.dataResource.dataMaybe.value);
      }
      return h("div", { class: "ui__resource", key: prop.key }, ["?"]);
    case "Unknown":
      return h("div", { class: "ui__resource", key: prop.key }, ["Unknown"]);
  }
};

const classNameOrUndefinedToSpaceClassNameOrEmpty = (
  className: string | undefined
): string => (className === undefined ? "" : " " + className);

export const image = (prop: {
  modelInterface: ModelInterface;
  imageToken: d.ImageToken;
  class?: string;
  key: string;
}): VNode => {
  const blobUrlResource = prop.modelInterface.imageMap.get(prop.imageToken);
  if (blobUrlResource === undefined) {
    return h(
      "div",
      {
        class:
          "ui__image" + classNameOrUndefinedToSpaceClassNameOrEmpty(prop.class),
        key: prop.key,
      },
      ["..."]
    );
  }
  switch (blobUrlResource._) {
    case "WaitLoading":
      return h(
        "div",
        {
          class:
            "ui__image" +
            classNameOrUndefinedToSpaceClassNameOrEmpty(prop.class),
          key: prop.key,
        },
        [NewLoadingIcon({ isWait: true })]
      );
    case "Loading":
      return h(
        "div",
        {
          class:
            "ui__image" +
            classNameOrUndefinedToSpaceClassNameOrEmpty(prop.class),
          key: prop.key,
        },
        [NewLoadingIcon({ isWait: false })]
      );
    case "WaitRequesting":
      return h(
        "div",
        {
          class:
            "ui__image" +
            classNameOrUndefinedToSpaceClassNameOrEmpty(prop.class),
          key: prop.key,
        },
        [RequestingIcon({ isWait: true })]
      );
    case "Requesting":
      return h(
        "div",
        {
          class:
            "ui__image" +
            classNameOrUndefinedToSpaceClassNameOrEmpty(prop.class),
          key: prop.key,
        },
        [RequestingIcon({ isWait: false })]
      );
    case "WaitRetrying":
      return h(
        "div",
        {
          class:
            "ui__image" +
            classNameOrUndefinedToSpaceClassNameOrEmpty(prop.class),
          key: prop.key,
        },
        ["再挑戦準備中"]
      );
    case "Retrying":
      return h(
        "div",
        {
          class:
            "ui__image" +
            classNameOrUndefinedToSpaceClassNameOrEmpty(prop.class),
          key: prop.key,
        },
        ["再挑戦中"]
      );
    case "Unknown":
      return h(
        "div",
        {
          class:
            "ui__image" +
            classNameOrUndefinedToSpaceClassNameOrEmpty(prop.class),
          key: prop.key,
        },
        ["取得に失敗"]
      );
    case "Loaded":
      return h("img", {
        class:
          "ui__image" + classNameOrUndefinedToSpaceClassNameOrEmpty(prop.class),
        src: blobUrlResource.data,
        key: prop.key,
      });
  }
};

export const user = (prop: {
  modelInterface: ModelInterface;
  userId: d.UserId;
}): VNode => {
  const userResource = prop.modelInterface.userMap.get(prop.userId);

  return commonResourceStateView({
    dataView: (data: d.User): VNode =>
      link(
        {
          modelInterface: prop.modelInterface,
          areaTheme: "Gray",
          location: d.Location.User(prop.userId),
          class: "ui__user",
        },
        [
          image({
            imageToken: data.imageHash,
            modelInterface: prop.modelInterface,
            key: "user-image",
            class: "ui__user-image",
          }),
          data.name,
        ]
      ),
    resourceState: userResource,
    key: "user-" + prop.userId,
  });
};

export const project = (prop: {
  modelInterface: ModelInterface;
  projectId: d.ProjectId;
  key?: string;
}): VNode => {
  const projectResource = prop.modelInterface.projectMap.get(prop.projectId);
  return commonResourceStateView({
    dataView: (data: d.Project) => {
      return link(
        {
          class: "ui__project",
          areaTheme: "Gray",
          modelInterface: prop.modelInterface,
          location: d.Location.Project(prop.projectId),
          key: prop.key,
        },
        [
          image({
            modelInterface: prop.modelInterface,
            imageToken: data.imageHash,
            class: "ui__project-image",
            key: "project-image",
          }),
          h("div", { class: "ui__project-icon-and-name" }, [
            image({
              class: "ui__project-icon",
              imageToken: data.iconHash,
              modelInterface: prop.modelInterface,
              key: "project-icon",
            }),
            data.name,
          ]),
        ]
      );
    },
    resourceState: projectResource,
    key: "project-" + prop.projectId,
  });
};

const NewLoadingIcon = (prop: { isWait: boolean }): VNode =>
  h("svg", { class: "ui__icon", viewBox: "0 0 40 40" }, [
    h("circle", { cx: "20", cy: "20", r: "8", stroke: "#eee" }, [
      h("animate", {
        attributeName: "r",
        dur: "1",
        repeatCount: "indefinite",
        values: prop.isWait ? "12" : "12;0",
      }),
      h("animate", {
        attributeName: "stroke",
        dur: "1",
        repeatCount: "indefinite",
        values: "#eee;transparent",
      }),
    ]),
  ]);

const RequestingIcon = (prop: { isWait: boolean }): VNode =>
  h(
    "svg",
    { class: "ui__icon", viewBox: "0 0 40 40" },
    new Array(5).fill(0).map((_, index) =>
      h(
        "circle",
        {
          cx: "20",
          cy: (index * 10).toString(),
          fill: "transparent",
          key: index.toString(),
          r: "3",
          stroke: "#eee",
        },
        [
          h("animate", {
            attributeName: "cy",
            dur: "0.2",
            repeatCount: "indefinite",
            values: prop.isWait
              ? (index * 10 - 5).toString()
              : (index * 10 - 5).toString() + ";" + (index * 10 + 5).toString(),
          }),
        ]
      )
    )
  );

export const oneLineTextInput = (prop: {
  name: string;
  value: string;
  onChange: (value: string, event: MouseEvent) => void;
}): VNode =>
  h("div", {
    class: "ui__one-line-text-input",
    name: prop.name,
    onchange: (mouseEvent: MouseEvent) =>
      prop.onChange((mouseEvent.target as HTMLInputElement).value, mouseEvent),
    value: prop.value,
  });

export const gitHubIcon = (prop: { color: string; class: string }): VNode =>
  h("svg", { viewBox: "0 0 20 20", key: "github-icon", class: prop.class }, [
    h("path", {
      d:
        "M10 0C4.476 0 0 4.477 0 10c0 4.418 2.865 8.166 6.84 9.49.5.09.68-.218.68-.483 0-.237-.007-.866-.012-1.7-2.782.603-3.37-1.34-3.37-1.34-.454-1.157-1.11-1.464-1.11-1.464-.907-.62.07-.608.07-.608 1.003.07 1.53 1.03 1.53 1.03.893 1.53 2.342 1.087 2.912.83.09-.645.35-1.085.634-1.335-2.22-.253-4.555-1.11-4.555-4.943 0-1.09.39-1.984 1.03-2.683-.105-.253-.448-1.27.096-2.647 0 0 .84-.268 2.75 1.026C8.294 4.95 9.15 4.84 10 4.836c.85.004 1.705.115 2.504.337 1.91-1.294 2.747-1.026 2.747-1.026.548 1.377.204 2.394.1 2.647.64.7 1.03 1.592 1.03 2.683 0 3.842-2.34 4.687-4.566 4.935.36.308.678.92.678 1.852 0 1.336-.01 2.415-.01 2.743 0 .267.18.578.687.48C17.14 18.163 20 14.417 20 10c0-5.522-4.478-10-10-10",
      fill: prop.color,
    }),
  ]);

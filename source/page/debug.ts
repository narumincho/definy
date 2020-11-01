import * as about from "./about";
import * as d from "definy-core/source/data";
import * as header from "../header";
import * as home from "./home";
import * as ui from "../ui";
import { Projector, VNode, h } from "maquette";
import { ModelInterface } from "../modelInterface";

export class Model {
  modelInterface: ModelInterface;

  tab: Tab = "header";

  constructor(modelInterface: ModelInterface) {
    this.modelInterface = modelInterface;
  }

  changeTab(newTab: Tab): void {
    this.tab = newTab;
  }
}

const defaultModelInterface: ModelInterface = new ModelInterface(
  {
    accountToken: d.Maybe.Nothing(),
    clientMode: d.ClientMode.DebugMode,
    language: "English",
  },
  (null as unknown) as Projector,
  () => {},
  true
);

const sampleProject: ReadonlyArray<[
  d.ProjectId,
  d.ResourceState<d.Project>
]> = [
  [
    "6b9495528e9a12186b9c210448bdc90b" as d.ProjectId,
    d.ResourceState.Loaded({
      dataMaybe: d.Maybe.Just<d.Project>({
        name: "プロジェクトA",
        createTime: { day: 0, millisecond: 0 },
        createUserId: "6b9495528e9a12186b9c210448bdc90b" as d.UserId,
        iconHash: "a3acd80b2cc41ae8977ad486a8bdad7039a6e6a5d4ac19ecb66aab3231addce4" as d.ImageToken,
        imageHash: "a3acd80b2cc41ae8977ad486a8bdad7039a6e6a5d4ac19ecb66aab3231addce4" as d.ImageToken,
        updateTime: { day: 0, millisecond: 0 },
        commitId: "4b21c121436718dda1ec3a6c356dfcde" as d.CommitId,
        rootIdeaId: "2c631445a030dc42a895fd8077eeb685" as d.IdeaId,
      }),
      getTime: { day: 0, millisecond: 0 },
    }),
  ],
  [
    "dc2c318f1cab573562497ea1e4b96c0e" as d.ProjectId,
    d.ResourceState.Loaded({
      dataMaybe: d.Maybe.Just<d.Project>({
        name: "プロジェクトB",
        createTime: { day: 0, millisecond: 0 },
        createUserId: "6b9495528e9a12186b9c210448bdc90b" as d.UserId,
        iconHash: "a3acd80b2cc41ae8977ad486a8bdad7039a6e6a5d4ac19ecb66aab3231addce4" as d.ImageToken,
        imageHash: "a3acd80b2cc41ae8977ad486a8bdad7039a6e6a5d4ac19ecb66aab3231addce4" as d.ImageToken,
        updateTime: { day: 0, millisecond: 0 },
        commitId: "ace57e8c338740d74206299be8ad081a" as d.CommitId,
        rootIdeaId: "2c631445a030dc42a895fd8077eeb685" as d.IdeaId,
      }),
      getTime: { day: 0, millisecond: 0 },
    }),
  ],
  [
    "4e7e1c9629b3eff2e908a151d501b8c6" as d.ProjectId,
    d.ResourceState.Loaded({
      dataMaybe: d.Maybe.Just<d.Project>({
        name: "プロジェクトC",
        createTime: { day: 0, millisecond: 0 },
        createUserId: "6b9495528e9a12186b9c210448bdc90b" as d.UserId,
        iconHash: "a3acd80b2cc41ae8977ad486a8bdad7039a6e6a5d4ac19ecb66aab3231addce4" as d.ImageToken,
        imageHash: "a3acd80b2cc41ae8977ad486a8bdad7039a6e6a5d4ac19ecb66aab3231addce4" as d.ImageToken,
        updateTime: { day: 0, millisecond: 0 },
        commitId: "5698010f59c9ca980de3f1c53ab16f8b" as d.CommitId,
        rootIdeaId: "2c631445a030dc42a895fd8077eeb685" as d.IdeaId,
      }),
      getTime: { day: 0, millisecond: 0 },
    }),
  ],
];

const iconImage = (imageStaticResource: d.StaticResourceState<string>): VNode =>
  ui.Image({
    className: "debug__image-with-border",
    imageToken: "a" as d.ImageToken,
    modelInterface: {
      ...defaultModelInterface,
      imageMap: new Map([["a" as d.ImageToken, imageStaticResource]]),
    } as ModelInterface,
  });

const homeModelInterface = new ModelInterface(
  {
    accountToken: d.Maybe.Nothing(),
    clientMode: d.ClientMode.DebugMode,
    language: "English",
  },
  (null as unknown) as Projector,
  () => {},
  true
);
homeModelInterface.projectMap = new Map([
  sampleProject[0],
  sampleProject[1],
  sampleProject[2],
]);
homeModelInterface.top50ProjectIdState = {
  _: "Loaded",
  projectIdList: [
    sampleProject[0][0],
    sampleProject[1][0],
    sampleProject[2][0],
  ],
};

const sampleComponentList = {
  header: header.view(defaultModelInterface),
  home: home.view(new home.Model(defaultModelInterface)),
  homeWithProject: home.view(new home.Model(homeModelInterface)),
  about: about.view,
  requestingImage: h("div", {}, [
    "WaitLoading",
    iconImage(d.StaticResourceState.WaitLoading()),
    "Loading",
    iconImage(d.StaticResourceState.Loading()),
    "WaitRequesting",
    iconImage(d.StaticResourceState.WaitRequesting()),
    "Requesting",
    iconImage(d.StaticResourceState.Requesting()),
  ]),
};

const allTab = Object.keys(sampleComponentList) as ReadonlyArray<
  keyof typeof sampleComponentList
>;
type Tab = keyof typeof sampleComponentList;

export const view = (model: Model): VNode =>
  h("div", { class: "debug__root" }, [
    h(
      "div",
      { class: "debug__tab-list" },
      allTab.map((tabName) => {
        if (tabName === model.tab) {
          return h("div", { class: "debug__tab--selected" }, [tabName]);
        }
        return ui.button(
          {
            key: tabName,
            onClick: () => {
              model.changeTab(tabName);
            },
          },
          [tabName]
        );
      })
    ),
    sampleComponentList[model.tab],
  ]);

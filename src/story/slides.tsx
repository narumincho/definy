import {
  Fragment,
  useLayoutEffect,
  useRef,
  useState,
  type JSX,
  type ReactNode,
} from "react";
import { label } from "../language.ts";
import type { LanguageCode } from "../types.ts";
import { expressionToLayoutNode } from "../tree_layout/ast_to_layout.ts";
import { computeLayout } from "../tree_layout/engine.ts";
import { TreeLayoutRenderer } from "../tree_layout/TreeLayoutRenderer.tsx";
import { SELF_HOSTING_STATS } from "./self_hosting_stats.ts";

/**
 * 紹介スライド (/about の上) の内容.
 * 1 枚のスライドは `steps` 回の「次へ」で要素が順に現れる (`<Reveal at={n}>`).
 * 再生すると `duration` 秒をステップの数 + 1 で等分した間隔で進む (src/story/timeline.ts).
 * 大きさは全て em で書き, 1em はスライドの幅の 1/80 (src/story/story.css の .story-slide)
 */

type Text = { readonly ja: string; readonly en: string };

export type SlideProps = {
  readonly step: number;
  readonly lang: LanguageCode;
};

export type Slide = {
  readonly id: string;
  readonly title: Text;
  /** 自動再生で このスライドに使う秒数 */
  readonly duration: number;
  /** 最初の表示の後に「次へ」で進むステップの数 */
  readonly steps: number;
  readonly render: (props: SlideProps) => JSX.Element;
  /** このスライドが現れるときの切り替えのアニメーション (src/story/story.css の .is-enter-*) */
  readonly transition: SlideTransition;
};

export type SlideTransition =
  | "zoom"
  | "wipe-right"
  | "rise"
  | "flip"
  | "pop"
  | "iris"
  | "slide-left"
  | "wipe-down"
  | "spin"
  | "slide-right"
  | "blur"
  | "shrink";

/** エスペラントの文は用意していないので英語にする */
function t(lang: LanguageCode, text: Text): string {
  return label(lang, text.en, text.ja, text.en);
}

function Reveal(props: {
  readonly at: number;
  readonly step: number;
  readonly delay?: number;
  readonly className?: string;
  readonly children: ReactNode;
}): JSX.Element {
  const { at, step, delay = 0, className = "", children } = props;
  return (
    <div
      className={`story-reveal ${step >= at ? "is-on" : ""} ${className}`}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

function Heading(props: {
  readonly lang: LanguageCode;
  readonly kicker: Text;
  readonly text: Text;
}): JSX.Element {
  return (
    <div className="story-heading">
      <div className="story-kicker">{t(props.lang, props.kicker)}</div>
      <h2>{t(props.lang, props.text)}</h2>
    </div>
  );
}

/**
 * スライドに出てくる関連プロジェクト. `logo` は public/story/logos/ の SVG
 * (simple-icons, CC0) で, `color` で塗る
 */
const PROJECTS = {
  elm: {
    name: "Elm",
    url: "https://elm-lang.org/",
    logo: "elm",
    color: "#60b5cc",
  },
  typescript: {
    name: "TypeScript",
    url: "https://www.typescriptlang.org/",
    logo: "typescript",
    color: "#3178c6",
  },
  purescript: {
    name: "PureScript",
    url: "https://www.purescript.org/",
    logo: "purescript",
    color: "#c4c9d4",
  },
  deno: {
    name: "Deno",
    url: "https://deno.com/",
    logo: "deno",
    color: "#e8eaee",
  },
  flutter: {
    name: "Flutter",
    url: "https://flutter.dev/",
    logo: "flutter",
    color: "#54c5f8",
  },
  rust: {
    name: "Rust",
    url: "https://www.rust-lang.org/",
    logo: "rust",
    color: "#e0904f",
  },
  webassembly: {
    name: "WebAssembly",
    url: "https://webassembly.org/",
    logo: "webassembly",
    color: "#8b7bff",
  },
  react: {
    name: "React",
    url: "https://react.dev/",
    logo: "react",
    color: "#61dafb",
  },
  scratch: {
    name: "Scratch",
    url: "https://scratch.mit.edu/",
    logo: "scratch",
    color: "#f9a92f",
  },
  git: {
    name: "Git",
    url: "https://git-scm.com/",
    logo: "git",
    color: "#f05033",
  },
  connect: {
    name: "Connect-RPC",
    url: "https://connectrpc.com/",
    logo: undefined,
    color: "#8cbaf5",
  },
  bitcoin: {
    name: "Bitcoin",
    url: "https://bitcoin.org/",
    logo: "bitcoin",
    color: "#f7931a",
  },
  ethereum: {
    name: "Ethereum",
    url: "https://ethereum.org/",
    logo: "ethereum",
    color: "#a0a6ff",
  },
  nostr: {
    name: "nostr",
    url: "https://github.com/nostr-protocol/nostr",
    // https://github.com/mbarulli/nostr-logo (CC0). 公式の紫 #662482 は暗い背景で見えにくいので明るくする
    logo: "nostr",
    color: "#b07fe0",
  },
  lean: {
    name: "Lean 4",
    url: "https://lean-lang.org/",
    logo: undefined,
    color: "#c9b8f7",
  },
  idris: {
    name: "Idris 2",
    url: "https://github.com/idris-lang/Idris2",
    logo: undefined,
    color: "#c9b8f7",
  },
  nyxis: {
    name: "nyxis",
    url: "https://github.com/NyxFoundation/nyxis",
    logo: undefined,
    color: "#c9b8f7",
  },
  h5i: {
    name: "h5i",
    url: "https://github.com/h5i-dev/h5i",
    logo: undefined,
    color: "#c9b8f7",
  },
  qedos: {
    name: "qedos",
    url: "https://github.com/shi3z/qedos",
    logo: undefined,
    color: "#c9b8f7",
  },
} as const satisfies Record<
  string,
  {
    readonly name: string;
    readonly url: string;
    readonly logo: string | undefined;
    readonly color: string;
  }
>;

type ProjectId = keyof typeof PROJECTS;

function Logo(props: {
  readonly project: ProjectId;
  readonly size?: number;
}): JSX.Element | null {
  const project = PROJECTS[props.project];
  if (project.logo === undefined) {
    return null;
  }
  const url = `url(/story/logos/${project.logo}.svg)`;
  return (
    <span
      className="story-logo-icon"
      aria-hidden="true"
      style={{
        backgroundColor: project.color,
        maskImage: url,
        WebkitMaskImage: url,
        fontSize: `${props.size ?? 1}em`,
      }}
    />
  );
}

/** 関連プロジェクトの公式サイトへのリンク. 新しいタブで開き, クリックしてもスライドは進まない */
function ProjectLink(props: {
  readonly project: ProjectId;
  readonly children?: ReactNode;
  readonly className?: string;
}): JSX.Element {
  const project = PROJECTS[props.project];
  return (
    <a
      href={project.url}
      target="_blank"
      rel="noreferrer"
      className={`story-link ${props.className ?? ""}`}
      style={{ color: project.color }}
    >
      {props.children ?? (
        <>
          <Logo project={props.project} />
          {project.name}
        </>
      )}
    </a>
  );
}

/* ------------------------------------------------------------------ */

function TitleSlide({ lang }: SlideProps): JSX.Element {
  return (
    <div className="story-center">
      <div className="story-title-orbit" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <Reveal at={0} step={0}>
        <img
          src="/icon.png"
          alt=""
          className="story-logo"
          width={160}
          height={160}
        />
      </Reveal>
      <Reveal at={0} step={0} delay={0.25}>
        <p className="story-wordmark">definy</p>
      </Reveal>
      <Reveal at={0} step={0} delay={0.5}>
        <p className="story-lead">
          {t(lang, {
            ja: "シンプルな純粋関数型のビジュアルプログラミング言語",
            en: "A simple, purely functional visual programming language",
          })}
        </p>
      </Reveal>
      <Reveal at={0} step={0} delay={0.8}>
        <p className="story-sub">
          {t(lang, {
            ja: "これまでと、これから",
            en: "Where it came from, where it is going",
          })}
          <span className="story-author">
            <img
              src="/story/narumincho.webp"
              alt=""
              width={40}
              height={40}
              className="story-avatar"
            />
            @narumincho
          </span>
        </p>
      </Reveal>
    </div>
  );
}

/**
 * `git log` の月ごとのコミット数 (2026-11-04 時点). 無い月は 0.
 * 作り直すには `git log --format=%ad --date=format:%Y-%m | sort | uniq -c`
 */
const COMMITS_BY_MONTH: Readonly<Record<string, number>> = {
  "2019-01": 2,
  "2019-02": 96,
  "2019-03": 9,
  "2019-04": 27,
  "2019-05": 32,
  "2019-06": 13,
  "2019-07": 8,
  "2019-08": 57,
  "2019-09": 59,
  "2019-10": 36,
  "2019-11": 35,
  "2019-12": 52,
  "2020-01": 8,
  "2020-02": 7,
  "2020-03": 117,
  "2020-04": 91,
  "2020-05": 31,
  "2020-06": 54,
  "2020-07": 75,
  "2020-08": 45,
  "2020-09": 11,
  "2020-10": 25,
  "2020-11": 69,
  "2020-12": 77,
  "2021-01": 58,
  "2021-02": 66,
  "2021-03": 96,
  "2021-04": 87,
  "2021-05": 76,
  "2021-06": 45,
  "2021-07": 34,
  "2021-08": 57,
  "2021-09": 55,
  "2021-10": 67,
  "2021-11": 100,
  "2021-12": 77,
  "2022-01": 108,
  "2022-02": 97,
  "2022-03": 56,
  "2022-04": 42,
  "2022-05": 23,
  "2022-06": 28,
  "2022-07": 34,
  "2022-08": 73,
  "2022-09": 121,
  "2022-10": 85,
  "2022-11": 139,
  "2022-12": 77,
  "2023-01": 13,
  "2023-02": 13,
  "2023-03": 1,
  "2023-04": 27,
  "2023-05": 22,
  "2024-01": 70,
  "2024-06": 9,
  "2024-07": 7,
  "2025-06": 4,
  "2025-09": 2,
  "2025-11": 14,
  "2025-12": 19,
  "2026-01": 87,
  "2026-02": 69,
  "2026-03": 130,
  "2026-05": 14,
  "2026-06": 10,
  "2026-07": 18,
  "2026-08": 86,
  "2026-09": 133,
  "2026-10": 481,
  "2026-11": 77,
};

/** 最初のコミット (`git log --reverse`) */
const FIRST_COMMIT = {
  date: "2019-01-31",
  time: "13:36",
};

const FIRST_MONTH = { year: 2019, month: 1 };
const LAST_MONTH = { year: 2026, month: 11 };

type MonthCount = {
  readonly year: number;
  readonly month: number;
  readonly count: number;
};

const MONTHLY_COMMITS: readonly MonthCount[] = (() => {
  const result: MonthCount[] = [];
  for (
    let index = FIRST_MONTH.year * 12 + FIRST_MONTH.month - 1;
    index <= LAST_MONTH.year * 12 + LAST_MONTH.month - 1;
    index++
  ) {
    const year = Math.floor(index / 12);
    const month = (index % 12) + 1;
    const key = `${year}-${month.toString().padStart(2, "0")}`;
    result.push({ year, month, count: COMMITS_BY_MONTH[key] ?? 0 });
  }
  return result;
})();

/** 月の添字 (MONTHLY_COMMITS の何番目か) */
function monthIndex(year: number, month: number): number {
  return (year - FIRST_MONTH.year) * 12 + (month - FIRST_MONTH.month);
}

function commitsIn(from: number, to: number): number {
  return MONTHLY_COMMITS.filter((m) => m.year >= from && m.year <= to).reduce(
    (sum, m) => sum + m.count,
    0,
  );
}

const TOTAL_COMMITS = commitsIn(0, 9999);
const PEAK_MONTH = MONTHLY_COMMITS.reduce((peak, m) =>
  m.count > peak.count ? m : peak,
);

/** 主に使っていた言語の移り変わり. from/to は月 (両端を含む) */
const LANGUAGE_ERAS: ReadonlyArray<{
  readonly from: readonly [number, number];
  readonly to: readonly [number, number];
  readonly projects: readonly ProjectId[];
  readonly color: string;
  /** definy 自身で書いた部分も使っている */
  readonly withDefiny?: boolean;
  /**
   * 期間が短く名前が入りきらないものは 2 段目に置き, 右端にそろえて左へはみ出させる
   */
  readonly secondRow?: boolean;
}> = [
  { from: [2019, 1], to: [2020, 5], projects: ["elm"], color: "#60b5cc" },
  {
    from: [2020, 6],
    to: [2022, 12],
    projects: ["typescript", "purescript"],
    color: "#3178c6",
  },
  {
    from: [2023, 1],
    to: [2025, 12],
    projects: ["deno", "flutter"],
    color: "var(--text-muted)",
  },
  { from: [2026, 1], to: [2026, 9], projects: ["rust"], color: "#e0904f" },
  {
    // 2026-10-18 に Rust 製のコンパイラ・サーバーを削除し, TypeScript と definy 製の Wasm にした
    from: [2026, 10],
    to: [2026, 11],
    projects: ["typescript"],
    color: "#b9d09b",
    withDefiny: true,
    secondRow: true,
  },
];

function formatCount(count: number): string {
  return count.toLocaleString("en-US");
}

function HistorySlide({ step, lang }: SlideProps): JSX.Element {
  const max = PEAK_MONTH.count;
  const columns = {
    gridTemplateColumns: `repeat(${MONTHLY_COMMITS.length}, 1fr)`,
  };
  const years = [...new Set(MONTHLY_COMMITS.map((m) => m.year))];
  return (
    <div className="story-body">
      <Heading
        lang={lang}
        kicker={{
          ja: "これまで (2026-11-04 時点)",
          en: "History (as of 2026-11-04)",
        }}
        text={{
          ja: `${formatCount(TOTAL_COMMITS)} コミットから読む definy の歴史`,
          en: `The history of definy in ${formatCount(TOTAL_COMMITS)} commits`,
        }}
      />
      <div className="story-chart is-monthly" style={columns}>
        {MONTHLY_COMMITS.map((m, index) => {
          const quiet = m.year >= 2023 && m.year <= 2025;
          const highlight =
            step >= 3
              ? quiet
                ? "is-quiet"
                : m.year === 2026
                  ? "is-hot"
                  : ""
              : "";
          const label = `${m.year}-${m.month.toString().padStart(2, "0")}: ${m.count}`;
          return (
            <div
              key={label}
              className={`story-bar-column ${highlight} ${m.month === 1 ? "is-january" : ""}`}
              title={label}
            >
              {m === PEAK_MONTH && step >= 3 ? (
                <div className="story-bar-peak">
                  {m.count}
                  <small>{`${m.year}-${m.month}`}</small>
                </div>
              ) : null}
              <div
                className="story-bar"
                style={{
                  height: `${(m.count / max) * 100}%`,
                  animationDelay: `${index * 0.012}s`,
                }}
              />
            </div>
          );
        })}
        <Reveal at={2} step={step} className="story-first-commit">
          <span className="story-first-commit-flag">🚩</span>
          <span>
            {t(lang, { ja: "最初のコミット", en: "First commit" })}
            <code>
              {FIRST_COMMIT.date} {FIRST_COMMIT.time}
            </code>
            <span className="story-first-commit-author">
              <img
                src="/story/narumincho.webp"
                alt=""
                width={24}
                height={24}
                className="story-avatar"
              />
              narumincho
            </span>
          </span>
        </Reveal>
      </div>
      <div className="story-years" style={columns}>
        {years.map((year) => {
          const start = monthIndex(
            year,
            year === FIRST_MONTH.year ? FIRST_MONTH.month : 1,
          );
          const end = Math.min(
            monthIndex(year, 12),
            MONTHLY_COMMITS.length - 1,
          );
          return (
            <div
              key={year}
              className="story-year"
              style={{ gridColumn: `${start + 1} / ${end + 2}` }}
            >
              {year}
            </div>
          );
        })}
      </div>
      <Reveal at={1} step={step} className="story-eras">
        <div className="story-eras-grid" style={columns}>
          {LANGUAGE_ERAS.map((era, index) => (
            <div
              key={era.projects.join()}
              className={`story-era ${era.secondRow === true ? "is-second-row" : ""}`}
              style={{
                gridColumn: `${monthIndex(...era.from) + 1} / ${monthIndex(...era.to) + 2}`,
                borderColor: era.color,
                animationDelay: `${index * 0.15}s`,
              }}
            >
              {era.projects.map((project, i) => (
                <span key={project} className="story-era-item">
                  {i > 0 ? <span className="story-era-sep">+</span> : null}
                  <ProjectLink project={project}>
                    <Logo project={project} size={1.5} />
                    {PROJECTS[project].name}
                  </ProjectLink>
                </span>
              ))}
              {era.withDefiny === true ? (
                <span className="story-era-item">
                  <span className="story-era-sep">+</span>
                  <span className="story-era-definy">definy</span>
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </Reveal>
      <div className="story-callouts">
        <Reveal at={2} step={step} className="story-callout">
          🎓{" "}
          {t(lang, {
            ja: `${FIRST_COMMIT.date}, 大学の研究から始まった個人プロジェクト`,
            en: `${FIRST_COMMIT.date}: started as a personal project from university research`,
          })}
        </Reveal>
        <Reveal at={3} step={step} className="story-callout is-quiet">
          💤{" "}
          {t(lang, {
            ja: `2023〜2025 年: 手が止まった 3 年 (${commitsIn(2023, 2025)} コミット)`,
            en: `2023–2025: three quiet years (${commitsIn(2023, 2025)} commits)`,
          })}
        </Reveal>
        <Reveal at={3} step={step} delay={0.3} className="story-callout is-hot">
          🚀{" "}
          {t(lang, {
            ja: `2026 年: ${formatCount(commitsIn(2026, 2026))} コミット`,
            en: `2026: ${formatCount(commitsIn(2026, 2026))} commits`,
          })}
        </Reveal>
      </div>
    </div>
  );
}

function VibeCodingSlide({ step, lang }: SlideProps): JSX.Element {
  return (
    <div className="story-body">
      <Heading
        lang={lang}
        kicker={{ ja: "転機", en: "Turning point" }}
        text={{
          ja: "バイブコーディングで一気に進んだ",
          en: "Vibe coding unblocked everything",
        }}
      />
      <div className="story-two">
        <Reveal at={0} step={step} className="story-panel is-quiet">
          <div className="story-panel-label">
            {t(lang, { ja: "少し前まで", en: "Until recently" })}
          </div>
          <div className="story-big-number">
            201
            <small>
              {t(lang, { ja: " コミット / 3 年", en: " commits / 3 yrs" })}
            </small>
          </div>
          <p>
            {t(lang, {
              ja: "作りたいものは大きいのに, 1 人では手が回らない。モチベーションが続かなかった",
              en: "The vision was huge, one person could not keep up, and motivation faded",
            })}
          </p>
        </Reveal>
        <Reveal at={1} step={step} className="story-arrow">
          →
        </Reveal>
        <Reveal at={1} step={step} delay={0.2} className="story-panel is-hot">
          <div className="story-panel-label">
            {t(lang, { ja: "2026 年 10 月", en: "October 2026" })}
          </div>
          <div className="story-big-number">
            481
            <small>
              {t(lang, { ja: " コミット / 1 か月", en: " commits / month" })}
            </small>
          </div>
          <p>
            {t(lang, {
              ja: "AI に実装を任せ, 自分は「何を作るか」と仕様を決めることに集中",
              en: "AI writes the code; I focus on what to build and the spec",
            })}
          </p>
        </Reveal>
      </div>
      <Reveal at={2} step={step} className="story-note">
        {t(lang, {
          ja: "Rust 製のコンパイラ・サーバーを捨てて, TypeScript と definy 自身で書いたコンパイラ (Wasm) に置き換えるところまで来た (2026-10)",
          en: "Far enough to throw away the Rust compiler and server and replace them with TypeScript and a Wasm compiler written in definy (Oct 2026)",
        })}
      </Reveal>
    </div>
  );
}

/**
 * definy のエディタと同じ部品 (TreeLayoutRenderer) で描く式. 三角形の面積 (sample.triangle-area) の割る数を「穴」にしたもの.
 * seed の JSON のまま (`{"$part": ...}`) を渡すと, パーツの名前で表示される
 */
const SAMPLE_EXPRESSION = {
  "#call": {
    function: {
      "#part_reference": {
        part_definition_event_hash: { $part: "core.divide" },
      },
    },
    arguments: [
      {
        name: "left",
        value: {
          "#call": {
            function: {
              "#part_reference": {
                part_definition_event_hash: { $part: "core.multiply" },
              },
            },
            arguments: [
              { name: "left", value: { "#number": 10 } },
              { name: "right", value: { "#number": 5 } },
            ],
          },
        },
      },
      { name: "right", value: { "#hole": null } },
    ],
  },
};

/** ツリーを描く幅. エディタと同じ computeLayout でこの幅に折り返し, パネルの幅まで拡大する */
const TREE_WIDTH_PX = 560;

const SAMPLE_LAYOUT = computeLayout(
  expressionToLayoutNode(SAMPLE_EXPRESSION, "story"),
  { maxWidth: TREE_WIDTH_PX },
);

/**
 * 実際の式のツリーエディタの描画部品で描いた式 (読むだけ).
 * ツリーの大きさは px で決まるので, パネルの幅に合わせて縮める
 */
function RealExpressionTree(): JSX.Element {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 1, height: 0 });
  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (outer === null || inner === null) {
      return;
    }
    const update = (): void => {
      // CSS の max-height (スライドの em) にも収まるようにする
      const maxHeight = Number.parseFloat(getComputedStyle(outer).maxHeight);
      const scale = Math.min(
        outer.clientWidth / TREE_WIDTH_PX,
        Number.isFinite(maxHeight) ? maxHeight / inner.scrollHeight : Infinity,
      );
      setFit({ scale, height: inner.scrollHeight * scale });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(outer);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={outerRef}
      className="story-real-tree"
      style={{ height: fit.height === 0 ? undefined : fit.height }}
    >
      <div
        ref={innerRef}
        className="story-real-tree-inner"
        style={{ width: TREE_WIDTH_PX, transform: `scale(${fit.scale})` }}
      >
        <TreeLayoutRenderer node={SAMPLE_LAYOUT} editable={false} />
      </div>
    </div>
  );
}

function StructuredEditingSlide({ step, lang }: SlideProps): JSX.Element {
  return (
    <div className="story-body is-tight">
      <Heading
        lang={lang}
        kicker={{ ja: "特徴 1", en: "Feature 1" }}
        text={{
          ja: "構造化編集: 構文エラーが存在しない",
          en: "Structured editing: no syntax errors",
        }}
      />
      <div className="story-two is-wide-right">
        <Reveal at={0} step={step} className="story-panel">
          <div className="story-panel-label">
            {t(lang, { ja: "テキストのコード", en: "Text code" })}
          </div>
          <pre className="story-code">
            <span className="story-typing">{"let total = add(price, "}</span>
            <span className="story-squiggle">{"   "}</span>
          </pre>
          <div className="story-error">
            ✗ SyntaxError: Unexpected end of input
          </div>
        </Reveal>
        <Reveal at={1} step={step} className="story-panel is-good">
          <div className="story-panel-label">definy</div>
          <RealExpressionTree />
          <div className="story-ok">
            {t(lang, {
              ja: "✓ 空きの「穴」は, 入るべき型を知っている",
              en: "✓ The empty hole knows which type belongs there",
            })}
          </div>
        </Reveal>
      </div>
      <div className="story-notes">
        <Reveal at={2} step={step} className="story-note">
          {t(lang, {
            ja: "コードは文字列ではなく構文木として保存。壊れた状態をそもそも作れない",
            en: "Code is stored as a syntax tree, not text — broken states cannot be written",
          })}
        </Reveal>
        <Reveal at={3} step={step} className="story-note is-hot">
          {t(lang, {
            ja: "予約語が存在しない。let や match も組み込みのパーツで, 構文は文字ではなく木の種類で決まるので, let や if という名前もそのまま使える",
            en: "There are no reserved words. let and match are just builtin parts; syntax is the kind of tree node, not text, so you can name things let or if",
          })}
        </Reveal>
      </div>
    </div>
  );
}

function ScratchSlide({ step, lang }: SlideProps): JSX.Element {
  const rows: ReadonlyArray<{
    readonly at: number;
    readonly name: Text;
    readonly scratch: string;
    readonly definy: Text;
  }> = [
    {
      at: 0,
      name: { ja: "ブロックで組み立てる", en: "Build with blocks" },
      scratch: "✓",
      definy: { ja: "✓ 式の木", en: "✓ expression trees" },
    },
    {
      at: 1,
      name: { ja: "純粋性", en: "Purity" },
      scratch: "✗",
      definy: {
        ja: "✓ 同じ入力なら必ず同じ結果。副作用は外から渡す能力で",
        en: "✓ same input, same output; effects come in as capabilities",
      },
    },
    {
      at: 2,
      name: { ja: "代数的データ型", en: "Algebraic data types" },
      scratch: "✗",
      definy: {
        ja: "✓ レコードと直和型, パターンマッチの網羅性検査",
        en: "✓ records, unions, exhaustive pattern matching",
      },
    },
  ];
  return (
    <div className="story-body">
      <Heading
        lang={lang}
        kicker={{ ja: "特徴 2", en: "Feature 2" }}
        text={{
          ja: "Scratch のように, でも純粋で型がある",
          en: "Like Scratch, but pure and typed",
        }}
      />
      <div className="story-compare">
        <div className="story-compare-head" />
        <div className="story-compare-head">
          <ProjectLink project="scratch" />
        </div>
        <div className="story-compare-head is-definy">definy</div>
        {rows.map((row) => (
          <Reveal
            key={row.name.en}
            at={row.at}
            step={step}
            className="story-compare-row"
          >
            <div className="story-compare-name">{t(lang, row.name)}</div>
            <div className={row.scratch === "✓" ? "story-yes" : "story-no"}>
              {row.scratch}
            </div>
            <div className="story-yes">{t(lang, row.definy)}</div>
          </Reveal>
        ))}
      </div>
      <Reveal at={3} step={step} className="story-adt">
        <div className="story-node is-type">
          <span className="story-node-name">Shape</span>
          <div className="story-node is-variant">circle(radius)</div>
          <span className="story-or">|</span>
          <div className="story-node is-variant">rect(width, height)</div>
        </div>
        <div className="story-node is-match">
          <span className="story-node-name">match</span>
          <div className="story-node is-arm">circle → π r²</div>
          <div className="story-node is-arm">rect → w × h</div>
          <div className="story-check">
            {t(lang, { ja: "✓ 漏れなし", en: "✓ exhaustive" })}
          </div>
        </div>
      </Reveal>
    </div>
  );
}

/**
 * 署名付きイベントのスライドの図. 位置は図の左上を (0, 0), 右下を (100, 100) とした割合
 */
type NetworkNodeId = "alice" | "bob" | "narumincho" | "bobServer" | "evil";

const NETWORK_NODES: Readonly<
  Record<NetworkNodeId, { readonly x: number; readonly y: number }>
> = {
  alice: { x: 13, y: 17 },
  bob: { x: 13, y: 68 },
  narumincho: { x: 84, y: 17 },
  bobServer: { x: 48, y: 68 },
  evil: { x: 84, y: 68 },
};

/** 線. `pulseAt` のステップではイベントが流れる */
const NETWORK_LINKS: ReadonlyArray<{
  readonly from: NetworkNodeId;
  readonly to: NetworkNodeId;
  readonly label?: Text;
  readonly appearAt: number;
  readonly pulseAt: readonly number[];
}> = [
  {
    from: "alice",
    to: "narumincho",
    label: { ja: "ブラウザから直接", en: "directly from the browser" },
    appearAt: 0,
    pulseAt: [1],
  },
  {
    from: "bob",
    to: "bobServer",
    appearAt: 0,
    pulseAt: [1],
  },
  {
    from: "bobServer",
    to: "narumincho",
    label: { ja: "サーバー同士でつながる", en: "servers sync" },
    appearAt: 0,
    pulseAt: [1],
  },
  {
    from: "evil",
    to: "narumincho",
    appearAt: 2,
    pulseAt: [2],
  },
  {
    from: "alice",
    to: "bobServer",
    label: { ja: "控えから出し直す", en: "republish" },
    appearAt: 4,
    pulseAt: [4],
  },
];

const NETWORK_CAPTIONS: readonly Text[] = [
  {
    ja: "nostr と同じく, 公開鍵がそのままユーザー ID。ライトユーザーはブラウザから直接, データを持ちたい人は自分で建てたサーバー経由でつなぐ",
    en: "Like nostr, the public key is the user ID. Light users connect straight from the browser; people who want their own data go through a server they run",
  },
  {
    ja: "署名したイベントはサーバーからサーバーへ広がる。どのサーバーでも署名を確かめられる",
    en: "Signed events spread from server to server, and every server can check the signature",
  },
  {
    ja: "秘密鍵を持たないサーバーは, 他の人のイベントを偽造も改ざんもできない",
    en: "Without the private key a server cannot forge or alter anyone's events",
  },
  {
    ja: "サーバーにできるのは「載せない」こと = 削除だけ (著作権侵害などに対応できる)",
    en: "All a server can do is stop serving it — delete (e.g. copyright violations)",
  },
  {
    ja: "自分のサーバーにはデータが残る。手元の控えから別のサーバーへ出し直すこともできる",
    en: "Your own server keeps the data, and you can republish your local copy elsewhere",
  },
];

type EventState = "ok" | "forged" | "deleted";
type NetworkEvent = {
  readonly author: "Alice" | "Bob";
  readonly state: EventState;
};

/** そのステップで各ノードが持つイベント */
function networkEvents(
  node: NetworkNodeId,
  step: number,
): readonly NetworkEvent[] {
  switch (node) {
    case "alice":
      return step >= 1 ? [{ author: "Alice", state: "ok" }] : [];
    case "bob":
      return step >= 1 ? [{ author: "Bob", state: "ok" }] : [];
    case "narumincho":
      return step >= 1
        ? [
            { author: "Alice", state: step >= 3 ? "deleted" : "ok" },
            { author: "Bob", state: "ok" },
          ]
        : [];
    case "bobServer":
      return step >= 1
        ? [
            { author: "Bob", state: "ok" },
            { author: "Alice", state: "ok" },
          ]
        : [];
    case "evil":
      return step >= 2 ? [{ author: "Alice", state: "forged" }] : [];
  }
}

function EventChip(props: {
  readonly event: NetworkEvent;
  readonly lang: LanguageCode;
}): JSX.Element {
  const { event, lang } = props;
  const { author, state } = event;
  return (
    <div className={`story-event-chip is-${state}`}>
      <span className="story-event-chip-body">
        {state === "forged"
          ? t(lang, {
              ja: `${author}: 偽のコミット`,
              en: `${author}: forged commit`,
            })
          : t(lang, { ja: `${author}: コミット`, en: `${author}: commit` })}
      </span>
      <span className="story-event-chip-mark">
        {state === "ok"
          ? t(lang, { ja: "✓ 署名 OK", en: "✓ valid" })
          : state === "forged"
            ? t(lang, { ja: "✗ 署名が合わない", en: "✗ bad signature" })
            : t(lang, { ja: "🗑 削除", en: "🗑 deleted" })}
      </span>
    </div>
  );
}

function NetworkNode(props: {
  readonly id: NetworkNodeId;
  readonly step: number;
  readonly lang: LanguageCode;
  readonly appearAt: number;
  readonly kind: "client" | "server";
  readonly icon: string;
  readonly name: Text;
  readonly detail: Text;
  readonly publicKey?: string;
  readonly className?: string;
}): JSX.Element {
  const { id, step, lang } = props;
  const position = NETWORK_NODES[id];
  return (
    <div
      className="story-net-node"
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
    >
      <Reveal
        at={props.appearAt}
        step={step}
        className={`story-net-card is-${props.kind} ${props.className ?? ""}`}
      >
        <div className="story-net-card-head">
          <span>
            {props.icon} {t(lang, props.name)}
          </span>
          <small>{t(lang, props.detail)}</small>
        </div>
        {props.publicKey === undefined ? null : (
          <div className="story-net-key">
            🔑 <code>{props.publicKey}</code>
          </div>
        )}
        <div className="story-net-events">
          {networkEvents(id, step).map((event) => (
            <EventChip key={event.author} event={event} lang={lang} />
          ))}
        </div>
      </Reveal>
    </div>
  );
}

function EventsSlide({ step, lang }: SlideProps): JSX.Element {
  const caption = NETWORK_CAPTIONS[Math.min(step, NETWORK_CAPTIONS.length - 1)];
  return (
    <div className="story-body is-tight">
      <Heading
        lang={lang}
        kicker={{ ja: "特徴 3", en: "Feature 3" }}
        text={{
          ja: "署名付きイベントでつながる分散システム",
          en: "A distributed system of signed events",
        }}
      />
      <div className="story-net">
        <svg
          className="story-net-links"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {NETWORK_LINKS.map((link) => {
            const from = NETWORK_NODES[link.from];
            const to = NETWORK_NODES[link.to];
            const d = `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
            return (
              <g
                key={`${link.from}-${link.to}`}
                className={step >= link.appearAt ? "" : "is-hidden"}
              >
                <path d={d} className="story-net-line" />
                {link.pulseAt.includes(step) ? (
                  <path d={d} pathLength={100} className="story-net-pulse" />
                ) : null}
              </g>
            );
          })}
        </svg>
        {NETWORK_LINKS.map((link) =>
          link.label === undefined || step < link.appearAt ? null : (
            <div
              key={`${link.from}-${link.to}-label`}
              className="story-net-link-label"
              style={{
                left: `${(NETWORK_NODES[link.from].x + NETWORK_NODES[link.to].x) / 2}%`,
                top: `${(NETWORK_NODES[link.from].y + NETWORK_NODES[link.to].y) / 2}%`,
              }}
            >
              {t(lang, link.label)}
            </div>
          ),
        )}
        <NetworkNode
          id="alice"
          step={step}
          lang={lang}
          appearAt={0}
          kind="client"
          icon="💻"
          name={{ ja: "Alice", en: "Alice" }}
          detail={{
            ja: "ライトユーザー (ブラウザだけ)",
            en: "light user (browser only)",
          }}
          publicKey="7f3a…e21b"
          className={step >= 4 ? "is-highlight" : ""}
        />
        <NetworkNode
          id="bob"
          step={step}
          lang={lang}
          appearAt={0}
          kind="client"
          icon="💻"
          name={{ ja: "Bob", en: "Bob" }}
          detail={{
            ja: "データを自分で持ちたい人",
            en: "wants to own their data",
          }}
          publicKey="c41d…09fa"
        />
        <NetworkNode
          id="narumincho"
          step={step}
          lang={lang}
          appearAt={0}
          kind="server"
          icon="🖥"
          name={{ ja: "ナルミンチョのサーバー", en: "narumincho's server" }}
          detail={{ ja: "definy.narumincho.com", en: "definy.narumincho.com" }}
        />
        <NetworkNode
          id="bobServer"
          step={step}
          lang={lang}
          appearAt={0}
          kind="server"
          icon="🖥"
          name={{ ja: "Bob が建てたサーバー", en: "Bob's own server" }}
          detail={{ ja: "自宅やクラウドに", en: "at home or in the cloud" }}
          className={step >= 4 ? "is-highlight" : ""}
        />
        <NetworkNode
          id="evil"
          step={step}
          lang={lang}
          appearAt={2}
          kind="server"
          icon="🖥"
          name={{ ja: "悪意のあるサーバー", en: "malicious server" }}
          detail={{ ja: "他の人のふりをしたい", en: "wants to impersonate" }}
          className="is-evil"
        />
      </div>
      {caption === undefined ? null : (
        <div key={step} className="story-note story-net-caption">
          {t(lang, caption)}
        </div>
      )}
    </div>
  );
}

function ComparisonSlide({ step, lang }: SlideProps): JSX.Element {
  const rows: ReadonlyArray<{
    readonly name: Text;
    readonly blockchain: Text;
    readonly nostr: Text;
    readonly definy: Text;
  }> = [
    {
      name: { ja: "改ざんの検出", en: "Tamper detection" },
      blockchain: { ja: "✓", en: "✓" },
      nostr: { ja: "✓ 署名", en: "✓ signatures" },
      definy: { ja: "✓ 署名 + ハッシュ", en: "✓ signatures + hashes" },
    },
    {
      name: { ja: "合意形成", en: "Consensus" },
      blockchain: {
        ja: "全体で合意。PoW なら電力を大量に使う",
        en: "global; PoW burns lots of energy",
      },
      nostr: { ja: "しない (リレーごと)", en: "none (per relay)" },
      definy: {
        ja: "しない。計算は検証だけで省エネ",
        en: "none; only verification, low energy",
      },
    },
    {
      name: { ja: "削除", en: "Deletion" },
      blockchain: { ja: "できない", en: "impossible" },
      nostr: {
        ja: "リレー次第 (依頼はできる)",
        en: "up to each relay",
      },
      definy: {
        ja: "運営が著作権侵害などを削除できる",
        en: "operators can remove e.g. copyright violations",
      },
    },
    {
      name: { ja: "目的", en: "Purpose" },
      blockchain: { ja: "お金・資産", en: "money, assets" },
      nostr: { ja: "SNS", en: "social media" },
      definy: { ja: "プログラムの共同編集", en: "editing programs together" },
    },
  ];
  return (
    <div className="story-body">
      <Heading
        lang={lang}
        kicker={{ ja: "特徴 3", en: "Feature 3" }}
        text={{
          ja: "ブロックチェーン・nostr との違い",
          en: "How it differs from blockchains and nostr",
        }}
      />
      <div className="story-table">
        <div className="story-table-head" />
        <div className="story-table-head">
          {t(lang, { ja: "ブロックチェーン", en: "Blockchain" })}
          <span className="story-table-logos">
            <ProjectLink project="bitcoin">
              <Logo project="bitcoin" size={1.3} />
            </ProjectLink>
            <ProjectLink project="ethereum">
              <Logo project="ethereum" size={1.3} />
            </ProjectLink>
          </span>
        </div>
        <div className="story-table-head">
          <ProjectLink project="nostr" />
        </div>
        <div className="story-table-head is-definy">definy</div>
        {rows.map((row, index) => (
          <Reveal
            key={row.name.en}
            at={index}
            step={step}
            className="story-table-row"
          >
            <div className="story-compare-name">{t(lang, row.name)}</div>
            <div>{t(lang, row.blockchain)}</div>
            <div>{t(lang, row.nostr)}</div>
            <div className="story-yes">{t(lang, row.definy)}</div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

/**
 * コミットの図. main とブランチのコミットが親をたどってつながり, 取り込み (マージ) で合流する.
 * どのコミットも, パーツの構文木をハッシュで指す (変わっていないパーツは共有する)
 */
function CommitGraph(props: { readonly lang: LanguageCode }): JSX.Element {
  const { lang } = props;
  const main = [
    { x: 150, label: "c1" },
    { x: 290, label: "c2" },
    { x: 570, label: "c4" },
  ];
  const branchCommit = { x: 430, label: "c3" };
  const mainY = 34;
  const branchY = 92;
  const parts = [
    { y: 18, label: "core.divide" },
    { y: 50, label: "sample.area" },
    { y: 82, label: "sample.area′" },
  ];
  return (
    <svg
      viewBox="0 0 900 112"
      className="story-commit-graph"
      role="img"
      aria-label={t(lang, {
        ja: "main とブランチのコミットの図",
        en: "Commits on main and a branch",
      })}
    >
      <text x="10" y={mainY + 5} className="story-graph-lane">
        main
      </text>
      <text x="10" y={branchY + 5} className="story-graph-lane">
        {t(lang, { ja: "ブランチ", en: "branch" })}
      </text>
      {/* 親へのつながり */}
      <path d={`M 150 ${mainY} L 570 ${mainY}`} className="story-graph-edge" />
      <path
        d={`M 290 ${mainY} C 340 ${branchY}, 380 ${branchY}, 430 ${branchY} C 480 ${branchY}, 520 ${mainY}, 570 ${mainY}`}
        className="story-graph-edge is-branch"
      />
      {/* パーツの構文木へのハッシュ参照 (c2 と c4 は同じ core.divide を共有する) */}
      <path d="M 290 34 C 450 0, 600 10, 700 18" className="story-graph-ref" />
      <path d="M 570 34 C 630 30, 660 20, 700 18" className="story-graph-ref" />
      <path d="M 570 34 C 630 60, 660 82, 700 82" className="story-graph-ref" />
      <path d="M 290 34 C 450 56, 600 50, 700 50" className="story-graph-ref" />
      {[
        ...main.map((c) => ({ ...c, y: mainY })),
        { ...branchCommit, y: branchY },
      ].map((commit) => (
        <g key={commit.label}>
          <circle
            cx={commit.x}
            cy={commit.y}
            r="16"
            className="story-graph-commit"
          />
          <text
            x={commit.x}
            y={commit.y + 5}
            className="story-graph-commit-label"
          >
            {commit.label}
          </text>
          <text
            x={commit.x + 20}
            y={commit.y - 14}
            className="story-graph-sign"
          >
            ✍
          </text>
        </g>
      ))}
      <text x="570" y="70" className="story-graph-note">
        {t(lang, { ja: "取り込み", en: "merge" })}
      </text>
      {parts.map((part) => (
        <g key={part.label}>
          <rect
            x="700"
            y={part.y - 13}
            width="190"
            height="26"
            rx="6"
            className="story-graph-part"
          />
          <text x="712" y={part.y + 5} className="story-graph-part-label">
            🌳 {part.label}
          </text>
        </g>
      ))}
      <text x="890" y="110" textAnchor="end" className="story-graph-note">
        {t(lang, {
          ja: "パーツの構文木 (SHA-256 で指す)",
          en: "part syntax trees (by SHA-256)",
        })}
      </text>
    </svg>
  );
}

function VersionControlSlide({ step, lang }: SlideProps): JSX.Element {
  const rows: ReadonlyArray<{
    readonly name: Text;
    readonly git: Text;
    readonly definy: Text;
  }> = [
    {
      name: { ja: "保存するもの", en: "What is stored" },
      git: { ja: "テキストファイル", en: "text files" },
      definy: {
        ja: "構文木のまま (決定論的 CBOR, SHA-256 で内容を指す)",
        en: "syntax trees as is (deterministic CBOR, addressed by SHA-256)",
      },
    },
    {
      name: { ja: "差分と取り込み", en: "Diff & merge" },
      git: { ja: "行の差分。文字の衝突", en: "line diffs, text conflicts" },
      definy: {
        ja: "パーツ (関数・型) 単位。名前を変えても参照は ID なので壊れない",
        en: "per part (function / type); references are IDs, so renames never break",
      },
    },
    {
      name: { ja: "誰のコミットか", en: "Who committed" },
      git: {
        ja: "名前とメールは自己申告 (署名は任意)",
        en: "self-reported name/email (signing optional)",
      },
      definy: {
        ja: "全てのコミットが Ed25519 で署名されたイベント",
        en: "every commit is an Ed25519-signed event",
      },
    },
    {
      name: { ja: "通信", en: "Protocol" },
      git: {
        ja: "git プロトコル (SSH / HTTPS)",
        en: "git protocol (SSH / HTTPS)",
      },
      definy: {
        ja: "Connect-RPC (gRPC 互換, HTTP + JSON)。サーバーに無い式だけ送る",
        en: "Connect-RPC (gRPC-compatible, HTTP + JSON); only missing trees are sent",
      },
    },
  ];
  return (
    <div className="story-body is-tight">
      <Heading
        lang={lang}
        kicker={{ ja: "特徴 4", en: "Feature 4" }}
        text={{
          ja: "バージョン管理も definy 自身が持つ",
          en: "Version control is built into definy",
        }}
      />
      <Reveal at={0} step={step}>
        <CommitGraph lang={lang} />
      </Reveal>
      <div className="story-table is-two">
        <div className="story-table-head" />
        <div className="story-table-head">
          <ProjectLink project="git" />
        </div>
        <div className="story-table-head is-definy">definy</div>
        {rows.map((row, index) => (
          <Reveal
            key={row.name.en}
            at={index}
            step={step}
            className="story-table-row"
          >
            <div className="story-compare-name">{t(lang, row.name)}</div>
            <div>{t(lang, row.git)}</div>
            <div className="story-yes">{t(lang, row.definy)}</div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

const SELF_HOSTING_LAYERS: ReadonlyArray<{
  readonly name: Text;
  readonly done: boolean;
}> = [
  {
    name: { ja: "型チェッカー", en: "Type checker" },
    done: true,
  },
  {
    name: {
      ja: "Wasm コンパイラ (自分自身をコンパイルして不動点)",
      en: "Wasm compiler (compiles itself to a fixed point)",
    },
    done: true,
  },
  {
    name: { ja: "イベントを受け付ける規則", en: "Event acceptance rules" },
    done: true,
  },
  {
    name: { ja: "RPC の処理 (読み書き)", en: "RPC handlers (read & write)" },
    done: true,
  },
  {
    name: {
      ja: "ホスト機能 (DB・署名の計算) — TypeScript",
      en: "Host features (DB, crypto) — TypeScript",
    },
    done: false,
  },
  {
    name: { ja: "エディタの UI — React", en: "Editor UI — React" },
    done: false,
  },
];

/** セルフホストを達成する目標の時期. 発表の前に確認して書き換える */
const SELF_HOSTING_TARGET: Text = {
  ja: "2027 年中に UI まで definy でいけそう?",
  en: "UI in definy too, by the end of 2027?",
};

/** 円グラフの区切り. 値は SELF_HOSTING_STATS の語の数 */
const SELF_HOSTING_SLICES: ReadonlyArray<{
  readonly name: Text;
  readonly value: number;
  readonly color: string;
}> = [
  {
    name: { ja: "definy", en: "definy" },
    value: SELF_HOSTING_STATS.definy,
    color: "#b9d09b",
  },
  {
    name: {
      ja: "TypeScript (サーバー・ホスト)",
      en: "TypeScript (server / host)",
    },
    value: SELF_HOSTING_STATS.typescriptHost,
    color: "#3178c6",
  },
  {
    name: { ja: "TypeScript (UI)", en: "TypeScript (UI)" },
    value: SELF_HOSTING_STATS.typescriptUi,
    color: "#61dafb",
  },
];

function percent(value: number, total: number): string {
  return `${Math.round((value / total) * 100)}%`;
}

/** ドーナツ型の円グラフ. 区切りは円周の長さを 100 とした破線で描く */
function DonutChart(props: { readonly lang: LanguageCode }): JSX.Element {
  const total = SELF_HOSTING_SLICES.reduce((sum, s) => sum + s.value, 0);
  let offset = 0;
  return (
    <div className="story-donut">
      <svg viewBox="0 0 42 42" className="story-donut-chart" aria-hidden="true">
        <circle cx="21" cy="21" r="15.9155" className="story-donut-track" />
        {SELF_HOSTING_SLICES.map((slice, index) => {
          const length = (slice.value / total) * 100;
          const circle = (
            <circle
              key={slice.name.en}
              cx="21"
              cy="21"
              r="15.9155"
              className="story-donut-slice"
              style={{
                stroke: slice.color,
                strokeDasharray: `${length} ${100 - length}`,
                strokeDashoffset: 25 - offset,
                animationDelay: `${index * 0.25}s`,
              }}
            />
          );
          offset += length;
          return circle;
        })}
      </svg>
      <div className="story-donut-center">
        <div className="story-donut-value">
          {percent(SELF_HOSTING_STATS.definy, total)}
        </div>
        <div>{t(props.lang, { ja: "definy 製", en: "in definy" })}</div>
      </div>
    </div>
  );
}

function SelfHostingSlide({ step, lang }: SlideProps): JSX.Element {
  const doneCount = SELF_HOSTING_LAYERS.filter((l) => l.done).length;
  const total = SELF_HOSTING_SLICES.reduce((sum, s) => sum + s.value, 0);
  const withoutUi =
    SELF_HOSTING_STATS.definy + SELF_HOSTING_STATS.typescriptHost;
  return (
    <div className="story-body is-tight">
      <Heading
        lang={lang}
        kicker={{ ja: "目標", en: "Goal" }}
        text={{
          ja: "definy で definy を表現する",
          en: "Express definy in definy",
        }}
      />
      <div className="story-two is-wide-left">
        <div className="story-layers is-compact">
          {SELF_HOSTING_LAYERS.map((layer, index) => (
            <Reveal
              key={layer.name.en}
              at={layer.done ? 0 : 1}
              step={step}
              delay={layer.done ? index * 0.15 : (index - doneCount) * 0.15}
              className={`story-layer ${layer.done ? "is-done" : "is-todo"}`}
            >
              <span>{layer.done ? "✓" : "…"}</span>
              {t(lang, layer.name)}
            </Reveal>
          ))}
        </div>
        <Reveal at={2} step={step} className="story-donut-panel">
          <DonutChart lang={lang} />
          <div className="story-donut-legend">
            {SELF_HOSTING_SLICES.map((slice) => (
              <div key={slice.name.en}>
                <span
                  className="story-donut-swatch"
                  style={{ background: slice.color }}
                />
                {t(lang, slice.name)}
                <b>{percent(slice.value, total)}</b>
              </div>
            ))}
          </div>
          <div className="story-donut-note">
            {t(lang, {
              ja: `UI を除くと ${percent(SELF_HOSTING_STATS.definy, withoutUi)} が definy。コードの量は語の数で比べた目安 (${SELF_HOSTING_STATS.measuredAt})`,
              en: `${percent(SELF_HOSTING_STATS.definy, withoutUi)} without the UI. Rough size in words (${SELF_HOSTING_STATS.measuredAt})`,
            })}
          </div>
          <Reveal at={3} step={step} delay={0.3} className="story-goal">
            {t(lang, SELF_HOSTING_TARGET)}
          </Reveal>
        </Reveal>
      </div>
    </div>
  );
}

function DeploySlide({ step, lang }: SlideProps): JSX.Element {
  const items: ReadonlyArray<{
    readonly at: number;
    readonly icon: string;
    readonly name: Text;
    readonly detail: string;
  }> = [
    {
      at: 0,
      icon: "📝",
      name: { ja: "definy で書いたパーツ", en: "A part written in definy" },
      detail: "fn(request) => response",
    },
    {
      at: 1,
      icon: "⚙️",
      name: { ja: "definy 製コンパイラ", en: "Compiler written in definy" },
      detail: "core.compile-to-wasm",
    },
    {
      at: 1,
      icon: "📦",
      name: { ja: "worker.js + app.wasm", en: "worker.js + app.wasm" },
      detail: "multipart/form-data",
    },
    {
      at: 2,
      icon: "🔐",
      name: { ja: "REST API v4", en: "REST API v4" },
      detail: "api.cloudflare.com",
    },
    {
      at: 2,
      icon: "☁",
      name: { ja: "Cloudflare Workers", en: "Cloudflare Workers" },
      detail: "*.workers.dev",
    },
  ];
  return (
    <div className="story-body">
      <Heading
        lang={lang}
        kicker={{ ja: "できていること", en: "Already working" }}
        text={{
          ja: "Cloudflare Workers へのデプロイも definy で",
          en: "Deploying to Cloudflare Workers, in definy",
        }}
      />
      <div className="story-flow is-deploy">
        {items.map((item, index) => (
          <Fragment key={item.detail}>
            {index > 0 ? (
              <Reveal
                at={item.at}
                step={step}
                delay={index % 2 === 0 ? 0.2 : 0}
                className="story-flow-link"
              >
                <span className="story-packet" />
              </Reveal>
            ) : null}
            <Reveal
              at={item.at}
              step={step}
              delay={index % 2 === 0 ? 0.3 : 0.1}
              className="story-flow-item"
            >
              <div className="story-flow-icon">{item.icon}</div>
              <div>{t(lang, item.name)}</div>
              <small>{item.detail}</small>
            </Reveal>
          </Fragment>
        ))}
      </div>
      <div className="story-notes">
        <Reveal at={3} step={step} className="story-note">
          {t(lang, {
            ja: "デプロイは特別な機能ではなく, definy.deploy-to-cloudflare-workers という普通のパーツ。API トークンはシークレットとして渡す",
            en: "Deploying is not a special feature but an ordinary part, definy.deploy-to-cloudflare-workers. The API token is passed as a secret",
          })}
        </Reveal>
        <Reveal at={3} step={step} delay={0.2} className="story-note is-hot">
          {t(lang, {
            ja: "definy で書いた definy のサーバーも, 約 3 秒でデプロイできる",
            en: "Even a definy server written in definy deploys in about 3 seconds",
          })}
        </Reveal>
      </div>
    </div>
  );
}

function ProofSlide({ step, lang }: SlideProps): JSX.Element {
  const projects: ReadonlyArray<{
    readonly at: number;
    readonly project: ProjectId;
    readonly desc: Text;
  }> = [
    {
      at: 1,
      project: "lean",
      desc: {
        ja: "定理証明支援系。AI による数学の証明で注目",
        en: "Proof assistant now used by AI for math proofs",
      },
    },
    {
      at: 1,
      project: "idris",
      desc: {
        ja: "依存型を中心にした関数型言語",
        en: "Functional language built around dependent types",
      },
    },
    {
      at: 2,
      project: "nyxis",
      desc: {
        ja: "Lean 4 のバックエンド。認可の安全性をビルドのたびに証明で検査",
        en: "Lean 4 backend whose authorization safety is proven on every build",
      },
    },
    {
      at: 2,
      project: "h5i",
      desc: {
        ja: "Rust の Web アプリの中心部分を Lean 4 に変換して性質を証明",
        en: "Proves properties of Rust web app kernels via Lean 4",
      },
    },
    {
      at: 2,
      project: "qedos",
      desc: {
        ja: "seL4 上の実験的 OS。コードを信用せず, できることを検証する",
        en: "Experimental seL4 OS: don't trust code, verify what it can do",
      },
    },
  ];
  return (
    <div className="story-body">
      <Heading
        lang={lang}
        kicker={{ ja: "これから", en: "Next" }}
        text={{
          ja: "証明できるプログラミングへ",
          en: "Towards provable programs",
        }}
      />
      <Reveal at={0} step={step} className="story-lead-left">
        {t(lang, {
          ja: "AI が書くコードが増えるほど「正しいと機械が確かめられること」が大事になる",
          en: "The more code AI writes, the more we need machines to check it is correct",
        })}
      </Reveal>
      <div className="story-cards">
        {projects.map((p, index) => (
          <Reveal
            key={p.project}
            at={p.at}
            step={step}
            delay={(index % 3) * 0.12}
            className="story-card"
          >
            <div className="story-card-name">
              <ProjectLink project={p.project} />
            </div>
            <div>{t(lang, p.desc)}</div>
          </Reveal>
        ))}
      </div>
      <Reveal at={3} step={step} className="story-note is-hot">
        {t(lang, {
          ja: "definy: 構文の機能を絞ってシンプルに保つ → 安全で, 機械が検査・証明しやすい (qedos の考えに近い)",
          en: "definy: keep the syntax small and simple → safe and easy for machines to check and prove (close to qedos)",
        })}
      </Reveal>
    </div>
  );
}

function ClosingSlide({ step, lang }: SlideProps): JSX.Element {
  return (
    <div className="story-center">
      <div className="story-title-orbit" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <Reveal at={0} step={step}>
        <p className="story-lead">
          {t(lang, {
            ja: "広く使ってもらうことより, 理想を目指す",
            en: "Aiming for the ideal, not for adoption",
          })}
        </p>
      </Reveal>
      <Reveal at={0} step={step} delay={0.4} className="story-keywords">
        <span>{t(lang, { ja: "壊れない", en: "Unbreakable" })}</span>
        <span>{t(lang, { ja: "検証できる", en: "Verifiable" })}</span>
        <span>
          {t(lang, { ja: "definy で definy を", en: "definy in definy" })}
        </span>
      </Reveal>
      <Reveal at={1} step={step}>
        <p className="story-wordmark is-small">definy</p>
      </Reveal>
      <Reveal at={1} step={step} delay={0.5} className="story-qr">
        <img
          src="/story/qr-definy.svg"
          alt="https://definy.narumincho.com/ の QR コード"
          width={160}
          height={160}
        />
        <div>definy.narumincho.com</div>
      </Reveal>
      <Reveal at={1} step={step} delay={0.3}>
        <p className="story-sub story-closing-links">
          <a
            className="story-link"
            href="https://definy.narumincho.com/"
            target="_blank"
            rel="noreferrer"
          >
            definy.narumincho.com
          </a>
          <a
            className="story-link"
            href="https://github.com/narumincho/definy"
            target="_blank"
            rel="noreferrer"
          >
            github.com/narumincho/definy
          </a>
        </p>
      </Reveal>
      <p className="story-credits">
        {t(lang, {
          ja: "解説音声: VOICEVOX:ずんだもん · 立ち絵: ",
          en: "Narration: VOICEVOX:ずんだもん · Character art: ",
        })}
        <a
          className="story-link"
          href="https://tachie.net/w/sC90rhbReJ"
          target="_blank"
          rel="noreferrer"
        >
          {t(lang, {
            ja: "坂本アヒル「ずんだもん立ち絵素材」",
            en: "Sakamoto Ahiru, Zundamon character art",
          })}
        </a>
        {" · "}
        {t(lang, { ja: "ロゴ: ", en: "Logos: " })}
        <a
          className="story-link"
          href="https://simpleicons.org/"
          target="_blank"
          rel="noreferrer"
        >
          Simple Icons
        </a>
        {", "}
        <a
          className="story-link"
          href="https://github.com/mbarulli/nostr-logo"
          target="_blank"
          rel="noreferrer"
        >
          nostr-logo
        </a>
      </p>
    </div>
  );
}

export const SLIDES: readonly Slide[] = [
  {
    id: "title",
    title: { ja: "タイトル", en: "Title" },
    duration: 11,
    steps: 0,
    render: TitleSlide,
    transition: "zoom",
  },
  {
    id: "history",
    title: { ja: "歴史", en: "History" },
    duration: 35,
    steps: 3,
    render: HistorySlide,
    transition: "wipe-right",
  },
  {
    id: "vibe-coding",
    title: { ja: "バイブコーディング", en: "Vibe coding" },
    duration: 20,
    steps: 2,
    render: VibeCodingSlide,
    transition: "rise",
  },
  {
    id: "structured-editing",
    title: { ja: "構造化編集", en: "Structured editing" },
    duration: 30,
    steps: 3,
    render: StructuredEditingSlide,
    transition: "flip",
  },
  {
    id: "scratch",
    title: { ja: "Scratch との違い", en: "vs. Scratch" },
    duration: 25,
    steps: 3,
    render: ScratchSlide,
    transition: "pop",
  },
  {
    id: "events",
    title: { ja: "署名付きイベント", en: "Signed events" },
    duration: 40,
    steps: 4,
    render: EventsSlide,
    transition: "iris",
  },
  {
    id: "comparison",
    title: { ja: "ブロックチェーン・nostr", en: "Blockchain & nostr" },
    duration: 20,
    steps: 3,
    render: ComparisonSlide,
    transition: "slide-left",
  },
  {
    id: "version-control",
    title: { ja: "バージョン管理", en: "Version control" },
    duration: 30,
    steps: 3,
    render: VersionControlSlide,
    transition: "wipe-down",
  },
  {
    id: "self-hosting",
    title: { ja: "セルフホスト", en: "Self-hosting" },
    duration: 30,
    steps: 3,
    render: SelfHostingSlide,
    transition: "spin",
  },
  {
    id: "deploy",
    title: { ja: "デプロイ", en: "Deploy" },
    duration: 20,
    steps: 3,
    render: DeploySlide,
    transition: "slide-right",
  },
  {
    id: "proof",
    title: { ja: "証明", en: "Proofs" },
    duration: 30,
    steps: 3,
    render: ProofSlide,
    transition: "blur",
  },
  {
    id: "closing",
    title: { ja: "おわりに", en: "Closing" },
    duration: 20,
    steps: 1,
    render: ClosingSlide,
    transition: "shrink",
  },
];

export function slideTitle(slide: Slide, lang: LanguageCode): string {
  return t(lang, slide.title);
}

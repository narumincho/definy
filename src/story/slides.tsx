import type { JSX, ReactNode } from "react";
import { label } from "../language.ts";
import type { LanguageCode } from "../types.ts";

/**
 * 紹介スライド (/about/story) の内容.
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
};

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
    logo: undefined,
    color: "#a68cf0",
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
        <h1 className="story-wordmark">definy</h1>
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
          <span className="story-author">@narumincho</span>
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
  /** 途中で移った先 */
  readonly movedTo?: string;
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
  {
    from: [2026, 1],
    to: [2026, 11],
    projects: ["rust"],
    color: "#e0904f",
    movedTo: "definy",
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
        kicker={{ ja: "これまで", en: "History" }}
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
              className="story-era"
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
              {era.movedTo === undefined ? null : (
                <span className="story-era-item">
                  <span className="story-era-sep">→</span>
                  <span className="story-era-definy">{era.movedTo}</span>
                </span>
              )}
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
          ja: "Rust 製のコンパイラ・サーバーを捨てて, definy 自身で書いたコンパイラに置き換えるところまで来た (2026-10)",
          en: "Far enough to throw away the Rust compiler and server and replace them with a compiler written in definy (Oct 2026)",
        })}
      </Reveal>
    </div>
  );
}

function StructuredEditingSlide({ step, lang }: SlideProps): JSX.Element {
  return (
    <div className="story-body">
      <Heading
        lang={lang}
        kicker={{ ja: "特徴 1", en: "Feature 1" }}
        text={{
          ja: "構造化編集: 構文エラーが存在しない",
          en: "Structured editing: no syntax errors",
        }}
      />
      <div className="story-two">
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
          <div className="story-tree">
            <div className="story-node is-call">
              <span className="story-node-name">add</span>
              <div className="story-node is-ref">price</div>
              <div className="story-node is-hole">
                □ <small>Number</small>
              </div>
            </div>
          </div>
          <div className="story-ok">
            {t(lang, {
              ja: "✓ 空きの「穴」は, 入るべき型を知っている",
              en: "✓ The empty hole knows which type belongs there",
            })}
          </div>
        </Reveal>
      </div>
      <Reveal at={2} step={step} className="story-note">
        {t(lang, {
          ja: "コードは文字列ではなく構文木として保存。壊れた状態をそもそも作れない",
          en: "Code is stored as a syntax tree, not text — broken states cannot be written",
        })}
      </Reveal>
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

type NetworkServer = {
  readonly id: string;
  readonly name: Text;
  readonly host: Text;
  /** このステップから現れる */
  readonly appearAt: number;
};

const NETWORK_SERVERS: readonly NetworkServer[] = [
  {
    id: "a",
    name: { ja: "サーバー A", en: "Server A" },
    host: { ja: "definy.narumincho.com", en: "definy.narumincho.com" },
    appearAt: 0,
  },
  {
    id: "b",
    name: { ja: "サーバー B", en: "Server B" },
    host: { ja: "悪意のある運営", en: "malicious operator" },
    appearAt: 0,
  },
  {
    id: "c",
    name: { ja: "サーバー C", en: "Server C" },
    host: { ja: "別の運営", en: "another operator" },
    appearAt: 0,
  },
  {
    id: "d",
    name: { ja: "サーバー D", en: "Server D" },
    host: { ja: "新しく立てたサーバー", en: "a brand-new server" },
    appearAt: 4,
  },
];

const NETWORK_CAPTIONS: readonly Text[] = [
  {
    ja: "nostr と同じく, 公開鍵がそのままユーザー ID。秘密鍵は自分の手元にだけある",
    en: "Like nostr, the public key is the user ID. The private key never leaves your device",
  },
  {
    ja: "署名したイベントを複数のサーバーに送る。どのサーバーでも署名を確かめられる",
    en: "Signed events go to several servers, and every server can check the signature",
  },
  {
    ja: "秘密鍵を持たないサーバーは, Alice のイベントを偽造も改ざんもできない",
    en: "Without the private key a server cannot forge or alter Alice's events",
  },
  {
    ja: "サーバーにできるのは「載せない」こと = 削除だけ (著作権侵害などに対応できる)",
    en: "All a server can do is stop serving it — delete (e.g. copyright violations)",
  },
  {
    ja: "イベントは手元にも残せる。別のサーバーへそのまま出し直せる",
    en: "You keep your own copy and can republish it to another server as is",
  },
];

/** 公開鍵 (= ユーザー ID) の見本 */
const SAMPLE_PUBLIC_KEY = "7f3a9c…e21b";

function EventChip(props: {
  readonly state: "ok" | "forged" | "deleted";
  readonly lang: LanguageCode;
}): JSX.Element {
  const { state, lang } = props;
  return (
    <div className={`story-event-chip is-${state}`}>
      <span className="story-event-chip-body">
        {state === "forged"
          ? t(lang, { ja: "Alice: 偽のコミット", en: "Alice: forged commit" })
          : t(lang, { ja: "Alice: コミット", en: "Alice: commit" })}
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

/** そのステップでサーバーが持つイベント */
function serverEvents(
  server: string,
  step: number,
): ReadonlyArray<"ok" | "forged" | "deleted"> {
  switch (server) {
    case "a":
      return step >= 1 ? ["ok"] : [];
    case "b":
      return step >= 2 ? ["ok", "forged"] : step >= 1 ? ["ok"] : [];
    case "c":
      return step >= 3 ? ["deleted"] : step >= 1 ? ["ok"] : [];
    case "d":
      return step >= 4 ? ["ok"] : [];
    default:
      return [];
  }
}

function EventsSlide({ step, lang }: SlideProps): JSX.Element {
  const caption = NETWORK_CAPTIONS[Math.min(step, NETWORK_CAPTIONS.length - 1)];
  const rows = NETWORK_SERVERS.length;
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
        <div className={`story-device ${step >= 4 ? "is-highlight" : ""}`}>
          <div className="story-device-title">
            💻 {t(lang, { ja: "Alice の手元", en: "Alice's device" })}
          </div>
          <div className="story-key">
            <span>
              🔑{" "}
              {t(lang, {
                ja: "公開鍵 = ユーザー ID",
                en: "Public key = user ID",
              })}
            </span>
            <code>{SAMPLE_PUBLIC_KEY}</code>
          </div>
          <div className="story-key is-secret">
            <span>
              🔒{" "}
              {t(lang, {
                ja: "秘密鍵 (手元だけ)",
                en: "Private key (device only)",
              })}
            </span>
          </div>
          <Reveal at={1} step={step} className="story-device-copy">
            <div className="story-device-copy-label">
              📦 {t(lang, { ja: "手元の控え", en: "Local copy" })}
            </div>
            <EventChip state="ok" lang={lang} />
          </Reveal>
        </div>
        <div className="story-net-link-cell">
          <svg
            className="story-net-links"
            viewBox={`0 0 100 ${rows * 100}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {NETWORK_SERVERS.map((server, index) => {
              const y = index * 100 + 50;
              const d = `M 0 ${(rows * 100) / 2} C 50 ${(rows * 100) / 2}, 50 ${y}, 100 ${y}`;
              const visible = step >= server.appearAt;
              const sending =
                server.appearAt === 0 ? step === 1 : step === server.appearAt;
              return (
                <g key={server.id} className={visible ? "" : "is-hidden"}>
                  <path d={d} className="story-net-line" />
                  {sending ? (
                    <path d={d} pathLength={100} className="story-net-pulse" />
                  ) : null}
                </g>
              );
            })}
          </svg>
        </div>
        <div
          className="story-servers"
          style={{ gridTemplateRows: `repeat(${rows}, 1fr)` }}
        >
          {NETWORK_SERVERS.map((server) => (
            <Reveal
              key={server.id}
              at={server.appearAt}
              step={step}
              className={`story-server ${
                server.id === "b" && step >= 2 ? "is-evil" : ""
              }`}
            >
              <div className="story-server-head">
                <span>🖥 {t(lang, server.name)}</span>
                <small>{t(lang, server.host)}</small>
              </div>
              <div className="story-server-events">
                {serverEvents(server.id, step).map((state) => (
                  <EventChip key={state} state={state} lang={lang} />
                ))}
              </div>
            </Reveal>
          ))}
        </div>
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
  ja: "目標: 2027 年中に UI まで definy で",
  en: "Goal: everything including the UI in definy during 2027",
};

function SelfHostingSlide({ step, lang }: SlideProps): JSX.Element {
  const doneCount = SELF_HOSTING_LAYERS.filter((l) => l.done).length;
  return (
    <div className="story-body">
      <Heading
        lang={lang}
        kicker={{ ja: "目標", en: "Goal" }}
        text={{
          ja: "definy で definy を表現する",
          en: "Express definy in definy",
        }}
      />
      <div className="story-two is-wide-left">
        <div className="story-layers">
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
        <div className="story-stats">
          <Reveal at={2} step={step} className="story-stat">
            <div className="story-big-number">869</div>
            {t(lang, {
              ja: "definy で書いたパーツ (組み込みモジュール)",
              en: "parts written in definy (builtin modules)",
            })}
          </Reveal>
          <Reveal at={2} step={step} delay={0.2} className="story-stat">
            <div className="story-big-number">0</div>
            {t(lang, {
              ja: "残っている Rust のコード",
              en: "lines of Rust left",
            })}
          </Reveal>
          <Reveal at={3} step={step} className="story-stat is-hot">
            {t(lang, SELF_HOSTING_TARGET)}
          </Reveal>
        </div>
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
        <h1 className="story-wordmark is-small">definy</h1>
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
    </div>
  );
}

export const SLIDES: readonly Slide[] = [
  {
    id: "title",
    title: { ja: "タイトル", en: "Title" },
    duration: 20,
    steps: 0,
    render: TitleSlide,
  },
  {
    id: "history",
    title: { ja: "歴史", en: "History" },
    duration: 40,
    steps: 3,
    render: HistorySlide,
  },
  {
    id: "vibe-coding",
    title: { ja: "バイブコーディング", en: "Vibe coding" },
    duration: 25,
    steps: 2,
    render: VibeCodingSlide,
  },
  {
    id: "structured-editing",
    title: { ja: "構造化編集", en: "Structured editing" },
    duration: 30,
    steps: 2,
    render: StructuredEditingSlide,
  },
  {
    id: "scratch",
    title: { ja: "Scratch との違い", en: "vs. Scratch" },
    duration: 30,
    steps: 3,
    render: ScratchSlide,
  },
  {
    id: "events",
    title: { ja: "署名付きイベント", en: "Signed events" },
    duration: 45,
    steps: 4,
    render: EventsSlide,
  },
  {
    id: "comparison",
    title: { ja: "ブロックチェーン・nostr", en: "Blockchain & nostr" },
    duration: 25,
    steps: 3,
    render: ComparisonSlide,
  },
  {
    id: "self-hosting",
    title: { ja: "セルフホスト", en: "Self-hosting" },
    duration: 35,
    steps: 3,
    render: SelfHostingSlide,
  },
  {
    id: "proof",
    title: { ja: "証明", en: "Proofs" },
    duration: 35,
    steps: 3,
    render: ProofSlide,
  },
  {
    id: "closing",
    title: { ja: "おわりに", en: "Closing" },
    duration: 20,
    steps: 1,
    render: ClosingSlide,
  },
];

export function slideTitle(slide: Slide, lang: LanguageCode): string {
  return t(lang, slide.title);
}

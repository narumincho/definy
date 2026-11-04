import type { JSX, ReactNode } from "react";
import { label } from "../language.ts";
import type { LanguageCode } from "../types.ts";

/**
 * 紹介スライド (/about/story) の内容.
 * 1 枚のスライドは `steps` 回の「次へ」で要素が順に現れる (`<Reveal at={n}>`).
 * 自動再生では `duration` 秒をステップの数で割った間隔で進む.
 * 大きさは全て em で書き, 1em はスライドの幅の 1/80 (src/main.css の .story-stage)
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

/** `git log` の年ごとのコミット数 (2026-11-04 時点) */
const COMMITS_PER_YEAR: ReadonlyArray<{
  readonly year: number;
  readonly count: number;
}> = [
  { year: 2019, count: 426 },
  { year: 2020, count: 610 },
  { year: 2021, count: 818 },
  { year: 2022, count: 883 },
  { year: 2023, count: 76 },
  { year: 2024, count: 86 },
  { year: 2025, count: 39 },
  { year: 2026, count: 1102 },
];

/** 主に使っていた言語の移り変わり. from/to は COMMITS_PER_YEAR の添字 */
const LANGUAGE_ERAS: ReadonlyArray<{
  readonly from: number;
  readonly to: number;
  readonly name: string;
  readonly color: string;
}> = [
  { from: 0, to: 1, name: "Elm", color: "var(--blue)" },
  { from: 1, to: 3, name: "TypeScript + PureScript", color: "var(--purple)" },
  { from: 4, to: 6, name: "Deno / Flutter …", color: "var(--text-muted)" },
  { from: 7, to: 7, name: "Rust → definy", color: "var(--orange)" },
];

function HistorySlide({ step, lang }: SlideProps): JSX.Element {
  const max = Math.max(...COMMITS_PER_YEAR.map((c) => c.count));
  return (
    <div className="story-body">
      <Heading
        lang={lang}
        kicker={{ ja: "これまで", en: "History" }}
        text={{
          ja: "4,040 コミットから読む definy の歴史",
          en: "The history of definy in 4,040 commits",
        }}
      />
      <div className="story-chart">
        {COMMITS_PER_YEAR.map((c, index) => {
          const quiet = c.year >= 2023 && c.year <= 2025;
          const highlight =
            step >= 3 && (quiet ? "is-quiet" : c.year === 2026 ? "is-hot" : "");
          return (
            <div key={c.year} className={`story-bar-column ${highlight || ""}`}>
              <div className="story-bar-count">{c.count}</div>
              <div
                className="story-bar"
                style={{
                  height: `${(c.count / max) * 100}%`,
                  animationDelay: `${index * 0.12}s`,
                }}
              />
              <div className="story-bar-year">{c.year}</div>
            </div>
          );
        })}
      </div>
      <Reveal at={1} step={step} className="story-eras">
        {LANGUAGE_ERAS.map((era, index) => (
          <div
            key={era.name}
            className="story-era"
            style={{
              gridColumn: `${era.from + 1} / ${era.to + 2}`,
              borderColor: era.color,
              color: era.color,
              animationDelay: `${index * 0.15}s`,
            }}
          >
            {era.name}
          </div>
        ))}
      </Reveal>
      <div className="story-callouts">
        <Reveal at={2} step={step} className="story-callout">
          🎓{" "}
          {t(lang, {
            ja: "2019 年, 大学の研究から始まった個人プロジェクト",
            en: "2019: started as a personal project from university research",
          })}
        </Reveal>
        <Reveal at={3} step={step} className="story-callout is-quiet">
          💤{" "}
          {t(lang, {
            ja: "2023〜2025 年: 言語を変えながらも, 手が止まった 3 年",
            en: "2023–2025: three quiet years of rewrites",
          })}
        </Reveal>
        <Reveal at={3} step={step} delay={0.3} className="story-callout is-hot">
          🚀{" "}
          {t(lang, {
            ja: "2026 年: 1 年で 1,102 コミット",
            en: "2026: 1,102 commits in one year",
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
        <div className="story-compare-head">Scratch</div>
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

function EventsSlide({ step, lang }: SlideProps): JSX.Element {
  return (
    <div className="story-body">
      <Heading
        lang={lang}
        kicker={{ ja: "特徴 3", en: "Feature 3" }}
        text={{
          ja: "署名付きイベントでつながる分散システム",
          en: "A distributed system of signed events",
        }}
      />
      <div className="story-flow">
        <Reveal at={0} step={step} className="story-flow-item">
          <div className="story-flow-icon">🔑</div>
          <div>{t(lang, { ja: "アカウント = 鍵", en: "Account = key" })}</div>
          <small>Ed25519</small>
        </Reveal>
        <Reveal at={1} step={step} className="story-flow-link">
          <span className="story-packet" />
        </Reveal>
        <Reveal at={1} step={step} delay={0.2} className="story-flow-item">
          <div className="story-flow-icon">📝</div>
          <div>{t(lang, { ja: "署名したイベント", en: "Signed event" })}</div>
          <small>
            {t(lang, {
              ja: "コミット・プロジェクト作成…",
              en: "commit, create project…",
            })}
          </small>
        </Reveal>
        <Reveal at={2} step={step} className="story-flow-link">
          <span className="story-packet" />
        </Reveal>
        <Reveal at={2} step={step} delay={0.2} className="story-flow-item">
          <div className="story-flow-icon">#️⃣</div>
          <div>
            {t(lang, { ja: "内容はハッシュで固定", en: "Content-addressed" })}
          </div>
          <small>SHA-256</small>
        </Reveal>
        <Reveal at={3} step={step} className="story-flow-link">
          <span className="story-packet" />
        </Reveal>
        <Reveal at={3} step={step} delay={0.2} className="story-flow-item">
          <div className="story-flow-icon">🌐</div>
          <div>
            {t(lang, { ja: "誰でも検証できる", en: "Anyone can verify" })}
          </div>
          <small>
            {t(lang, {
              ja: "サーバーもブラウザも",
              en: "servers and browsers",
            })}
          </small>
        </Reveal>
      </div>
      <Reveal at={3} step={step} delay={0.4} className="story-note">
        {t(lang, {
          ja: "サーバーを信用しなくても「誰が・何を」したかを確かめられる",
          en: "You can check who did what without trusting the server",
        })}
      </Reveal>
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
        </div>
        <div className="story-table-head">nostr</div>
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
    readonly name: string;
    readonly desc: Text;
  }> = [
    {
      at: 1,
      name: "Lean 4",
      desc: {
        ja: "定理証明支援系。AI による数学の証明で注目",
        en: "Proof assistant now used by AI for math proofs",
      },
    },
    {
      at: 1,
      name: "Idris 2",
      desc: {
        ja: "依存型を中心にした関数型言語",
        en: "Functional language built around dependent types",
      },
    },
    {
      at: 2,
      name: "nyxis",
      desc: {
        ja: "Lean 4 のバックエンド。認可の安全性をビルドのたびに証明で検査",
        en: "Lean 4 backend whose authorization safety is proven on every build",
      },
    },
    {
      at: 2,
      name: "h5i",
      desc: {
        ja: "Rust の Web アプリの中心部分を Lean 4 に変換して性質を証明",
        en: "Proves properties of Rust web app kernels via Lean 4",
      },
    },
    {
      at: 2,
      name: "qedos",
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
            key={p.name}
            at={p.at}
            step={step}
            delay={(index % 3) * 0.12}
            className="story-card"
          >
            <div className="story-card-name">{p.name}</div>
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
        <p className="story-sub">
          definy.narumincho.com · github.com/narumincho/definy
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
    duration: 30,
    steps: 3,
    render: EventsSlide,
  },
  {
    id: "comparison",
    title: { ja: "ブロックチェーン・nostr", en: "Blockchain & nostr" },
    duration: 30,
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
    duration: 25,
    steps: 1,
    render: ClosingSlide,
  },
];

export function slideTitle(slide: Slide, lang: LanguageCode): string {
  return t(lang, slide.title);
}

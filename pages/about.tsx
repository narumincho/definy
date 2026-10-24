import type { JSX } from "react";
import { Link } from "../src/components/Link.tsx";
import { label } from "../src/language.ts";
import { useDefiny } from "../src/state.tsx";
import type { LanguageCode } from "../src/types.ts";
import {
  BUILTIN_MODULES,
  COMPARISONS,
  PILLARS,
  RPC_METHODS,
  type ComparisonItem,
  type PillarItem,
} from "../src/about_data.ts";

function FeatureCard(
  props: PillarItem & { readonly lang: LanguageCode },
): JSX.Element {
  const { icon, color, tag, title, desc, lang } = props;
  return (
    <div
      className="card"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderTop: `3px solid ${color}`,
        borderRadius: "var(--radius-lg)",
        padding: "1.4rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.8rem",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: "1.8rem", lineHeight: 1 }}>{icon}</span>
        <span
          style={{
            fontSize: "0.72rem",
            padding: "0.2rem 0.55rem",
            borderRadius: "var(--radius-full)",
            fontWeight: 700,
            background: "var(--overlay-2)",
            color,
            border: `1px solid ${color}`,
          }}
        >
          {tag}
        </span>
      </div>
      <div
        style={{
          fontSize: "1.05rem",
          fontWeight: 700,
          color: "var(--text-primary)",
        }}
      >
        {label(lang, title.en, title.ja, title.eo)}
      </div>
      <p
        style={{
          fontSize: "0.86rem",
          color: "var(--text-secondary)",
          margin: 0,
          lineHeight: 1.6,
        }}
      >
        {label(lang, desc.en, desc.ja, desc.eo)}
      </p>
    </div>
  );
}

function ComparisonRow(
  props: ComparisonItem & { readonly lang: LanguageCode },
): JSX.Element {
  const { dimension, traditional, definy: definyVal, lang } = props;
  return (
    <tr
      style={{
        borderBottom: "1px solid var(--border)",
      }}
    >
      <td
        style={{
          padding: "0.85rem 1rem",
          fontWeight: 600,
          color: "var(--text-primary)",
        }}
      >
        {label(lang, dimension.en, dimension.ja, dimension.eo)}
      </td>
      <td
        style={{
          padding: "0.85rem 1rem",
          color: "var(--red-text)",
        }}
      >
        {label(lang, traditional.en, traditional.ja, traditional.eo)}
      </td>
      <td
        style={{
          padding: "0.85rem 1rem",
          color: "var(--green)",
          fontWeight: 700,
        }}
      >
        {label(lang, definyVal.en, definyVal.ja, definyVal.eo)}
      </td>
    </tr>
  );
}

export default function AboutPage(): JSX.Element {
  const { language } = useDefiny();

  return (
    <div
      className="about-view page-shell"
      style={{ maxWidth: 960, margin: "0 auto", paddingBottom: "3rem" }}
    >
      <div style={{ display: "grid", gap: "2rem" }}>
        {/* ヒーローセクション */}
        <div
          className="card"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "2.8rem 2rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "1.2rem",
            position: "relative",
            overflow: "hidden",
            boxShadow: "var(--shadow-md)",
          }}
        >
          {/* 背景アクセントグロー */}
          <div
            style={{
              position: "absolute",
              top: -50,
              right: -50,
              width: 220,
              height: 220,
              background:
                "radial-gradient(circle, var(--blue-border) 0%, transparent 70%)",
              borderRadius: "50%",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -50,
              left: -50,
              width: 220,
              height: 220,
              background:
                "radial-gradient(circle, var(--green-bg-strong) 0%, transparent 70%)",
              borderRadius: "50%",
              pointerEvents: "none",
            }}
          />

          {/* ロゴ / アイコンバッジ */}
          <img
            src="/icon.png"
            alt="definy"
            width={76}
            height={76}
            style={{
              borderRadius: 22,
              boxShadow: "0 8px 24px var(--shadow-color)",
            }}
          />

          <h1
            style={{
              fontFamily: '"Hack", var(--font-mono)',
              fontSize: "2.8rem",
              fontWeight: 400,
              margin: 0,
              color: "#b9d09b",
              letterSpacing: 0,
            }}
          >
            definy
          </h1>

          <p
            style={{
              fontSize: "1.15rem",
              fontWeight: 600,
              color: "var(--blue)",
              margin: 0,
              maxWidth: 680,
              lineHeight: 1.45,
            }}
          >
            {label(
              language,
              "Pure functional language with content-addressed code and structured editing.",
              "コンテンツアドレスと構造化編集による、壊れない純粋関数型プログラミング環境",
              "Pura funkcia lingvo kun enhav-adresita kodo kaj strukturita redaktado.",
            )}
          </p>

          <p
            style={{
              fontSize: "0.92rem",
              color: "var(--text-secondary)",
              margin: 0,
              maxWidth: 720,
              lineHeight: 1.65,
            }}
          >
            {label(
              language,
              "definy rethinks software development from first principles. Instead of storing text files with syntax errors and fragile dependency versioning, definy treats syntax trees as first-class cryptographic objects and connects distributed developers through zero-trust event sourcing.",
              "definy（デファイニー）は、従来の「テキストファイルと壊れやすい依存管理」からプログラミングを根本的に再構築するプロジェクトです。コードを文字列ではなく純粋な構文木（AST）として扱い、SHA-256 のコンテンツハッシュで厳密にバージョン固定。さらに決定論的 CBOR と暗号署名によるイベントソーシングにより、安全で分散協調可能な開発を実現します。",
              "definy rekonsideras programadon. Anstataŭ tekstaj dosieroj kun sintaksaj eraroj, definy traktas sintaksarbojn kiel kriptografiajn objektojn.",
            )}
          </p>

          {/* クイックアクション */}
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              flexWrap: "wrap",
              justifyContent: "center",
              marginTop: "0.5rem",
            }}
          >
            <Link
              href="/modules"
              className="btn btn-primary"
              style={{ padding: "0.6rem 1.4rem", textDecoration: "none" }}
            >
              {label(
                language,
                "Explore Modules →",
                "モジュールを探す →",
                "Esplori Modulojn →",
              )}
            </Link>
            <Link
              href="/parts"
              className="btn btn-secondary"
              style={{ padding: "0.6rem 1.4rem", textDecoration: "none" }}
            >
              {label(
                language,
                "Explore Parts →",
                "パーツ一覧を見る →",
                "Esplori Partojn →",
              )}
            </Link>
          </div>
        </div>

        {/* 4大コアピラー */}
        <div style={{ display: "grid", gap: "1.2rem" }}>
          <h2
            style={{
              fontSize: "1.4rem",
              fontWeight: 700,
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              color: "var(--text-primary)",
            }}
          >
            <span>🏛️</span>
            <span>
              {label(
                language,
                "The 4 Core Pillars of definy",
                "definy を支える 4 つの柱",
                "La 4 Kolonoj de definy",
              )}
            </span>
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "1.2rem",
            }}
          >
            {PILLARS.map((p) => (
              <FeatureCard key={p.tag} {...p} lang={language} />
            ))}
          </div>
        </div>

        {/* 従来エコシステムとの比較表 */}
        <div style={{ display: "grid", gap: "1rem" }}>
          <h2
            style={{
              fontSize: "1.4rem",
              fontWeight: 700,
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              color: "var(--text-primary)",
            }}
          >
            <span>⚖️</span>
            <span>
              {label(
                language,
                "Traditional Programming vs. definy",
                "従来のプログラミング言語・環境との比較",
                "Tradicia Programado kontraŭ definy",
              )}
            </span>
          </h2>

          <div
            style={{
              overflowX: "auto",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.88rem",
                textAlign: "left",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "var(--bg-inset)",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <th
                    style={{
                      padding: "0.85rem 1rem",
                      color: "var(--text-secondary)",
                      fontWeight: 600,
                    }}
                  >
                    {label(language, "Dimension", "比較項目", "Dimensio")}
                  </th>
                  <th
                    style={{
                      padding: "0.85rem 1rem",
                      color: "var(--red)",
                      fontWeight: 600,
                    }}
                  >
                    {label(
                      language,
                      "Traditional Ecosystems",
                      "従来のエコシステム",
                      "Tradiciaj Ekosistemoj",
                    )}
                  </th>
                  <th
                    style={{
                      padding: "0.85rem 1rem",
                      color: "var(--green)",
                      fontWeight: 700,
                    }}
                  >
                    definy
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISONS.map((c) => (
                  <ComparisonRow key={c.dimension.en} {...c} lang={language} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 組み込みモジュール */}
        <div style={{ display: "grid", gap: "1.2rem" }}>
          <h2
            style={{
              fontSize: "1.4rem",
              fontWeight: 700,
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              color: "var(--text-primary)",
            }}
          >
            <span>📦</span>
            <span>
              {label(
                language,
                "Builtin Modules",
                "組み込みモジュール",
                "Enkonstruitaj Moduloj",
              )}
            </span>
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1rem",
            }}
          >
            {BUILTIN_MODULES.map((m) => (
              <Link
                key={m.id}
                href={`/module/${m.id}`}
                className="card"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: "1.1rem",
                  display: "grid",
                  gap: "0.5rem",
                  textDecoration: "none",
                  color: "inherit",
                  transition: "transform 0.15s ease, border-color 0.15s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span style={{ fontSize: "1.4rem" }}>{m.icon}</span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "1rem",
                      fontWeight: 700,
                      color: "var(--blue-text)",
                    }}
                  >
                    {m.name}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {label(language, m.title.en, m.title.ja, m.title.eo)}
                </div>
                <p
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--text-secondary)",
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {label(language, m.desc.en, m.desc.ja, m.desc.eo)}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* Connect-RPC API 構造・エンドポイント */}
        <div style={{ display: "grid", gap: "1.2rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              flexWrap: "wrap",
              gap: "0.8rem",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: "1.4rem",
                  fontWeight: 700,
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  color: "var(--text-primary)",
                }}
              >
                <span>⚡</span>
                <span>
                  {label(
                    language,
                    "Connect-RPC (gRPC) & CAS Integration",
                    "Connect-RPC (gRPC) & CAS アーキテクチャ",
                    "Connect-RPC & CAS Integriĝo",
                  )}
                </span>
              </h2>
              <p
                style={{
                  fontSize: "0.88rem",
                  color: "var(--text-secondary)",
                  margin: "0.3rem 0 0 0",
                  lineHeight: 1.5,
                  maxWidth: 680,
                }}
              >
                {label(
                  language,
                  "definy replaces REST with Connect-RPC over HTTP POST. Every procedure uses deterministic Protobuf and CBOR payloads with content-addressed CAS caching.",
                  "definy は通信プロトコルを Connect-RPC (HTTP POST + JSON/Protobuf) に一本化。差分ハッシュ・ネゴシエーションと CAS キャッシュにより高速かつ安全に動作します。",
                  "definy uzas Connect-RPC super HTTP POST.",
                )}
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1rem",
            }}
          >
            {RPC_METHODS.map((rpc) => (
              <div
                key={rpc.name}
                className="card"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: "1.1rem",
                  display: "grid",
                  gap: "0.6rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      padding: "0.15rem 0.45rem",
                      background: "var(--blue-bg-strong)",
                      color: "var(--blue)",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      borderRadius: "var(--radius-xs)",
                      border: "1px solid var(--blue-border)",
                    }}
                  >
                    POST
                  </span>
                  <span
                    style={{
                      fontSize: "0.74rem",
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {rpc.service}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "1rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {rpc.name}
                </div>
                <p
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--text-secondary)",
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {label(language, rpc.desc.en, rpc.desc.ja, rpc.desc.eo)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* フッターカード */}
        <div
          className="card"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "1.8rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1.2rem",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ display: "grid", gap: "0.3rem" }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: "1.1rem",
                color: "var(--text-primary)",
              }}
            >
              {label(
                language,
                "Ready to dive into definy?",
                "definy の世界を体験してみましょう",
                "Ĉu preta esplori definy?",
              )}
            </div>
            <div
              style={{
                fontSize: "0.86rem",
                color: "var(--text-secondary)",
              }}
            >
              {label(
                language,
                "Explore public modules, write expressions in the tree editor, or deploy parts to Cloudflare Workers edge with definy.deploy-to-cloudflare-workers.",
                "公開されているモジュールを閲覧したり、式の木構造エディタで関数を作成し、definy.deploy-to-cloudflare-workers で Cloudflare Workers へデプロイできます。",
                "Esploru publikajn modulojn kaj kreu esprimojn en la arba redaktilo.",
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <Link
              href="/modules"
              className="btn btn-primary"
              style={{ textDecoration: "none" }}
            >
              {label(
                language,
                "View Modules",
                "モジュール一覧",
                "Vidi Modulojn",
              )}
            </Link>
            <Link
              href="/parts"
              className="btn btn-secondary"
              style={{ textDecoration: "none" }}
            >
              {label(language, "View Parts", "パーツ一覧", "Vidi Partojn")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

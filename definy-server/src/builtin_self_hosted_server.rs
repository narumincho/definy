//! definy 自身で definy を構築・検証・ホストするセルフホスト HTTP サーバーパーツ (`sample.self-hosted-definy-server`)。
//!
//! HTTP リクエスト `{ method, path, query, url }` を受け取り、リクエスト処理の内部で実際に:
//! - `core.expression-to-source` (自己記述フォーマッタ)
//! - `core.optimize-expression` (自己記述定数畳み込み最適化器)
//! - `core.type-check` (自己記述型検査器)
//! - `core.eval-ast` (自己記述メタ循環評価器)
//! - `core.compile-to-wasm` (自己記述 WebAssembly コンパイラ)
//! を呼び出し、セルフホストパイプラインの実証結果および definy 上で新たなパーツ・サブドメインサーバーを
//! 構築・起動できる対話型 Studio UI (`GET /`) と JSON API (`GET /healthz`, `GET /api/self-host`) を返します。

use crate::ast_builder::{call_part, fn_expr, fn_type};
use definy_event::EventHashId;
use definy_event::event::{
    AndExpression, Description, EqualExpression, Expression, GreaterThanExpression, IfExpression,
    LetExpression, ListGetExpression, ListLengthExpression, ListLiteralExpression, MatchArm,
    MatchExpression, ModulePartEntry, NumberExpression, PartType, RecordFieldType,
    RecordGetExpression, StringConcatExpression, StringExpression, TypeLiteralExpression,
    TypeLiteralItemExpression, VariableExpression, VariantExpression, derive_module_part_id,
};

fn str_expr(s: &str) -> Expression {
    Expression::String(StringExpression { value: s.into() })
}

fn num_expr(n: i64) -> Expression {
    Expression::Number(NumberExpression { value: n })
}

fn var_expr(id: i64) -> Expression {
    Expression::Variable(VariableExpression { variable_id: id })
}

fn concat_all(parts: Vec<Expression>) -> Expression {
    let mut iter = parts.into_iter();
    let Some(first) = iter.next() else {
        return str_expr("");
    };
    iter.fold(first, |acc, next| {
        Expression::StringConcat(StringConcatExpression {
            left: Box::new(acc),
            right: Box::new(next),
        })
    })
}

fn let_chain(bindings: Vec<(i64, &str, Expression)>, body: Expression) -> Expression {
    bindings
        .into_iter()
        .rev()
        .fold(body, |acc, (id, name, val)| {
            Expression::Let(LetExpression {
                variable_id: id,
                variable_name: name.into(),
                value: Box::new(val),
                body: Box::new(acc),
            })
        })
}

fn http_response_record(status: i64, content_type: &str, body: Expression) -> Expression {
    Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "status".into(),
                value: Box::new(num_expr(status)),
            },
            TypeLiteralItemExpression {
                key: "contentType".into(),
                value: Box::new(str_expr(content_type)),
            },
            TypeLiteralItemExpression {
                key: "body".into(),
                value: Box::new(body),
            },
        ],
    })
}

/// `sample.self-hosted-definy-server` パーツを生成します。
#[must_use]
pub fn create_self_hosted_definy_server_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let expr_type_hash = derive_module_part_id(core_module_id, "expression");
    let to_source_hash = derive_module_part_id(core_module_id, "expression-to-source");
    let optimize_hash = derive_module_part_id(core_module_id, "optimize-expression");
    let eval_ast_hash = derive_module_part_id(core_module_id, "eval-ast");
    let type_check_hash = derive_module_part_id(core_module_id, "type-check");
    let compile_to_wasm_hash = derive_module_part_id(core_module_id, "compile-to-wasm");

    let ast_num = |val: i64| {
        Expression::Variant(VariantExpression {
            tag: "number".into(),
            payload: Some(Box::new(num_expr(val))),
            type_part_definition_event_hash: Some(expr_type_hash.clone()),
        })
    };

    let ast_binary = |tag: &str, left: Expression, right: Expression| {
        Expression::Variant(VariantExpression {
            tag: tag.into(),
            payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                items: vec![
                    TypeLiteralItemExpression {
                        key: "left".into(),
                        value: Box::new(left),
                    },
                    TypeLiteralItemExpression {
                        key: "right".into(),
                        value: Box::new(right),
                    },
                ],
            }))),
            type_part_definition_event_hash: Some(expr_type_hash.clone()),
        })
    };

    // 対象 AST: ((10 + 5) * 2) + 12 = 42
    let target_ast = ast_binary(
        "add",
        ast_binary(
            "multiply",
            ast_binary("add", ast_num(10), ast_num(5)),
            ast_num(2),
        ),
        ast_num(12),
    );

    // 空の型環境: { vars: [], parts: [] }
    let empty_type_env = Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "vars".into(),
                value: Box::new(Expression::ListLiteral(ListLiteralExpression {
                    items: vec![],
                })),
            },
            TypeLiteralItemExpression {
                key: "parts".into(),
                value: Box::new(Expression::ListLiteral(ListLiteralExpression {
                    items: vec![],
                })),
            },
        ],
    });

    // 型検査結果 Match: ok(_) -> "ok(number)", error(_) -> "error", _ -> "unknown"
    let type_status_expr = Expression::Match(MatchExpression {
        target: Box::new(var_expr(16)),
        arms: vec![
            MatchArm {
                tag: "ok".into(),
                variable_id: Some(30),
                variable_name: Some("t".into()),
                body: Box::new(str_expr("ok(number)")),
            },
            MatchArm {
                tag: "error".into(),
                variable_id: Some(31),
                variable_name: Some("err".into()),
                body: Box::new(str_expr("error")),
            },
            MatchArm {
                tag: "_".into(),
                variable_id: Some(32),
                variable_name: Some("_".into()),
                body: Box::new(str_expr("unknown")),
            },
        ],
        default: None,
    });

    // パイプライン整合性検証:
    // eval_raw == 42 && eval_opt == 42 && list-length(wasm_bytes) > 8 && wasm_bytes[0] == 0 && wasm_bytes[1] == 97
    let check_eval_raw = Expression::Equal(EqualExpression {
        left: Box::new(var_expr(14)),
        right: Box::new(num_expr(42)),
    });
    let check_eval_opt = Expression::Equal(EqualExpression {
        left: Box::new(var_expr(15)),
        right: Box::new(num_expr(42)),
    });
    let check_wasm_len = Expression::GreaterThan(GreaterThanExpression {
        left: Box::new(Expression::ListLength(ListLengthExpression {
            value: Box::new(var_expr(18)),
        })),
        right: Box::new(num_expr(8)),
    });
    let check_wasm_magic0 = Expression::Equal(EqualExpression {
        left: Box::new(Expression::ListGet(ListGetExpression {
            list: Box::new(var_expr(18)),
            index: Box::new(num_expr(0)),
        })),
        right: Box::new(num_expr(0)),
    });
    let check_wasm_magic1 = Expression::Equal(EqualExpression {
        left: Box::new(Expression::ListGet(ListGetExpression {
            list: Box::new(var_expr(18)),
            index: Box::new(num_expr(1)),
        })),
        right: Box::new(num_expr(97)),
    });

    let all_checks = [
        check_eval_raw,
        check_eval_opt,
        check_wasm_len,
        check_wasm_magic0,
        check_wasm_magic1,
    ]
    .into_iter()
    .reduce(|acc, c| {
        Expression::And(AndExpression {
            left: Box::new(acc),
            right: Box::new(c),
        })
    })
    .unwrap();

    let pipeline_ok_str = Expression::If(IfExpression {
        condition: Box::new(all_checks),
        then_expr: Box::new(str_expr("true")),
        else_expr: Box::new(str_expr("false")),
    });

    // 1. /healthz JSON レスポンス
    let healthz_body = concat_all(vec![
        str_expr(
            "{\"status\":\"ok\",\"service\":\"self-hosted-definy-server\",\"selfHostingPipelineVerified\":",
        ),
        var_expr(19),
        str_expr(",\"typeCheck\":\""),
        var_expr(17),
        str_expr("\"}"),
    ]);

    // 2. /api/self-host JSON レスポンス
    let api_self_host_body = concat_all(vec![
        str_expr("{\"engine\":\"definy-self-hosted\",\"method\":\""),
        var_expr(3),
        str_expr("\",\"path\":\""),
        var_expr(2),
        str_expr("\",\"sourceBefore\":\""),
        var_expr(11),
        str_expr("\",\"sourceAfter\":\""),
        var_expr(13),
        str_expr("\",\"typeCheck\":\""),
        var_expr(17),
        str_expr("\",\"evaluatedValue\":42,\"selfHostingPipelineVerified\":"),
        var_expr(19),
        str_expr("}"),
    ]);

    // 3. / (Studio HTML) レスポンス
    let studio_html_body = concat_all(vec![
        str_expr(STUDIO_HTML_HEAD),
        var_expr(3),
        str_expr(" "),
        var_expr(2),
        str_expr(
            "</code></div><div class=\"metric\"><span class=\"label\">1. core.expression-to-source (Before)</span><code>",
        ),
        var_expr(11),
        str_expr(
            "</code></div><div class=\"metric\"><span class=\"label\">2. core.optimize-expression + Formatter</span><code>",
        ),
        var_expr(13),
        str_expr(
            "</code></div><div class=\"metric\"><span class=\"label\">3. core.type-check</span><code class=\"ok\">",
        ),
        var_expr(17),
        str_expr(
            "</code></div><div class=\"metric\"><span class=\"label\">4. core.eval-ast (Meta-Circular)</span><code class=\"ok\">42 (verified: ",
        ),
        var_expr(19),
        str_expr(
            ")</code></div><div class=\"metric\"><span class=\"label\">5. core.compile-to-wasm (\\0asm Magic)</span><code class=\"ok\">Verified (",
        ),
        var_expr(19),
        str_expr(")</code></div></div>"),
        str_expr(STUDIO_HTML_INTERACTIVE_SCRIPT),
    ]);

    let route_expr = Expression::If(IfExpression {
        condition: Box::new(Expression::Equal(EqualExpression {
            left: Box::new(var_expr(2)),
            right: Box::new(str_expr("/healthz")),
        })),
        then_expr: Box::new(http_response_record(
            200,
            "application/json; charset=utf-8",
            healthz_body,
        )),
        else_expr: Box::new(Expression::If(IfExpression {
            condition: Box::new(Expression::Equal(EqualExpression {
                left: Box::new(var_expr(2)),
                right: Box::new(str_expr("/api/self-host")),
            })),
            then_expr: Box::new(http_response_record(
                200,
                "application/json; charset=utf-8",
                api_self_host_body,
            )),
            else_expr: Box::new(http_response_record(
                200,
                "text/html; charset=utf-8",
                studio_html_body,
            )),
        })),
    });

    let body = let_chain(
        vec![
            (
                2,
                "path",
                Expression::RecordGet(RecordGetExpression {
                    record: Box::new(var_expr(1)),
                    key: "path".into(),
                }),
            ),
            (
                3,
                "method",
                Expression::RecordGet(RecordGetExpression {
                    record: Box::new(var_expr(1)),
                    key: "method".into(),
                }),
            ),
            (10, "raw_ast", target_ast),
            (
                11,
                "source_before",
                call_part(&to_source_hash, &[("expr", var_expr(10))]),
            ),
            (
                12,
                "opt_ast",
                call_part(&optimize_hash, &[("expr", var_expr(10))]),
            ),
            (
                13,
                "source_after",
                call_part(&to_source_hash, &[("expr", var_expr(12))]),
            ),
            (
                14,
                "eval_raw",
                call_part(&eval_ast_hash, &[("e", var_expr(10))]),
            ),
            (
                15,
                "eval_opt",
                call_part(&eval_ast_hash, &[("e", var_expr(12))]),
            ),
            (
                16,
                "type_res",
                call_part(
                    &type_check_hash,
                    &[("expr", var_expr(10)), ("env", empty_type_env)],
                ),
            ),
            (17, "type_status", type_status_expr),
            (
                18,
                "wasm_bytes",
                call_part(&compile_to_wasm_hash, &[("expr", var_expr(10))]),
            ),
            (19, "pipeline_ok", pipeline_ok_str),
        ],
        route_expr,
    );

    ModulePartEntry {
        name: "self-hosted-definy-server".into(),
        part_type: Some(fn_type(
            &[(
                "req",
                PartType::Record(vec![
                    RecordFieldType {
                        key: "method".into(),
                        value: Box::new(PartType::String),
                    },
                    RecordFieldType {
                        key: "path".into(),
                        value: Box::new(PartType::String),
                    },
                    RecordFieldType {
                        key: "query".into(),
                        value: Box::new(PartType::String),
                    },
                    RecordFieldType {
                        key: "url".into(),
                        value: Box::new(PartType::String),
                    },
                ]),
            )],
            PartType::Record(vec![
                RecordFieldType {
                    key: "status".into(),
                    value: Box::new(PartType::Number),
                },
                RecordFieldType {
                    key: "contentType".into(),
                    value: Box::new(PartType::String),
                },
                RecordFieldType {
                    key: "body".into(),
                    value: Box::new(PartType::String),
                },
            ]),
        )),
        description: Description::localized(vec![
            (
                "en",
                "Self-hosted definy HTTP server & Studio executing core.expression-to-source, core.optimize-expression, core.type-check, core.eval-ast, and core.compile-to-wasm",
            ),
            (
                "ja",
                "definy 自身のコアパーツ群 (フォーマッタ・最適化器・型検査器・評価器・Wasmコンパイラ) を実行して definy Studio を提供するセルフホスト HTTP サーバーパーツ",
            ),
        ]),
        content_hash: None,
        expression: Some(fn_expr(&[("req", 1)], body)),
    }
}

const STUDIO_HTML_HEAD: &str = r#"<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Self-Hosted definy Studio (definy in definy)</title>
<style>
:root { --bg: #0b1120; --card: #111827; --border: #1f2937; --accent: #38bdf8; --ok: #22c55e; --text: #f8fafc; --muted: #94a3b8; }
* { box-sizing: border-box; }
body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); padding: 2rem 1.25rem; }
.container { max-width: 980px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem; }
.card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; }
.badge { display: inline-block; background: rgba(34, 197, 94, 0.15); color: var(--ok); border: 1px solid rgba(34, 197, 94, 0.35); padding: 0.25rem 0.7rem; border-radius: 999px; font-size: 0.78rem; font-weight: 700; }
h1 { margin: 0.5rem 0; font-size: 1.6rem; color: var(--accent); }
h2 { margin: 0 0 1rem 0; font-size: 1.15rem; color: var(--text); }
p { margin: 0.35rem 0; color: var(--muted); line-height: 1.55; font-size: 0.92rem; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(270px, 1fr)); gap: 0.85rem; margin-top: 1rem; }
.metric { background: #0f172a; border: 1px solid var(--border); border-radius: 8px; padding: 0.85rem; display: flex; flex-direction: column; gap: 0.35rem; }
.label { font-size: 0.78rem; color: var(--muted); font-weight: 600; }
code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.88rem; color: #e2e8f0; word-break: break-all; }
code.ok { color: var(--ok); font-weight: 700; }
input, select { width: 100%; background: #0f172a; border: 1px solid var(--border); color: var(--text); padding: 0.6rem 0.75rem; border-radius: 6px; font-size: 0.9rem; }
button { background: #0284c7; color: white; border: none; padding: 0.65rem 1.2rem; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.9rem; }
button:hover { background: #0369a1; }
.app-list { display: flex; flex-direction: column; gap: 0.6rem; margin-top: 0.8rem; }
.app-row { display: flex; justify-content: space-between; align-items: center; background: #0f172a; border: 1px solid var(--border); padding: 0.75rem 1rem; border-radius: 8px; flex-wrap: wrap; gap: 0.5rem; }
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
</style>
</head>
<body>
<div class="container">
<div class="card">
<span class="badge">🧬 Executed by Self-Hosted definy Part (sample.self-hosted-definy-server)</span>
<h1>🚀 Self-Hosted definy Studio</h1>
<p>このページ自体が definy の関数パーツ (<code>fn(req) =&gt; { status, contentType, body }</code>) として WebAssembly / AST 評価器上で動的に生成されています。</p>
<div class="grid">
<div class="metric"><span class="label">0. Incoming HTTP Request</span><code>"#;

const STUDIO_HTML_INTERACTIVE_SCRIPT: &str = r#"</div>
<div class="card">
<h2>🛠️ definy 自身から新しいサブドメインアプリを起動 (Self-Host App Launcher)</h2>
<p>このセルフホスト画面から Connect-RPC (<code>/definy.v1.PreviewService/RegisterPreviewApp</code>) を呼び出し、任意のパーツを新しいサブドメインで即座にホストできます。</p>
<div class="grid">
<div><label class="label">Subdomain / App ID</label><input id="sub" value="my-definy" placeholder="e.g. my-definy" /></div>
<div><label class="label">Target Part (module.part or EventHashId)</label>
<input id="part" list="part-presets" value="sample.self-hosted-definy-server" placeholder="e.g. sample.self-hosted-definy-server" />
<datalist id="part-presets">
<option value="sample.self-hosted-definy-server">Self-Hosted definy Studio (fn(req) =&gt; Response)</option>
<option value="sample.greet">sample.greet ("Hello, definy!")</option>
<option value="sample.triangle-area">sample.triangle-area (25)</option>
<option value="sample.sample-ast-calc">sample.sample-ast-calc (core.eval-ast =&gt; 95)</option>
<option value="sample.prime-numbers">sample.prime-numbers ([2, 3, 5, 7, 11])</option>
</datalist>
</div>
<div><label class="label">Admin Account ID</label><input id="admin" value="local-dev-admin" /></div>
</div>
<div style="margin-top:1rem;display:flex;gap:0.75rem;align-items:center;flex-wrap:wrap;">
<button onclick="launchApp()">🚀 Launch Subdomain Server</button>
<a href="http://localhost:8000" target="_blank">🏠 Main definy IDE (localhost:8000)</a>
<a href="/api/self-host" target="_blank">📄 View /api/self-host JSON</a>
<a href="/healthz" target="_blank">🩺 View /healthz JSON</a>
<span id="msg" style="font-size:0.85rem;color:var(--ok);"></span>
</div>
<div id="apps" class="app-list"></div>
</div>
</div>
<script>
async function refreshApps() {
  try {
    const res = await fetch('/definy.v1.PreviewService/ListPreviewApps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Connect-Protocol-Version': '1' },
      body: JSON.stringify({})
    });
    const data = await res.json();
    const box = document.getElementById('apps');
    box.innerHTML = (data.apps || []).map(a =>
      `<div class="app-row"><div><strong>${a.displayName}</strong> (<code>${a.partId}</code>)</div><div><a href="${a.previewUrl}" target="_blank">🔗 ${a.previewUrl}</a></div></div>`
    ).join('');
  } catch (e) { console.error(e); }
}
async function launchApp() {
  const appId = document.getElementById('sub').value.trim();
  const partId = document.getElementById('part').value.trim();
  const accountId = document.getElementById('admin').value.trim();
  const msg = document.getElementById('msg');
  msg.textContent = 'Starting...';
  try {
    const res = await fetch('/definy.v1.PreviewService/RegisterPreviewApp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Connect-Protocol-Version': '1' },
      body: JSON.stringify({ appId, displayName: appId + ' (Self-Hosted)', partId, accountId })
    });
    const data = await res.json();
    if (res.ok) {
      msg.textContent = 'Launched: ' + data.previewUrl;
      refreshApps();
    } else {
      msg.textContent = 'Error: ' + (data.message || res.statusText);
    }
  } catch (e) { msg.textContent = String(e); }
}
refreshApps();
</script>
</body>
</html>"#;

//! HTTP サーバーとして動くパーツ（プレビューアプリなど）を実行するための共通処理。
//!
//! Rust サーバー（wasmtime）と Cloudflare Workers 用の Wasm モジュール（wasmi）の両方から使う。

use definy_event::event::{
    CallArgument, CallExpression, EventContent, Expression, derive_module_id, derive_module_part_id,
};

use crate::{EventWithHash, Value};

/// コミットイベント群から、パーツ ID（URL-safe base64）・`module.part`・パーツ名のいずれかに一致する
/// パーツの式を探します。後のイベントを優先します。
pub fn find_part_expression(part_id: &str, events: &[EventWithHash]) -> Result<Expression, String> {
    let trimmed = part_id.trim();
    for (_hash, res) in events.iter().rev() {
        if let Ok((_sig, event)) = res
            && let EventContent::ModuleCommit(ref mc) = event.content
        {
            let module_id = derive_module_id(&event.account_id, &mc.module_name);
            for part in &mc.parts {
                let derived_part_id = derive_module_part_id(&module_id, &part.name);
                let qualified_name = format!("{}.{}", mc.module_name, part.name);
                if derived_part_id.to_string() == trimmed
                    || part.name.as_ref() == trimmed
                    || qualified_name == trimmed
                {
                    return part
                        .expression
                        .clone()
                        .ok_or_else(|| format!("Part '{trimmed}' does not have an expression"));
                }
            }
        }
    }
    Err(format!("Part not found: {trimmed}"))
}

/// パーツの式が `definy.preview({ code, handler })` などのプレビュー設定なら、そのハンドラ式を返します。
/// そうでなければ式をそのまま返します。
#[must_use]
pub fn resolve_http_handler(expression: Expression) -> Expression {
    match crate::detect_preview_in_expression(&expression).and_then(|d| d.handler_expression) {
        Some(handler) => handler,
        None => expression,
    }
}

/// バイト列 `body_bytes` を純粋関数型 Pull ストリーム `{ initialState: 0, next: fn(state) => ... }` の AST 式として構築します。
#[must_use]
pub fn build_byte_stream_expression(body_bytes: &[u8]) -> Expression {
    use definy_event::event::{
        EqualExpression, FunctionExpression, FunctionParameter, IfExpression,
        ListLiteralExpression, NumberExpression, TypeLiteralExpression, TypeLiteralItemExpression,
        VariableExpression, VariantExpression,
    };

    let done_variant = Expression::Variant(VariantExpression {
        tag: "done".into(),
        payload: None,
        type_part_definition_event_hash: None,
    });

    let next_body = if body_bytes.is_empty() {
        done_variant
    } else {
        let byte_items: Vec<Expression> = body_bytes
            .iter()
            .map(|&b| {
                Expression::Number(NumberExpression {
                    value: i64::from(b),
                })
            })
            .collect();
        let yield_variant = Expression::Variant(VariantExpression {
            tag: "yield".into(),
            payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                items: vec![
                    TypeLiteralItemExpression {
                        key: "chunk".into(),
                        value: Box::new(Expression::ListLiteral(ListLiteralExpression {
                            items: byte_items,
                        })),
                    },
                    TypeLiteralItemExpression {
                        key: "nextState".into(),
                        value: Box::new(Expression::Number(NumberExpression { value: 1 })),
                    },
                ],
            }))),
            type_part_definition_event_hash: None,
        });

        Expression::If(IfExpression {
            condition: Box::new(Expression::Equal(EqualExpression {
                left: Box::new(Expression::Variable(VariableExpression {
                    variable_id: 9001,
                })),
                right: Box::new(Expression::Number(NumberExpression { value: 0 })),
            })),
            then_expr: Box::new(yield_variant),
            else_expr: Box::new(done_variant),
        })
    };

    Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "initialState".into(),
                value: Box::new(Expression::Number(NumberExpression { value: 0 })),
            },
            TypeLiteralItemExpression {
                key: "next".into(),
                value: Box::new(Expression::Function(FunctionExpression {
                    parameters: vec![FunctionParameter {
                        parameter_id: 9001,
                        parameter_name: "state".into(),
                    }],
                    body: Box::new(next_body),
                })),
            },
        ],
    })
}

/// HTTP リクエスト情報 `{ method, url, headers, body }` を表す純粋な definy レコード式を構築します。
/// - `headers`: `List<{ name: String, value: String }>`
/// - `body`: `{ initialState: Number, next: fn(state: Number) => StreamStep }` (案A Pull 型ストリーム)
#[must_use]
pub fn build_http_request_record_expression(
    method: &str,
    url: &str,
    headers: &[(String, String)],
    body_bytes: &[u8],
) -> Expression {
    use definy_event::event::{
        ListLiteralExpression, StringExpression, TypeLiteralExpression, TypeLiteralItemExpression,
    };
    let header_items: Vec<Expression> = headers
        .iter()
        .map(|(name, val)| {
            Expression::TypeLiteral(TypeLiteralExpression {
                items: vec![
                    TypeLiteralItemExpression {
                        key: "name".into(),
                        value: Box::new(Expression::String(StringExpression {
                            value: name.as_str().into(),
                        })),
                    },
                    TypeLiteralItemExpression {
                        key: "value".into(),
                        value: Box::new(Expression::String(StringExpression {
                            value: val.as_str().into(),
                        })),
                    },
                ],
            })
        })
        .collect();

    Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "method".into(),
                value: Box::new(Expression::String(StringExpression {
                    value: method.into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "url".into(),
                value: Box::new(Expression::String(StringExpression { value: url.into() })),
            },
            TypeLiteralItemExpression {
                key: "headers".into(),
                value: Box::new(Expression::ListLiteral(ListLiteralExpression {
                    items: header_items,
                })),
            },
            TypeLiteralItemExpression {
                key: "body".into(),
                value: Box::new(build_byte_stream_expression(body_bytes)),
            },
        ],
    })
}

/// HTTP リクエストを受け取るパーツ（またはハンドラ式）にリクエストを適用する式を、Wasm にコンパイルします。
///
/// 関数でない式は一度評価し、関数値なら `req` 引数で呼び出します（関数以外はそのまま）。
/// 実行は wasmtime（`execute_wasm_http_response`）でも wasmi（Cloudflare Workers 向け）でもできます。
pub fn compile_http_request_to_wasm(
    expression: &Expression,
    events: &[EventWithHash],
    method: &str,
    url: &str,
    headers: &[(String, String)],
    body_bytes: &[u8],
) -> Result<Vec<u8>, String> {
    let req_expr = build_http_request_record_expression(method, url, headers, body_bytes);
    let call_with = |param_name: &str| {
        Expression::Call(CallExpression {
            function: Box::new(expression.clone()),
            arguments: vec![CallArgument {
                name: param_name.into(),
                value: Box::new(req_expr.clone()),
            }],
        })
    };
    let target_expr = if let Expression::Function(ref fn_expr) = *expression {
        call_with(
            fn_expr
                .parameters
                .first()
                .map_or("req", |p| p.parameter_name.as_ref()),
        )
    } else if matches!(
        crate::evaluate_expression(expression, events)?,
        Value::Function
    ) {
        call_with("req")
    } else {
        expression.clone()
    };
    crate::wasm_emitter::compile_expression_to_wasm(&target_expr, events)
}

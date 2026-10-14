//! definy の式 (Expression) 内から Web アプリケーション プレビュー (`definy:preview`) の呼び出しを検出するモジュール。

use definy_event::event::{CallExpression, Expression, TypeLiteralExpression};

/// 検出された Web アプリケーション プレビュー設定
#[derive(Clone, Debug, PartialEq)]
pub struct DetectedPreview {
    /// サブドメインまたはパスプレフィックス用のコード (例: "my-app")
    pub code: String,
    /// HTTP リクエストを受け取ってレスポンスを返すハンドラ式
    pub handler_expression: Option<Expression>,
}

/// 式の中から `preview({ code: String, handler: HttpRequest -> HttpResponse })` の呼び出しまたは設定を探索します。
#[must_use]
pub fn detect_preview_in_expression(expr: &Expression) -> Option<DetectedPreview> {
    // 1. 直接 Call 式またはレコード式からプレビュー設定を抽出
    if let Some(detected) = match expr {
        Expression::Call(call) => extract_preview_from_call(call),
        Expression::TypeLiteral(record) => extract_preview_from_record(record),
        _ => None,
    } {
        return Some(detected);
    }

    // 2. 子ノードの再帰的探索 (Let 式, If 式, Function 式など)
    match expr {
        Expression::Let(let_expr) => detect_preview_in_expression(&let_expr.body)
            .or_else(|| detect_preview_in_expression(&let_expr.value)),
        Expression::If(if_expr) => detect_preview_in_expression(&if_expr.then_expr)
            .or_else(|| detect_preview_in_expression(&if_expr.else_expr)),
        Expression::Function(fn_expr) => detect_preview_in_expression(&fn_expr.body),
        Expression::Call(call) => detect_preview_in_expression(&call.function).or_else(|| {
            for arg in &call.arguments {
                if let Some(d) = detect_preview_in_expression(&arg.value) {
                    return Some(d);
                }
            }
            None
        }),
        Expression::Match(match_expr) => {
            for arm in &match_expr.arms {
                if let Some(d) = detect_preview_in_expression(&arm.body) {
                    return Some(d);
                }
            }
            match_expr
                .default
                .as_ref()
                .and_then(|def| detect_preview_in_expression(def))
        }
        _ => None,
    }
}

fn extract_preview_from_call(call: &CallExpression) -> Option<DetectedPreview> {
    // 引数の中からレコードを探す
    for arg in &call.arguments {
        if let Some(preview) = extract_preview_from_expr(&arg.value) {
            return Some(preview);
        }
    }
    None
}

fn extract_preview_from_expr(expr: &Expression) -> Option<DetectedPreview> {
    if let Expression::TypeLiteral(record) = expr {
        extract_preview_from_record(record)
    } else {
        None
    }
}

fn extract_preview_from_record(record: &TypeLiteralExpression) -> Option<DetectedPreview> {
    let mut code = None;
    let mut handler_expression = None;

    for item in &record.items {
        if &*item.key == "code" {
            if let Expression::String(s) = &*item.value {
                code = Some(s.value.to_string());
            }
        } else if &*item.key == "handler" {
            handler_expression = Some((*item.value).clone());
        }
    }

    let code = code?.trim().to_lowercase();
    if code.is_empty() || handler_expression.is_none() {
        return None;
    }

    Some(DetectedPreview {
        code,
        handler_expression,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use definy_event::event::{
        CallArgument, CallExpression, PartReferenceExpression, StringExpression,
        TypeLiteralItemExpression, VariableExpression,
    };

    #[test]
    fn test_detect_preview_from_direct_call() {
        let preview_call = Expression::Call(CallExpression {
            function: Box::new(Expression::PartReference(PartReferenceExpression {
                part_definition_event_hash: definy_event::EventHashId::from_bytes(&[1u8; 32]),
                content_hash: None,
            })),
            arguments: vec![CallArgument {
                name: "config".into(),
                value: Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                    items: vec![
                        TypeLiteralItemExpression {
                            key: "code".into(),
                            value: Box::new(Expression::String(StringExpression {
                                value: "my-web-app".into(),
                            })),
                        },
                        TypeLiteralItemExpression {
                            key: "handler".into(),
                            value: Box::new(Expression::Variable(VariableExpression {
                                variable_id: 42,
                            })),
                        },
                    ],
                })),
            }],
        });

        let detected = detect_preview_in_expression(&preview_call).expect("Must detect preview");
        assert_eq!(detected.code, "my-web-app");
        assert!(detected.handler_expression.is_some());
    }
}

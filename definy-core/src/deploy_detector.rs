//! definy の式 (Expression) 内から Cloudflare Workers デプロイ (`definy:deploy`) の呼び出しを検出するモジュール。

use definy_event::event::{CallExpression, Expression, TypeLiteralExpression};

/// 検出された Cloudflare Workers デプロイ設定
#[derive(Clone, Debug, PartialEq)]
pub struct DetectedDeploy {
    /// Cloudflare API トークン (指定されている場合)
    pub cloudflare_token: Option<String>,
    /// Cloudflare Workers スクリプト名 (例: "my-worker")
    pub cloudflare_worker_name: String,
    /// HTTP リクエストを受け取ってレスポンスを返すハンドラ式
    pub handler_expression: Option<Expression>,
}

/// 式の中から `deploy({ cloudflareToken: String, cloudflareWorkerName: String, handler: HttpRequest -> HttpResponse })`
/// の呼び出しまたは設定レコードを探索します。
#[must_use]
pub fn detect_deploy_in_expression(expr: &Expression) -> Option<DetectedDeploy> {
    // 1. 直接 Call 式またはレコード式からデプロイ設定を抽出
    if let Some(detected) = match expr {
        Expression::Call(call) => extract_deploy_from_call(call),
        Expression::TypeLiteral(record) => extract_deploy_from_record(record),
        _ => None,
    } {
        return Some(detected);
    }

    // 2. 子ノードの再帰的探索 (Let 式, If 式, Function 式など)
    match expr {
        Expression::Let(let_expr) => detect_deploy_in_expression(&let_expr.body)
            .or_else(|| detect_deploy_in_expression(&let_expr.value)),
        Expression::If(if_expr) => detect_deploy_in_expression(&if_expr.then_expr)
            .or_else(|| detect_deploy_in_expression(&if_expr.else_expr)),
        Expression::Function(fn_expr) => detect_deploy_in_expression(&fn_expr.body),
        Expression::Call(call) => detect_deploy_in_expression(&call.function).or_else(|| {
            for arg in &call.arguments {
                if let Some(d) = detect_deploy_in_expression(&arg.value) {
                    return Some(d);
                }
            }
            None
        }),
        Expression::Match(match_expr) => {
            for arm in &match_expr.arms {
                if let Some(d) = detect_deploy_in_expression(&arm.body) {
                    return Some(d);
                }
            }
            match_expr
                .default
                .as_ref()
                .and_then(|def| detect_deploy_in_expression(def))
        }
        _ => None,
    }
}

fn extract_deploy_from_call(call: &CallExpression) -> Option<DetectedDeploy> {
    for arg in &call.arguments {
        if let Some(deploy) = extract_deploy_from_expr(&arg.value) {
            return Some(deploy);
        }
    }
    None
}

fn extract_deploy_from_expr(expr: &Expression) -> Option<DetectedDeploy> {
    if let Expression::TypeLiteral(record) = expr {
        extract_deploy_from_record(record)
    } else {
        None
    }
}

fn extract_deploy_from_record(record: &TypeLiteralExpression) -> Option<DetectedDeploy> {
    let mut cloudflare_token = None;
    let mut cloudflare_worker_name = None;
    let mut handler_expression = None;

    for item in &record.items {
        let key = &*item.key;
        if key == "cloudflareToken" || key == "cloudflare_token" || key == "token" {
            if let Expression::String(s) = &*item.value {
                cloudflare_token = Some(s.value.to_string());
            }
        } else if key == "cloudflareWorkerName"
            || key == "cloudflare_worker_name"
            || key == "workerName"
            || key == "worker_name"
            || key == "scriptName"
            || key == "script_name"
        {
            if let Expression::String(s) = &*item.value {
                cloudflare_worker_name = Some(s.value.to_string());
            }
        } else if key == "handler" {
            handler_expression = Some((*item.value).clone());
        }
    }

    let worker_name = cloudflare_worker_name?.trim().to_string();
    if worker_name.is_empty() {
        return None;
    }

    Some(DetectedDeploy {
        cloudflare_token,
        cloudflare_worker_name: worker_name,
        handler_expression,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use definy_event::event::{
        CallArgument, PartReferenceExpression, StringExpression, TypeLiteralItemExpression,
        VariableExpression,
    };

    #[test]
    fn test_detect_deploy_from_direct_call() {
        let call = Expression::Call(CallExpression {
            function: Box::new(Expression::PartReference(PartReferenceExpression {
                part_definition_event_hash: definy_event::EventHashId::from_bytes(&[2u8; 32]),
                content_hash: None,
            })),
            arguments: vec![CallArgument {
                name: "config".into(),
                value: Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                    items: vec![
                        TypeLiteralItemExpression {
                            key: "cloudflareToken".into(),
                            value: Box::new(Expression::String(StringExpression {
                                value: "secret-token-123".into(),
                            })),
                        },
                        TypeLiteralItemExpression {
                            key: "cloudflareWorkerName".into(),
                            value: Box::new(Expression::String(StringExpression {
                                value: "my-edge-app".into(),
                            })),
                        },
                        TypeLiteralItemExpression {
                            key: "handler".into(),
                            value: Box::new(Expression::Variable(VariableExpression {
                                variable_id: 1,
                            })),
                        },
                    ],
                })),
            }],
        });

        let detected = detect_deploy_in_expression(&call).expect("should detect deploy");
        assert_eq!(detected.cloudflare_worker_name, "my-edge-app");
        assert_eq!(
            detected.cloudflare_token,
            Some("secret-token-123".to_string())
        );
        assert!(detected.handler_expression.is_some());
    }
}

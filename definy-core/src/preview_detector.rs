//! definy の式 (Expression) 内から Web アプリケーション プレビュー (`definy:preview`) の呼び出しを検出するモジュール。

use definy_event::event::{CallExpression, Expression, TypeLiteralExpression};

/// プレビューコード (サブドメイン名) のバリデーションエラー
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum PreviewCodeValidationError {
    /// 空文字
    Empty,
    /// 63文字を超えている
    TooLong { len: usize, max: usize },
    /// 英数字・ハイフン以外の文字が含まれている
    InvalidCharacter { ch: char, index: usize },
    /// 先頭がハイフンで始まっている
    StartsWithHyphen,
    /// 末尾がハイフンで終わっている
    EndsWithHyphen,
}

impl std::fmt::Display for PreviewCodeValidationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Empty => write!(f, "preview code cannot be empty"),
            Self::TooLong { len, max } => {
                write!(
                    f,
                    "preview code is too long ({len} characters, maximum is {max})"
                )
            }
            Self::InvalidCharacter { ch, index } => {
                write!(
                    f,
                    "invalid character '{ch}' at index {index}; only lowercase alphanumeric (a-z, 0-9) and hyphens (-) are allowed in subdomains"
                )
            }
            Self::StartsWithHyphen => write!(f, "preview code cannot start with a hyphen (-)"),
            Self::EndsWithHyphen => write!(f, "preview code cannot end with a hyphen (-)"),
        }
    }
}

impl std::error::Error for PreviewCodeValidationError {}

/// RFC 1123 サブドメイン規則に準拠したプレビューコードかを検証します。
pub fn validate_preview_code(code: &str) -> Result<(), PreviewCodeValidationError> {
    if code.is_empty() {
        return Err(PreviewCodeValidationError::Empty);
    }
    if code.len() > 63 {
        return Err(PreviewCodeValidationError::TooLong {
            len: code.len(),
            max: 63,
        });
    }
    if code.starts_with('-') {
        return Err(PreviewCodeValidationError::StartsWithHyphen);
    }
    if code.ends_with('-') {
        return Err(PreviewCodeValidationError::EndsWithHyphen);
    }
    for (index, ch) in code.chars().enumerate() {
        if !ch.is_ascii_lowercase() && !ch.is_ascii_digit() && ch != '-' {
            return Err(PreviewCodeValidationError::InvalidCharacter { ch, index });
        }
    }
    Ok(())
}

/// プレビューコードが有効な RFC 1123 サブドメイン文字列であるかを判定します。
#[must_use]
pub fn is_valid_preview_code(code: &str) -> bool {
    validate_preview_code(code).is_ok()
}

/// 検出された Web アプリケーション プレビュー設定
#[derive(Clone, Debug, PartialEq)]
pub struct DetectedPreview {
    /// サブドメインまたはパスプレフィックス用のコード (例: "my-app")
    pub code: String,
    /// HTTP リクエストを受け取ってレスポンスを返すハンドラ式
    pub handler_expression: Option<Expression>,
    /// RFC 1123 サブドメインコードとしての検証エラー (正常な場合は None)
    pub validation_error: Option<PreviewCodeValidationError>,
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
        Expression::Let(let_expr) => detect_preview_in_expression(&let_expr.body).or_else(|| {
            let_expr
                .bindings
                .iter()
                .find_map(|b| detect_preview_in_expression(&b.value))
        }),
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

    let validation_error = validate_preview_code(&code).err();

    Some(DetectedPreview {
        code,
        handler_expression,
        validation_error,
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
    fn test_validate_preview_code() {
        assert_eq!(validate_preview_code("my-app"), Ok(()));
        assert_eq!(validate_preview_code("app123"), Ok(()));
        assert_eq!(validate_preview_code("a"), Ok(()));
        assert_eq!(
            validate_preview_code(""),
            Err(PreviewCodeValidationError::Empty)
        );
        assert_eq!(
            validate_preview_code("-app"),
            Err(PreviewCodeValidationError::StartsWithHyphen)
        );
        assert_eq!(
            validate_preview_code("app-"),
            Err(PreviewCodeValidationError::EndsWithHyphen)
        );
        assert!(matches!(
            validate_preview_code("app.invalid"),
            Err(PreviewCodeValidationError::InvalidCharacter { ch: '.', index: 3 })
        ));
        assert!(matches!(
            validate_preview_code("my_app"),
            Err(PreviewCodeValidationError::InvalidCharacter { ch: '_', index: 2 })
        ));
        let too_long = "a".repeat(64);
        assert_eq!(
            validate_preview_code(&too_long),
            Err(PreviewCodeValidationError::TooLong { len: 64, max: 63 })
        );
    }

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
        assert_eq!(detected.validation_error, None);
    }

    #[test]
    fn test_detect_preview_with_invalid_code() {
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
                                value: "invalid_under_score".into(),
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
        assert_eq!(detected.code, "invalid_under_score");
        assert!(detected.validation_error.is_some());
    }
}

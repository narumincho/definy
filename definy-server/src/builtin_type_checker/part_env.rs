use crate::ast_builder::{call_part, fn_expr, fn_type};
use definy_event::EventHashId;
use definy_event::event::{
    Description, EqualExpression, Expression, IfExpression, LessThanExpression, ListGetExpression,
    ListLengthExpression, ModulePartEntry, NumberExpression, PartReferenceExpression, PartType,
    RecordFieldType, RecordGetExpression, SubtractExpression, TypeListExpression,
    TypeLiteralExpression, TypeLiteralItemExpression, VariableExpression, derive_module_part_id,
};

use super::helpers::{error_part_not_found, ok_type};

/// モジュール内のパーツ型定義を保持する環境の型 (`core.part-type-env`)
pub fn create_part_type_env_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let type_ast_hash = derive_module_part_id(core_module_id, "type-ast");
    let type_ast_ref = Expression::PartReference(PartReferenceExpression::new(type_ast_hash));

    ModulePartEntry {
        name: "part-type-env".into(),
        part_type: Some(PartType::Type),
        description: Description::localized(vec![
            (
                "en",
                "Module-level part type environment mapping part definition hashes to types",
            ),
            (
                "ja",
                "パーツ定義ハッシュと型の対応を保持するモジュール型環境",
            ),
        ]),
        content_hash: None,
        expression: Some(Expression::TypeList(TypeListExpression {
            item_type: Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                items: vec![
                    TypeLiteralItemExpression {
                        key: "part_definition_event_hash".into(),
                        value: Box::new(Expression::TypeString),
                    },
                    TypeLiteralItemExpression {
                        key: "part_type".into(),
                        value: Box::new(type_ast_ref),
                    },
                ],
            })),
        })),
    }
}

/// `core.part-type-lookup`: `(env: part-type-env, part_hash: string) -> type-result`
/// モジュール型環境から指定されたパーツハッシュの宣言型を検索します。
pub fn create_part_type_lookup_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let part_type_env_hash = derive_module_part_id(core_module_id, "part-type-env");
    let type_result_hash = derive_module_part_id(core_module_id, "type-result");
    let inner_hash = derive_module_part_id(core_module_id, "part-type-lookup-inner");

    let body = fn_expr(
        &[("env", 0), ("part_hash", 1)],
        call_part(
            &inner_hash,
            &[
                (
                    "env",
                    Expression::Variable(VariableExpression { variable_id: 0 }),
                ),
                (
                    "part_hash",
                    Expression::Variable(VariableExpression { variable_id: 1 }),
                ),
                (
                    "index",
                    Expression::Subtract(SubtractExpression {
                        left: Box::new(Expression::ListLength(ListLengthExpression {
                            value: Box::new(Expression::Variable(VariableExpression {
                                variable_id: 0,
                            })),
                        })),
                        right: Box::new(Expression::Number(NumberExpression { value: 1 })),
                    }),
                ),
            ],
        ),
    );

    ModulePartEntry {
        name: "part-type-lookup".into(),
        part_type: Some(fn_type(
            &[
                ("env", PartType::TypePart(part_type_env_hash)),
                ("part_hash", PartType::String),
            ],
            PartType::TypePart(type_result_hash),
        )),
        description: Description::localized(vec![
            (
                "en",
                "Lookup declared type of a part in the module part type environment",
            ),
            ("ja", "モジュール型環境からパーツの宣言型を検索"),
        ]),
        content_hash: None,
        expression: Some(body),
    }
}

/// `core.part-type-lookup-inner`: `(env: part-type-env, part_hash: string, index: number) -> type-result`
/// 末尾から先頭へ線形走査して指定パーツハッシュを検索する再帰ヘルパーです。
pub fn create_part_type_lookup_inner_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let type_result_hash = derive_module_part_id(core_module_id, "type-result");
    let inner_hash = derive_module_part_id(core_module_id, "part-type-lookup-inner");

    let at_end = Expression::LessThan(LessThanExpression {
        left: Box::new(Expression::Variable(VariableExpression { variable_id: 2 })),
        right: Box::new(Expression::Number(NumberExpression { value: 0 })),
    });

    let current_entry = Expression::ListGet(ListGetExpression {
        list: Box::new(Expression::Variable(VariableExpression { variable_id: 0 })),
        index: Box::new(Expression::Variable(VariableExpression { variable_id: 2 })),
    });
    let current_hash = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_entry.clone()),
        key: "part_definition_event_hash".into(),
    });
    let current_type = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_entry),
        key: "part_type".into(),
    });

    let hash_matches = Expression::Equal(EqualExpression {
        left: Box::new(current_hash),
        right: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
    });

    let recurse = call_part(
        &inner_hash,
        &[
            (
                "env",
                Expression::Variable(VariableExpression { variable_id: 0 }),
            ),
            (
                "part_hash",
                Expression::Variable(VariableExpression { variable_id: 1 }),
            ),
            (
                "index",
                Expression::Subtract(SubtractExpression {
                    left: Box::new(Expression::Variable(VariableExpression { variable_id: 2 })),
                    right: Box::new(Expression::Number(NumberExpression { value: 1 })),
                }),
            ),
        ],
    );

    let not_found_error =
        error_part_not_found(Expression::Variable(VariableExpression { variable_id: 1 }));

    let body = Expression::If(IfExpression {
        condition: Box::new(at_end),
        then_expr: Box::new(not_found_error),
        else_expr: Box::new(Expression::If(IfExpression {
            condition: Box::new(hash_matches),
            then_expr: Box::new(ok_type(current_type)),
            else_expr: Box::new(recurse),
        })),
    });

    let entry_type = PartType::Record(vec![
        RecordFieldType {
            key: "part_definition_event_hash".into(),
            value: Box::new(PartType::String),
        },
        RecordFieldType {
            key: "part_type".into(),
            value: Box::new(PartType::TypePart(derive_module_part_id(
                core_module_id,
                "type-ast",
            ))),
        },
    ]);

    ModulePartEntry {
        name: "part-type-lookup-inner".into(),
        part_type: Some(fn_type(
            &[
                ("env", PartType::List(Box::new(entry_type))),
                ("part_hash", PartType::String),
                ("index", PartType::Number),
            ],
            PartType::TypePart(type_result_hash),
        )),
        description: Description::localized(vec![
            ("en", "Inner recursive helper for part-type-lookup"),
            ("ja", "part-type-lookup の再帰用内部ヘルパー"),
        ]),
        content_hash: None,
        expression: Some(fn_expr(&[("env", 0), ("part_hash", 1), ("index", 2)], body)),
    }
}

/// `core.type-env-lookup-part`: `(env: type-env, part_hash: string) -> type-result`
/// `type-env` レコードから `parts` リストを取り出し、指定パーツハッシュの宣言型を検索します。
pub fn create_type_env_lookup_part_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let type_env_part_hash = derive_module_part_id(core_module_id, "type-env");
    let type_result_hash = derive_module_part_id(core_module_id, "type-result");
    let part_type_lookup_hash = derive_module_part_id(core_module_id, "part-type-lookup");

    let parts_expr = Expression::RecordGet(RecordGetExpression {
        record: Box::new(Expression::Variable(VariableExpression { variable_id: 0 })),
        key: "parts".into(),
    });

    let lookup_call = call_part(
        &part_type_lookup_hash,
        &[
            ("env", parts_expr),
            (
                "part_hash",
                Expression::Variable(VariableExpression { variable_id: 1 }),
            ),
        ],
    );

    let body = fn_expr(&[("env", 0), ("part_hash", 1)], lookup_call);

    ModulePartEntry {
        name: "type-env-lookup-part".into(),
        part_type: Some(fn_type(
            &[
                ("env", PartType::TypePart(type_env_part_hash)),
                ("part_hash", PartType::String),
            ],
            PartType::TypePart(type_result_hash),
        )),
        description: Description::localized(vec![
            (
                "en",
                "Lookup declared type of a part in the type environment",
            ),
            ("ja", "型環境からパーツの宣言型を検索"),
        ]),
        content_hash: None,
        expression: Some(body),
    }
}

use definy_event::EventHashId;
use definy_event::event::{
    AddExpression, BooleanExpression, CallExpression, Description, Expression, FunctionExpression,
    IfExpression, LessThanExpression, LessThanOrEqualExpression, ListAppendExpression,
    ListGetExpression, ListLengthExpression, ListLiteralExpression, MatchArm, MatchExpression,
    ModulePartEntry, NumberExpression, PartReferenceExpression, PartType, RecordGetExpression,
    StringLengthExpression, SubtractExpression, TypeLiteralExpression, TypeLiteralItemExpression,
    VariableExpression, derive_module_part_id,
};

/// `core.collect-part-type-env-inner`: `list<part-definition> -> number -> part-type-env`
/// パーツ定義リストを末尾から先頭へ走査し、各パーツの `{ part_definition_event_hash, part_type }` を蓄積する再帰ヘルパー。
pub fn create_collect_part_type_env_inner_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let part_def_hash = derive_module_part_id(core_module_id, "part-definition");
    let part_type_env_hash = derive_module_part_id(core_module_id, "part-type-env");
    let inner_hash = derive_module_part_id(core_module_id, "collect-part-type-env-inner");

    let at_end = Expression::LessThan(LessThanExpression {
        left: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
        right: Box::new(Expression::Number(NumberExpression { value: 0 })),
    });

    let current_part = Expression::ListGet(ListGetExpression {
        list: Box::new(Expression::Variable(VariableExpression { variable_id: 0 })),
        index: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
    });

    let current_entry = Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "part_definition_event_hash".into(),
                value: Box::new(Expression::RecordGet(RecordGetExpression {
                    record: Box::new(current_part.clone()),
                    key: "part_definition_event_hash".into(),
                })),
            },
            TypeLiteralItemExpression {
                key: "part_type".into(),
                value: Box::new(Expression::RecordGet(RecordGetExpression {
                    record: Box::new(current_part),
                    key: "part_type".into(),
                })),
            },
        ],
    });

    let recurse_prev = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                inner_hash,
            ))),
            argument: Box::new(Expression::Variable(VariableExpression { variable_id: 0 })),
        })),
        argument: Box::new(Expression::Subtract(SubtractExpression {
            left: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
            right: Box::new(Expression::Number(NumberExpression { value: 1 })),
        })),
    });

    let appended = Expression::ListAppend(ListAppendExpression {
        list: Box::new(recurse_prev),
        item: Box::new(current_entry),
    });

    let body = Expression::If(IfExpression {
        condition: Box::new(at_end),
        then_expr: Box::new(Expression::ListLiteral(ListLiteralExpression {
            items: vec![],
        })),
        else_expr: Box::new(appended),
    });

    let main_expr = Expression::Function(FunctionExpression {
        parameter_id: 0,
        parameter_name: "parts".into(),
        body: Box::new(Expression::Function(FunctionExpression {
            parameter_id: 1,
            parameter_name: "index".into(),
            body: Box::new(body),
        })),
    });

    ModulePartEntry {
        name: "collect-part-type-env-inner".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::List(Box::new(PartType::TypePart(part_def_hash)))),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::Number),
                return_type: Box::new(PartType::TypePart(part_type_env_hash)),
            }),
        }),
        description: Description::localized(vec![
            (
                "en",
                "Inner recursive helper to collect part type environment from part definitions",
            ),
            (
                "ja",
                "パーツ定義リストからパーツ型環境を再帰構築する内部ヘルパー",
            ),
        ]),
        content_hash: None,
        expression: Some(main_expr),
    }
}

/// `core.collect-part-type-env`: `list<part-definition> -> part-type-env`
/// パーツ定義リスト全体を走査してパーツ型環境（`part-type-env`）を構築します。
pub fn create_collect_part_type_env_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let part_def_hash = derive_module_part_id(core_module_id, "part-definition");
    let part_type_env_hash = derive_module_part_id(core_module_id, "part-type-env");
    let inner_hash = derive_module_part_id(core_module_id, "collect-part-type-env-inner");

    let parts_expr = Expression::Variable(VariableExpression { variable_id: 0 });
    let max_index = Expression::Subtract(SubtractExpression {
        left: Box::new(Expression::ListLength(ListLengthExpression {
            value: Box::new(parts_expr.clone()),
        })),
        right: Box::new(Expression::Number(NumberExpression { value: 1 })),
    });

    let body = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                inner_hash,
            ))),
            argument: Box::new(parts_expr),
        })),
        argument: Box::new(max_index),
    });

    let main_expr = Expression::Function(FunctionExpression {
        parameter_id: 0,
        parameter_name: "parts".into(),
        body: Box::new(body),
    });

    ModulePartEntry {
        name: "collect-part-type-env".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::List(Box::new(PartType::TypePart(part_def_hash)))),
            return_type: Box::new(PartType::TypePart(part_type_env_hash)),
        }),
        description: Description::localized(vec![
            (
                "en",
                "Collects module part type environment from part definitions list",
            ),
            ("ja", "パーツ定義リストからモジュール型環境を構築する関数"),
        ]),
        content_hash: None,
        expression: Some(main_expr),
    }
}

/// `core.validate-part-in-env`: `part-definition -> type-env -> boolean`
/// 指定した型環境（モジュール型環境を含む）を用いて、パーツの式が宣言された型と一致するかを自己検証します。
pub fn create_validate_part_in_env_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let part_def_hash = derive_module_part_id(core_module_id, "part-definition");
    let type_env_hash = derive_module_part_id(core_module_id, "type-env");
    let type_check_against_hash = derive_module_part_id(core_module_id, "type-check-against");

    let expr_access = Expression::RecordGet(RecordGetExpression {
        record: Box::new(Expression::Variable(VariableExpression { variable_id: 0 })),
        key: "expression".into(),
    });
    let declared_type_access = Expression::RecordGet(RecordGetExpression {
        record: Box::new(Expression::Variable(VariableExpression { variable_id: 0 })),
        key: "part_type".into(),
    });
    let env_access = Expression::Variable(VariableExpression { variable_id: 1 });

    // type-check-against(expr)(env)(declared_type)
    let check_call = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                    type_check_against_hash,
                ))),
                argument: Box::new(expr_access),
            })),
            argument: Box::new(env_access),
        })),
        argument: Box::new(declared_type_access),
    });

    let match_expr = Expression::Match(MatchExpression {
        target: Box::new(check_call),
        arms: vec![
            MatchArm {
                tag: "ok".into(),
                variable_id: Some(10),
                variable_name: Some("checked_type".into()),
                body: Box::new(Expression::Boolean(BooleanExpression { value: true })),
            },
            MatchArm {
                tag: "error".into(),
                variable_id: Some(11),
                variable_name: Some("err".into()),
                body: Box::new(Expression::Boolean(BooleanExpression { value: false })),
            },
            MatchArm {
                tag: "_".into(),
                variable_id: Some(99),
                variable_name: Some("_".into()),
                body: Box::new(Expression::Boolean(BooleanExpression { value: false })),
            },
        ],
        default: None,
    });

    let main_expr = Expression::Function(FunctionExpression {
        parameter_id: 0,
        parameter_name: "part".into(),
        body: Box::new(Expression::Function(FunctionExpression {
            parameter_id: 1,
            parameter_name: "env".into(),
            body: Box::new(match_expr),
        })),
    });

    ModulePartEntry {
        name: "validate-part-in-env".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::TypePart(part_def_hash)),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::TypePart(type_env_hash)),
                return_type: Box::new(PartType::Boolean),
            }),
        }),
        description: Description::localized(vec![
            (
                "en",
                "Validates that a part matches its declared type within a given type environment",
            ),
            (
                "ja",
                "与えられた型環境のもとでパーツ定義の式が宣言された型と一致するか検証する関数",
            ),
        ]),
        content_hash: None,
        expression: Some(main_expr),
    }
}

/// パーツ妥当性検証器 `core.validate-part`: `part-definition -> boolean`
/// 空の型環境でパーツの式が宣言された型と一致するかを自己検証します（単体パーツ用）。
pub fn create_validate_part_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let part_def_hash = derive_module_part_id(core_module_id, "part-definition");
    let validate_part_in_env_hash = derive_module_part_id(core_module_id, "validate-part-in-env");

    let empty_env = crate::builtin_type_checker::empty_type_env();

    let call_in_env = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                validate_part_in_env_hash,
            ))),
            argument: Box::new(Expression::Variable(VariableExpression { variable_id: 0 })),
        })),
        argument: Box::new(empty_env),
    });

    let main_expr = Expression::Function(FunctionExpression {
        parameter_id: 0,
        parameter_name: "part".into(),
        body: Box::new(call_in_env),
    });

    ModulePartEntry {
        name: "validate-part".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::TypePart(part_def_hash)),
            return_type: Box::new(PartType::Boolean),
        }),
        description: Description::localized(vec![
            (
                "en",
                "Validates that a part definition expression matches its declared type using the self-hosted type checker",
            ),
            (
                "ja",
                "自己記述型チェッカーを用いてパーツ定義の式が宣言された型と一致するか検証する関数",
            ),
        ]),
        content_hash: None,
        expression: Some(main_expr),
    }
}

/// `core.validate-parts-in-env`: `list<part-definition> -> type-env -> number -> boolean`
/// 指定型環境を用いてパーツ一覧を再帰走査し、全パーツが妥当であるかを検証します。
pub fn create_validate_parts_in_env_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let part_def_hash = derive_module_part_id(core_module_id, "part-definition");
    let type_env_hash = derive_module_part_id(core_module_id, "type-env");
    let validate_part_in_env_hash = derive_module_part_id(core_module_id, "validate-part-in-env");
    let validate_parts_in_env_hash = derive_module_part_id(core_module_id, "validate-parts-in-env");

    let parts = Expression::Variable(VariableExpression { variable_id: 0 });
    let env = Expression::Variable(VariableExpression { variable_id: 1 });
    let index = Expression::Variable(VariableExpression { variable_id: 2 });

    let at_end = Expression::LessThanOrEqual(LessThanOrEqualExpression {
        left: Box::new(Expression::ListLength(ListLengthExpression {
            value: Box::new(parts.clone()),
        })),
        right: Box::new(index.clone()),
    });

    let current_part = Expression::ListGet(ListGetExpression {
        list: Box::new(parts.clone()),
        index: Box::new(index.clone()),
    });

    let current_is_valid = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                validate_part_in_env_hash,
            ))),
            argument: Box::new(current_part),
        })),
        argument: Box::new(env.clone()),
    });

    let next_index = Expression::Add(AddExpression {
        left: Box::new(index),
        right: Box::new(Expression::Number(NumberExpression { value: 1 })),
    });

    let validate_rest = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                    validate_parts_in_env_hash,
                ))),
                argument: Box::new(parts),
            })),
            argument: Box::new(env),
        })),
        argument: Box::new(next_index),
    });

    let body = Expression::If(IfExpression {
        condition: Box::new(at_end),
        then_expr: Box::new(Expression::Boolean(BooleanExpression { value: true })),
        else_expr: Box::new(Expression::If(IfExpression {
            condition: Box::new(current_is_valid),
            then_expr: Box::new(validate_rest),
            else_expr: Box::new(Expression::Boolean(BooleanExpression { value: false })),
        })),
    });

    let main_expr = Expression::Function(FunctionExpression {
        parameter_id: 0,
        parameter_name: "parts".into(),
        body: Box::new(Expression::Function(FunctionExpression {
            parameter_id: 1,
            parameter_name: "env".into(),
            body: Box::new(Expression::Function(FunctionExpression {
                parameter_id: 2,
                parameter_name: "index".into(),
                body: Box::new(body),
            })),
        })),
    });

    ModulePartEntry {
        name: "validate-parts-in-env".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::List(Box::new(PartType::TypePart(part_def_hash)))),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::TypePart(type_env_hash)),
                return_type: Box::new(PartType::Function {
                    parameter: Box::new(PartType::Number),
                    return_type: Box::new(PartType::Boolean),
                }),
            }),
        }),
        description: Description::localized(vec![
            (
                "en",
                "Validates every part definition in a list under a given type environment",
            ),
            (
                "ja",
                "与えられた型環境のもとでパーツ定義リストの各要素を再帰検証する関数",
            ),
        ]),
        content_hash: None,
        expression: Some(main_expr),
    }
}

/// パーツ一覧を空の型環境で再帰的に検証する関数 `core.validate-parts`。
pub fn create_validate_parts_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let part_def_hash = derive_module_part_id(core_module_id, "part-definition");
    let validate_parts_in_env_hash = derive_module_part_id(core_module_id, "validate-parts-in-env");

    let empty_env = crate::builtin_type_checker::empty_type_env();

    let call_in_env = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                    validate_parts_in_env_hash,
                ))),
                argument: Box::new(Expression::Variable(VariableExpression { variable_id: 0 })),
            })),
            argument: Box::new(empty_env),
        })),
        argument: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
    });

    let main_expr = Expression::Function(FunctionExpression {
        parameter_id: 0,
        parameter_name: "parts".into(),
        body: Box::new(Expression::Function(FunctionExpression {
            parameter_id: 1,
            parameter_name: "index".into(),
            body: Box::new(call_in_env),
        })),
    });

    ModulePartEntry {
        name: "validate-parts".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::List(Box::new(PartType::TypePart(part_def_hash)))),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::Number),
                return_type: Box::new(PartType::Boolean),
            }),
        }),
        description: Description::localized(vec![
            ("en", "Validates every part definition in a list"),
            ("ja", "パーツ定義のリストを最後まで検証する関数"),
        ]),
        content_hash: None,
        expression: Some(main_expr),
    }
}

/// モジュール妥当性検証器 `core.validate-module`: `module-definition -> boolean`
/// モジュール名が非空であり、構成パーツから自動構築したモジュール型環境を用いて全パーツが相互型検証を満たすかを検証します。
pub fn create_validate_module_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let mod_def_hash = derive_module_part_id(core_module_id, "module-definition");
    let collect_part_type_env_hash = derive_module_part_id(core_module_id, "collect-part-type-env");
    let validate_parts_in_env_hash = derive_module_part_id(core_module_id, "validate-parts-in-env");

    let mod_var_id = 0;
    let name_access = Expression::RecordGet(RecordGetExpression {
        record: Box::new(Expression::Variable(VariableExpression {
            variable_id: mod_var_id,
        })),
        key: "name".into(),
    });
    let parts_access = Expression::RecordGet(RecordGetExpression {
        record: Box::new(Expression::Variable(VariableExpression {
            variable_id: mod_var_id,
        })),
        key: "parts".into(),
    });

    // name_len > 0 (0 < string_length(name))
    let name_len = Expression::StringLength(StringLengthExpression {
        value: Box::new(name_access),
    });
    let name_not_empty = Expression::LessThan(LessThanExpression {
        left: Box::new(Expression::Number(NumberExpression { value: 0 })),
        right: Box::new(name_len),
    });

    // collect-part-type-env(parts)
    let collected_parts = Expression::Call(CallExpression {
        function: Box::new(Expression::PartReference(PartReferenceExpression::new(
            collect_part_type_env_hash,
        ))),
        argument: Box::new(parts_access.clone()),
    });

    // module_type_env = { variables: [], parts: collected_parts }
    let module_type_env = Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "variables".into(),
                value: Box::new(Expression::ListLiteral(ListLiteralExpression {
                    items: vec![],
                })),
            },
            TypeLiteralItemExpression {
                key: "parts".into(),
                value: Box::new(collected_parts),
            },
        ],
    });

    // validate-parts-in-env(parts)(module_type_env)(0)
    let parts_valid = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                    validate_parts_in_env_hash,
                ))),
                argument: Box::new(parts_access),
            })),
            argument: Box::new(module_type_env),
        })),
        argument: Box::new(Expression::Number(NumberExpression { value: 0 })),
    });

    // if name_not_empty then parts_valid else false
    let body = Expression::If(IfExpression {
        condition: Box::new(name_not_empty),
        then_expr: Box::new(parts_valid),
        else_expr: Box::new(Expression::Boolean(BooleanExpression { value: false })),
    });

    let main_expr = Expression::Function(FunctionExpression {
        parameter_id: mod_var_id,
        parameter_name: "mod_def".into(),
        body: Box::new(body),
    });

    ModulePartEntry {
        name: "validate-module".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::TypePart(mod_def_hash)),
            return_type: Box::new(PartType::Boolean),
        }),
        description: Description::localized(vec![
            (
                "en",
                "Validates a module definition ensuring non-empty module name and mutually valid member parts",
            ),
            (
                "ja",
                "モジュール名が非空であり構成パーツがモジュール型環境のもとで相互型検証を満たすかを検証する関数",
            ),
        ]),
        content_hash: None,
        expression: Some(main_expr),
    }
}

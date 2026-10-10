//! definy の高階リスト操作関数 (`core.list-map`, `core.list-fold`) を定義するモジュール。
//!
//! 純粋関数型プログラミングにおける基本コレクション操作コンビネータを
//! definy 自身の式として自己記述します。

use definy_event::EventHashId;
use definy_event::event::{
    AddExpression, Description, Expression, IfExpression, LessThanOrEqualExpression,
    ListAppendExpression, ListGetExpression, ListLengthExpression, ListLiteralExpression,
    ModulePartEntry, NumberExpression, PartType, VariableExpression, derive_module_part_id,
};

use crate::ast_builder::{call_expr, call_part, fn_expr, fn_type};

/// リストの各要素に関数を適用して新しいリストを構築する高階関数 (`core.list-map`)
/// `(f: (item: Number) -> Number, xs: List<Number>) -> List<Number>`
pub fn create_list_map_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let list_map_inner_hash = derive_module_part_id(core_module_id, "list-map-inner");
    let empty_list = Expression::ListLiteral(ListLiteralExpression { items: vec![] });

    // list-map(f: f, xs: xs) = list-map-inner(f: f, xs: xs, idx: 0, acc: list[])
    let body = fn_expr(
        &[("f", 0), ("xs", 1)],
        call_part(
            list_map_inner_hash,
            &[
                (
                    "f",
                    Expression::Variable(VariableExpression { variable_id: 0 }),
                ),
                (
                    "xs",
                    Expression::Variable(VariableExpression { variable_id: 1 }),
                ),
                ("idx", Expression::Number(NumberExpression { value: 0 })),
                ("acc", empty_list),
            ],
        ),
    );

    let func_param_type = fn_type(&[("item", PartType::Number)], PartType::Number);

    ModulePartEntry {
        name: "list-map".into(),
        part_type: Some(fn_type(
            &[
                ("f", func_param_type),
                ("xs", PartType::List(Box::new(PartType::Number))),
            ],
            PartType::List(Box::new(PartType::Number)),
        )),
        description: Description::localized(vec![
            (
                "en",
                "Apply a function to each item of a list (higher-order map)",
            ),
            (
                "ja",
                "リストの各要素に関数を適用して新しいリストを返す高階関数 (list-map)",
            ),
        ]),
        content_hash: None,
        expression: Some(body),
    }
}

/// `core.list-map-inner`: `(f, xs, idx, acc) -> List<Number>`
pub fn create_list_map_inner_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let list_map_inner_hash = derive_module_part_id(core_module_id, "list-map-inner");

    // current_item = list_get(xs, idx)
    let current_item = Expression::ListGet(ListGetExpression {
        list: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
        index: Box::new(Expression::Variable(VariableExpression { variable_id: 2 })),
    });

    // mapped_item = f(item: current_item)
    let mapped_item = call_expr(
        Expression::Variable(VariableExpression { variable_id: 0 }),
        &[("item", current_item)],
    );

    // new_acc = list_append(acc, mapped_item)
    let new_acc = Expression::ListAppend(ListAppendExpression {
        list: Box::new(Expression::Variable(VariableExpression { variable_id: 3 })),
        item: Box::new(mapped_item),
    });

    // recurse: list-map-inner(f: f, xs: xs, idx: idx + 1, acc: new_acc)
    let recurse_call = call_part(
        list_map_inner_hash,
        &[
            (
                "f",
                Expression::Variable(VariableExpression { variable_id: 0 }),
            ),
            (
                "xs",
                Expression::Variable(VariableExpression { variable_id: 1 }),
            ),
            (
                "idx",
                Expression::Add(AddExpression {
                    left: Box::new(Expression::Variable(VariableExpression { variable_id: 2 })),
                    right: Box::new(Expression::Number(NumberExpression { value: 1 })),
                }),
            ),
            ("acc", new_acc),
        ],
    );

    // if idx >= list_length(xs) then acc else recurse_call
    let body_cond = Expression::If(IfExpression {
        condition: Box::new(Expression::LessThanOrEqual(LessThanOrEqualExpression {
            left: Box::new(Expression::ListLength(ListLengthExpression {
                value: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
            })),
            right: Box::new(Expression::Variable(VariableExpression { variable_id: 2 })),
        })),
        then_expr: Box::new(Expression::Variable(VariableExpression { variable_id: 3 })),
        else_expr: Box::new(recurse_call),
    });

    let body = fn_expr(&[("f", 0), ("xs", 1), ("idx", 2), ("acc", 3)], body_cond);

    let func_param_type = fn_type(&[("item", PartType::Number)], PartType::Number);

    ModulePartEntry {
        name: "list-map-inner".into(),
        part_type: Some(fn_type(
            &[
                ("f", func_param_type),
                ("xs", PartType::List(Box::new(PartType::Number))),
                ("idx", PartType::Number),
                ("acc", PartType::List(Box::new(PartType::Number))),
            ],
            PartType::List(Box::new(PartType::Number)),
        )),
        description: Description::localized(vec![
            ("en", "Internal recursive accumulator for list-map"),
            ("ja", "list-map の再帰アキュムレータ内部ヘルパー"),
        ]),
        content_hash: None,
        expression: Some(body),
    }
}

/// リストを先頭から畳み込んで単一の値を計算する高階関数 (`core.list-fold`)
/// `(reducer: (acc: Number, item: Number) -> Number, init: Number, xs: List<Number>) -> Number`
pub fn create_list_fold_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let list_fold_inner_hash = derive_module_part_id(core_module_id, "list-fold-inner");

    // list-fold(reducer: reducer, init: init, xs: xs) = list-fold-inner(reducer: reducer, xs: xs, idx: 0, acc: init)
    let body = fn_expr(
        &[("reducer", 0), ("init", 1), ("xs", 2)],
        call_part(
            list_fold_inner_hash,
            &[
                (
                    "reducer",
                    Expression::Variable(VariableExpression { variable_id: 0 }),
                ),
                (
                    "xs",
                    Expression::Variable(VariableExpression { variable_id: 2 }),
                ),
                ("idx", Expression::Number(NumberExpression { value: 0 })),
                (
                    "acc",
                    Expression::Variable(VariableExpression { variable_id: 1 }),
                ),
            ],
        ),
    );

    let reducer_param_type = fn_type(
        &[("acc", PartType::Number), ("item", PartType::Number)],
        PartType::Number,
    );

    ModulePartEntry {
        name: "list-fold".into(),
        part_type: Some(fn_type(
            &[
                ("reducer", reducer_param_type),
                ("init", PartType::Number),
                ("xs", PartType::List(Box::new(PartType::Number))),
            ],
            PartType::Number,
        )),
        description: Description::localized(vec![
            (
                "en",
                "Fold a list from left to right with an accumulator function (higher-order fold)",
            ),
            (
                "ja",
                "リストを初期値と結合関数で左から畳み込む高階関数 (list-fold)",
            ),
        ]),
        content_hash: None,
        expression: Some(body),
    }
}

/// `core.list-fold-inner`: `(reducer, xs, idx, acc) -> Number`
pub fn create_list_fold_inner_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let list_fold_inner_hash = derive_module_part_id(core_module_id, "list-fold-inner");

    // current_item = list_get(xs, idx)
    let current_item = Expression::ListGet(ListGetExpression {
        list: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
        index: Box::new(Expression::Variable(VariableExpression { variable_id: 2 })),
    });

    // new_acc = reducer(acc: acc, item: current_item)
    let new_acc = call_expr(
        Expression::Variable(VariableExpression { variable_id: 0 }),
        &[
            (
                "acc",
                Expression::Variable(VariableExpression { variable_id: 3 }),
            ),
            ("item", current_item),
        ],
    );

    // recurse: list-fold-inner(reducer: reducer, xs: xs, idx: idx + 1, acc: new_acc)
    let recurse_call = call_part(
        list_fold_inner_hash,
        &[
            (
                "reducer",
                Expression::Variable(VariableExpression { variable_id: 0 }),
            ),
            (
                "xs",
                Expression::Variable(VariableExpression { variable_id: 1 }),
            ),
            (
                "idx",
                Expression::Add(AddExpression {
                    left: Box::new(Expression::Variable(VariableExpression { variable_id: 2 })),
                    right: Box::new(Expression::Number(NumberExpression { value: 1 })),
                }),
            ),
            ("acc", new_acc),
        ],
    );

    // if idx >= list_length(xs) then acc else recurse_call
    let body_cond = Expression::If(IfExpression {
        condition: Box::new(Expression::LessThanOrEqual(LessThanOrEqualExpression {
            left: Box::new(Expression::ListLength(ListLengthExpression {
                value: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
            })),
            right: Box::new(Expression::Variable(VariableExpression { variable_id: 2 })),
        })),
        then_expr: Box::new(Expression::Variable(VariableExpression { variable_id: 3 })),
        else_expr: Box::new(recurse_call),
    });

    let body = fn_expr(
        &[("reducer", 0), ("xs", 1), ("idx", 2), ("acc", 3)],
        body_cond,
    );

    let reducer_param_type = fn_type(
        &[("acc", PartType::Number), ("item", PartType::Number)],
        PartType::Number,
    );

    ModulePartEntry {
        name: "list-fold-inner".into(),
        part_type: Some(fn_type(
            &[
                ("reducer", reducer_param_type),
                ("xs", PartType::List(Box::new(PartType::Number))),
                ("idx", PartType::Number),
                ("acc", PartType::Number),
            ],
            PartType::Number,
        )),
        description: Description::localized(vec![
            ("en", "Internal recursive accumulator for list-fold"),
            ("ja", "list-fold の再帰アキュムレータ内部ヘルパー"),
        ]),
        content_hash: None,
        expression: Some(body),
    }
}

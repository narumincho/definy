//! definy の高階リスト操作関数 (`core.list-map`, `core.list-fold`) を定義するモジュール。
//!
//! 純粋関数型プログラミングにおける基本コレクション操作コンビネータを
//! definy 自身の式として自己記述します。

use definy_event::EventHashId;
use definy_event::event::{
    AddExpression, CallExpression, Description, Expression, FunctionExpression, IfExpression,
    LessThanOrEqualExpression, ListAppendExpression, ListGetExpression, ListLengthExpression,
    ListLiteralExpression, ModulePartEntry, NumberExpression, PartReferenceExpression, PartType,
    VariableExpression, derive_module_part_id,
};

/// リストの各要素に関数を適用して新しいリストを構築する高階関数 (`core.list-map`)
/// `(a -> b) -> list<a> -> list<b>`
pub fn create_list_map_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let list_map_inner_hash = derive_module_part_id(core_module_id, "list-map-inner");

    // list-map(f)(xs) = list-map-inner(f)(xs)(0)(list[])
    let empty_list = Expression::ListLiteral(ListLiteralExpression { items: vec![] });

    let body = Expression::Function(FunctionExpression {
        parameter_id: 0,
        parameter_name: "f".into(),
        body: Box::new(Expression::Function(FunctionExpression {
            parameter_id: 1,
            parameter_name: "xs".into(),
            body: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::Call(CallExpression {
                    function: Box::new(Expression::Call(CallExpression {
                        function: Box::new(Expression::Call(CallExpression {
                            function: Box::new(Expression::PartReference(
                                PartReferenceExpression::new(list_map_inner_hash),
                            )),
                            argument: Box::new(Expression::Variable(VariableExpression {
                                variable_id: 0,
                            })),
                        })),
                        argument: Box::new(Expression::Variable(VariableExpression {
                            variable_id: 1,
                        })),
                    })),
                    argument: Box::new(Expression::Number(NumberExpression { value: 0 })),
                })),
                argument: Box::new(empty_list),
            })),
        })),
    });

    ModulePartEntry {
        name: "list-map".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::Function {
                parameter: Box::new(PartType::Number),
                return_type: Box::new(PartType::Number),
            }),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::List(Box::new(PartType::Number))),
                return_type: Box::new(PartType::List(Box::new(PartType::Number))),
            }),
        }),
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

/// `core.list-map-inner`: `f -> xs -> idx -> acc -> list`
pub fn create_list_map_inner_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let list_map_inner_hash = derive_module_part_id(core_module_id, "list-map-inner");

    // current_item = list_get(xs, idx)
    let current_item = Expression::ListGet(ListGetExpression {
        list: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
        index: Box::new(Expression::Variable(VariableExpression { variable_id: 2 })),
    });

    // mapped_item = f(current_item)
    let mapped_item = Expression::Call(CallExpression {
        function: Box::new(Expression::Variable(VariableExpression { variable_id: 0 })),
        argument: Box::new(current_item),
    });

    // new_acc = list_append(acc, mapped_item)
    let new_acc = Expression::ListAppend(ListAppendExpression {
        list: Box::new(Expression::Variable(VariableExpression { variable_id: 3 })),
        item: Box::new(mapped_item),
    });

    // recurse: list-map-inner(f)(xs)(idx + 1)(new_acc)
    let recurse_call = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::Call(CallExpression {
                    function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                        list_map_inner_hash,
                    ))),
                    argument: Box::new(Expression::Variable(VariableExpression { variable_id: 0 })),
                })),
                argument: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
            })),
            argument: Box::new(Expression::Add(AddExpression {
                left: Box::new(Expression::Variable(VariableExpression { variable_id: 2 })),
                right: Box::new(Expression::Number(NumberExpression { value: 1 })),
            })),
        })),
        argument: Box::new(new_acc),
    });

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

    let body = Expression::Function(FunctionExpression {
        parameter_id: 0,
        parameter_name: "f".into(),
        body: Box::new(Expression::Function(FunctionExpression {
            parameter_id: 1,
            parameter_name: "xs".into(),
            body: Box::new(Expression::Function(FunctionExpression {
                parameter_id: 2,
                parameter_name: "idx".into(),
                body: Box::new(Expression::Function(FunctionExpression {
                    parameter_id: 3,
                    parameter_name: "acc".into(),
                    body: Box::new(body_cond),
                })),
            })),
        })),
    });

    ModulePartEntry {
        name: "list-map-inner".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::Function {
                parameter: Box::new(PartType::Number),
                return_type: Box::new(PartType::Number),
            }),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::List(Box::new(PartType::Number))),
                return_type: Box::new(PartType::Function {
                    parameter: Box::new(PartType::Number),
                    return_type: Box::new(PartType::Function {
                        parameter: Box::new(PartType::List(Box::new(PartType::Number))),
                        return_type: Box::new(PartType::List(Box::new(PartType::Number))),
                    }),
                }),
            }),
        }),
        description: Description::localized(vec![
            ("en", "Internal recursive accumulator for list-map"),
            ("ja", "list-map の再帰アキュムレータ内部ヘルパー"),
        ]),
        content_hash: None,
        expression: Some(body),
    }
}

/// リストを先頭から畳み込んで単一の値を計算する高階関数 (`core.list-fold`)
/// `(b -> a -> b) -> b -> list<a> -> b`
pub fn create_list_fold_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let list_fold_inner_hash = derive_module_part_id(core_module_id, "list-fold-inner");

    // list-fold(reducer)(init)(xs) = list-fold-inner(reducer)(xs)(0)(init)
    let body = Expression::Function(FunctionExpression {
        parameter_id: 0,
        parameter_name: "reducer".into(),
        body: Box::new(Expression::Function(FunctionExpression {
            parameter_id: 1,
            parameter_name: "init".into(),
            body: Box::new(Expression::Function(FunctionExpression {
                parameter_id: 2,
                parameter_name: "xs".into(),
                body: Box::new(Expression::Call(CallExpression {
                    function: Box::new(Expression::Call(CallExpression {
                        function: Box::new(Expression::Call(CallExpression {
                            function: Box::new(Expression::Call(CallExpression {
                                function: Box::new(Expression::PartReference(
                                    PartReferenceExpression::new(list_fold_inner_hash),
                                )),
                                argument: Box::new(Expression::Variable(VariableExpression {
                                    variable_id: 0,
                                })),
                            })),
                            argument: Box::new(Expression::Variable(VariableExpression {
                                variable_id: 2,
                            })),
                        })),
                        argument: Box::new(Expression::Number(NumberExpression { value: 0 })),
                    })),
                    argument: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
                })),
            })),
        })),
    });

    ModulePartEntry {
        name: "list-fold".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::Function {
                parameter: Box::new(PartType::Number),
                return_type: Box::new(PartType::Function {
                    parameter: Box::new(PartType::Number),
                    return_type: Box::new(PartType::Number),
                }),
            }),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::Number),
                return_type: Box::new(PartType::Function {
                    parameter: Box::new(PartType::List(Box::new(PartType::Number))),
                    return_type: Box::new(PartType::Number),
                }),
            }),
        }),
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

/// `core.list-fold-inner`: `reducer -> xs -> idx -> acc -> b`
pub fn create_list_fold_inner_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let list_fold_inner_hash = derive_module_part_id(core_module_id, "list-fold-inner");

    // current_item = list_get(xs, idx)
    let current_item = Expression::ListGet(ListGetExpression {
        list: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
        index: Box::new(Expression::Variable(VariableExpression { variable_id: 2 })),
    });

    // new_acc = reducer(acc)(current_item)
    let new_acc = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::Variable(VariableExpression { variable_id: 0 })),
            argument: Box::new(Expression::Variable(VariableExpression { variable_id: 3 })),
        })),
        argument: Box::new(current_item),
    });

    // recurse: list-fold-inner(reducer)(xs)(idx + 1)(new_acc)
    let recurse_call = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::Call(CallExpression {
                    function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                        list_fold_inner_hash,
                    ))),
                    argument: Box::new(Expression::Variable(VariableExpression { variable_id: 0 })),
                })),
                argument: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
            })),
            argument: Box::new(Expression::Add(AddExpression {
                left: Box::new(Expression::Variable(VariableExpression { variable_id: 2 })),
                right: Box::new(Expression::Number(NumberExpression { value: 1 })),
            })),
        })),
        argument: Box::new(new_acc),
    });

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

    let body = Expression::Function(FunctionExpression {
        parameter_id: 0,
        parameter_name: "reducer".into(),
        body: Box::new(Expression::Function(FunctionExpression {
            parameter_id: 1,
            parameter_name: "xs".into(),
            body: Box::new(Expression::Function(FunctionExpression {
                parameter_id: 2,
                parameter_name: "idx".into(),
                body: Box::new(Expression::Function(FunctionExpression {
                    parameter_id: 3,
                    parameter_name: "acc".into(),
                    body: Box::new(body_cond),
                })),
            })),
        })),
    });

    ModulePartEntry {
        name: "list-fold-inner".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::Function {
                parameter: Box::new(PartType::Number),
                return_type: Box::new(PartType::Function {
                    parameter: Box::new(PartType::Number),
                    return_type: Box::new(PartType::Number),
                }),
            }),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::List(Box::new(PartType::Number))),
                return_type: Box::new(PartType::Function {
                    parameter: Box::new(PartType::Number),
                    return_type: Box::new(PartType::Function {
                        parameter: Box::new(PartType::Number),
                        return_type: Box::new(PartType::Number),
                    }),
                }),
            }),
        }),
        description: Description::localized(vec![
            ("en", "Internal recursive accumulator for list-fold"),
            ("ja", "list-fold の再帰アキュムレータ内部ヘルパー"),
        ]),
        content_hash: None,
        expression: Some(body),
    }
}

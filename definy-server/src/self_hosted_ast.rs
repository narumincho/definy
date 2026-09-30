use definy_event::EventHashId;
use definy_event::event::{
    Expression, ModuleCommitEvent, PartType, TypeLiteralExpression, TypeLiteralItemExpression,
    VariantExpression,
};

pub(crate) fn module_commit_to_self_hosted_ast(
    module_commit: &ModuleCommitEvent,
    expression_type_hash: &EventHashId,
    type_ast_hash: &EventHashId,
) -> Result<Expression, String> {
    let parts = module_commit
        .parts
        .iter()
        .map(|part| {
            let part_type = part
                .part_type
                .as_ref()
                .ok_or_else(|| format!("part '{}' has no declared type", part.name))?;
            let expression = part
                .expression
                .as_ref()
                .ok_or_else(|| format!("part '{}' has no available expression", part.name))?;
            let self_hosted_expression = if part_type == &PartType::Type {
                type_declaration_to_self_hosted_ast(expression, expression_type_hash)?
            } else {
                expression_to_self_hosted_ast(expression, expression_type_hash)?
            };
            record(vec![
                ("name", Expression::String(string(&part.name))),
                (
                    "description",
                    Expression::String(string(part.description.get("en").unwrap_or(""))),
                ),
                (
                    "part_type",
                    part_type_to_self_hosted_ast(part_type, type_ast_hash)?,
                ),
                ("expression", self_hosted_expression),
            ])
        })
        .collect::<Result<Vec<_>, String>>()?;

    record(vec![
        (
            "name",
            Expression::String(string(&module_commit.module_name)),
        ),
        (
            "description",
            Expression::String(string(
                module_commit.module_description.get("en").unwrap_or(""),
            )),
        ),
        (
            "parts",
            Expression::ListLiteral(definy_event::event::ListLiteralExpression { items: parts }),
        ),
    ])
}

pub(crate) fn expression_to_self_hosted_ast(
    expression: &Expression,
    expression_type_hash: &EventHashId,
) -> Result<Expression, String> {
    use Expression as E;

    let binary = |tag: &str, left: &Expression, right: &Expression| {
        record(vec![
            (
                "left",
                expression_to_self_hosted_ast(left, expression_type_hash)?,
            ),
            (
                "right",
                expression_to_self_hosted_ast(right, expression_type_hash)?,
            ),
        ])
        .map(|payload| expression_variant(tag, Some(payload), expression_type_hash))
    };
    let unary = |tag: &str, value: &Expression| {
        record(vec![(
            "value",
            expression_to_self_hosted_ast(value, expression_type_hash)?,
        )])
        .map(|payload| expression_variant(tag, Some(payload), expression_type_hash))
    };

    match expression {
        E::Number(value) => Ok(expression_variant(
            "number",
            Some(E::Number(value.clone())),
            expression_type_hash,
        )),
        E::String(value) => Ok(expression_variant(
            "string",
            Some(E::String(value.clone())),
            expression_type_hash,
        )),
        E::Boolean(value) => Ok(expression_variant(
            "boolean",
            Some(E::Boolean(value.clone())),
            expression_type_hash,
        )),
        E::Add(value) => binary("add", &value.left, &value.right),
        E::Subtract(value) => binary("subtract", &value.left, &value.right),
        E::Multiply(value) => binary("multiply", &value.left, &value.right),
        E::Divide(value) => binary("divide", &value.left, &value.right),
        E::Remainder(value) => binary("remainder", &value.left, &value.right),
        E::Equal(value) => binary("equal", &value.left, &value.right),
        E::LessThan(value) => binary("less_than", &value.left, &value.right),
        E::ListLiteral(value) => value
            .items
            .iter()
            .map(|item| expression_to_self_hosted_ast(item, expression_type_hash))
            .collect::<Result<Vec<_>, _>>()
            .map(|items| {
                expression_variant(
                    "list",
                    Some(E::ListLiteral(definy_event::event::ListLiteralExpression {
                        items,
                    })),
                    expression_type_hash,
                )
            }),
        E::Call(value) => record(vec![
            (
                "function",
                expression_to_self_hosted_ast(&value.function, expression_type_hash)?,
            ),
            (
                "argument",
                expression_to_self_hosted_ast(&value.argument, expression_type_hash)?,
            ),
        ])
        .map(|payload| expression_variant("call", Some(payload), expression_type_hash)),
        E::Function(value) => record(vec![
            (
                "parameter_variable_id",
                E::Number(number(value.parameter_id)),
            ),
            (
                "body",
                expression_to_self_hosted_ast(&value.body, expression_type_hash)?,
            ),
        ])
        .map(|payload| expression_variant("function", Some(payload), expression_type_hash)),
        E::Variable(value) => record(vec![("variable_id", E::Number(number(value.variable_id)))])
            .map(|payload| expression_variant("variable", Some(payload), expression_type_hash)),
        E::TypeLiteral(value) => value
            .items
            .iter()
            .map(|item| {
                record(vec![
                    ("key", E::String(string(item.key.as_ref()))),
                    (
                        "value",
                        expression_to_self_hosted_ast(&item.value, expression_type_hash)?,
                    ),
                ])
            })
            .collect::<Result<Vec<_>, String>>()
            .map(|items| {
                expression_variant(
                    "record",
                    Some(E::ListLiteral(definy_event::event::ListLiteralExpression {
                        items,
                    })),
                    expression_type_hash,
                )
            }),
        E::RecordGet(value) => record(vec![
            (
                "record",
                expression_to_self_hosted_ast(&value.record, expression_type_hash)?,
            ),
            ("key", E::String(string(value.key.as_ref()))),
        ])
        .map(|payload| expression_variant("record_get", Some(payload), expression_type_hash)),
        E::Variant(value) => {
            let payload = match &value.payload {
                Some(payload) => expression_variant(
                    "some",
                    Some(expression_to_self_hosted_ast(
                        payload,
                        expression_type_hash,
                    )?),
                    expression_type_hash,
                ),
                None => expression_variant("none", None, expression_type_hash),
            };
            record(vec![
                ("tag", E::String(string(value.tag.as_ref()))),
                ("payload", payload),
            ])
            .map(|payload| expression_variant("variant", Some(payload), expression_type_hash))
        }
        E::Match(value) => {
            if value.default.is_some() {
                return Err("core.expression does not represent a default match arm".into());
            }
            let arms = value
                .arms
                .iter()
                .map(|arm| {
                    let variable_id = arm.variable_id.ok_or_else(|| {
                        "core.expression requires a variable_id for every match arm".to_string()
                    })?;
                    record(vec![
                        ("tag", E::String(string(arm.tag.as_ref()))),
                        ("variable_id", E::Number(number(variable_id))),
                        (
                            "body",
                            expression_to_self_hosted_ast(&arm.body, expression_type_hash)?,
                        ),
                    ])
                })
                .collect::<Result<Vec<_>, String>>()?;
            record(vec![
                (
                    "target",
                    expression_to_self_hosted_ast(&value.target, expression_type_hash)?,
                ),
                (
                    "arms",
                    E::ListLiteral(definy_event::event::ListLiteralExpression { items: arms }),
                ),
            ])
            .map(|payload| expression_variant("match", Some(payload), expression_type_hash))
        }
        E::PartReference(value) => record(vec![(
            "part_definition_event_hash",
            E::String(string(&value.part_definition_event_hash.to_string())),
        )])
        .map(|payload| expression_variant("part_reference", Some(payload), expression_type_hash)),
        E::If(value) => record(vec![
            (
                "condition",
                expression_to_self_hosted_ast(&value.condition, expression_type_hash)?,
            ),
            (
                "then_expr",
                expression_to_self_hosted_ast(&value.then_expr, expression_type_hash)?,
            ),
            (
                "else_expr",
                expression_to_self_hosted_ast(&value.else_expr, expression_type_hash)?,
            ),
        ])
        .map(|payload| expression_variant("if", Some(payload), expression_type_hash)),
        E::Let(value) => record(vec![
            ("variable_id", E::Number(number(value.variable_id))),
            (
                "value",
                expression_to_self_hosted_ast(&value.value, expression_type_hash)?,
            ),
            (
                "body",
                expression_to_self_hosted_ast(&value.body, expression_type_hash)?,
            ),
        ])
        .map(|payload| expression_variant("let", Some(payload), expression_type_hash)),
        E::Not(value) => unary("not", &value.value),
        E::And(value) => binary("and", &value.left, &value.right),
        E::Or(value) => binary("or", &value.left, &value.right),
        E::BitAnd(_) => Err("core.expression does not represent bit_and".into()),
        E::BitOr(_) => Err("core.expression does not represent bit_or".into()),
        E::BitXor(_) => Err("core.expression does not represent bit_xor".into()),
        E::ShiftLeft(_) => Err("core.expression does not represent shift_left".into()),
        E::ShiftRight(_) => Err("core.expression does not represent shift_right".into()),
        E::LessThanOrEqual(_) => {
            Err("core.expression does not represent less_than_or_equal".into())
        }
        E::GreaterThan(_) => Err("core.expression does not represent greater_than".into()),
        E::GreaterThanOrEqual(_) => {
            Err("core.expression does not represent greater_than_or_equal".into())
        }
        E::NotEqual(_) => Err("core.expression does not represent not_equal".into()),
        E::StringConcat(_) => Err("core.expression does not represent string_concat".into()),
        E::StringLength(_) => Err("core.expression does not represent string_length".into()),
        E::StringSlice(_) => Err("core.expression does not represent string_slice".into()),
        E::ListLength(_) => Err("core.expression does not represent list_length".into()),
        E::ListConcat(_) => Err("core.expression does not represent list_concat".into()),
        E::ListGet(_) => Err("core.expression does not represent list_get".into()),
        E::ListAppend(_) => Err("core.expression does not represent list_append".into()),
        E::TypeNumber => Ok(expression_variant(
            "type_number",
            None,
            expression_type_hash,
        )),
        E::TypeString => Ok(expression_variant(
            "type_string",
            None,
            expression_type_hash,
        )),
        E::TypeBoolean => Ok(expression_variant(
            "type_boolean",
            None,
            expression_type_hash,
        )),
        E::TypeList(_) => Err("core.expression does not represent type-list expressions".into()),
        E::Constructor(_) => Err("core.expression does not represent constructors".into()),
        E::TypeFunction(_) | E::TypeUnion(_) => {
            Err("core.expression does not represent type declarations".into())
        }
        E::Compiler(_) => Err("core.expression does not represent compiler builtins".into()),
    }
}

fn type_declaration_to_self_hosted_ast(
    expression: &Expression,
    expression_type_hash: &EventHashId,
) -> Result<Expression, String> {
    use Expression as E;

    match expression {
        E::TypeNumber | E::TypeString | E::TypeBoolean => {
            expression_to_self_hosted_ast(expression, expression_type_hash)
        }
        E::TypeList(list) => record(vec![(
            "item_type",
            type_declaration_to_self_hosted_ast(&list.item_type, expression_type_hash)?,
        )])
        .map(|payload| expression_variant("type_list", Some(payload), expression_type_hash)),
        E::TypeFunction(function) => record(vec![
            (
                "parameter",
                type_declaration_to_self_hosted_ast(&function.parameter, expression_type_hash)?,
            ),
            (
                "return_type",
                type_declaration_to_self_hosted_ast(&function.return_type, expression_type_hash)?,
            ),
        ])
        .map(|payload| expression_variant("type_function", Some(payload), expression_type_hash)),
        E::TypeLiteral(record_type) => record_type
            .items
            .iter()
            .map(|field| {
                record(vec![
                    ("key", E::String(string(&field.key))),
                    (
                        "value",
                        type_declaration_to_self_hosted_ast(&field.value, expression_type_hash)?,
                    ),
                ])
            })
            .collect::<Result<Vec<_>, String>>()
            .map(|fields| {
                expression_variant(
                    "type_record",
                    Some(E::ListLiteral(definy_event::event::ListLiteralExpression {
                        items: fields,
                    })),
                    expression_type_hash,
                )
            }),
        E::TypeUnion(union_type) => union_type
            .variants
            .iter()
            .map(|variant| {
                let payload_type = match &variant.payload_type {
                    Some(payload_type) => Expression::Variant(VariantExpression {
                        type_part_definition_event_hash: None,
                        tag: "some".into(),
                        payload: Some(Box::new(type_declaration_to_self_hosted_ast(
                            payload_type,
                            expression_type_hash,
                        )?)),
                    }),
                    None => Expression::Variant(VariantExpression {
                        type_part_definition_event_hash: None,
                        tag: "none".into(),
                        payload: None,
                    }),
                };
                record(vec![
                    ("tag", E::String(string(&variant.tag))),
                    ("payload_type", payload_type),
                ])
            })
            .collect::<Result<Vec<_>, String>>()
            .map(|variants| {
                expression_variant(
                    "type_union",
                    Some(E::ListLiteral(definy_event::event::ListLiteralExpression {
                        items: variants,
                    })),
                    expression_type_hash,
                )
            }),
        E::PartReference(_) => Err("type declarations cannot reference parts yet".into()),
        _ => Err("part_type 'type' requires a type declaration expression".into()),
    }
}

pub(crate) fn part_type_to_self_hosted_ast(
    part_type: &PartType,
    type_ast_hash: &EventHashId,
) -> Result<Expression, String> {
    use PartType as T;

    let make_variant = |tag: Box<str>, payload: Option<Expression>| {
        Expression::Variant(VariantExpression {
            type_part_definition_event_hash: Some(type_ast_hash.clone()),
            tag,
            payload: payload.map(Box::new),
        })
    };
    let record_payload = |items| record(items);

    match part_type {
        T::Number => Ok(make_variant("number".into(), None)),
        T::String => Ok(make_variant("string".into(), None)),
        T::Boolean => Ok(make_variant("boolean".into(), None)),
        T::List(item_type) => {
            let item_type = part_type_to_self_hosted_ast(item_type, type_ast_hash)?;
            Ok(make_variant(
                "list".into(),
                Some(record_payload(vec![("item_type", item_type)])?),
            ))
        }
        T::Function {
            parameter,
            return_type,
        } => Ok(make_variant(
            "function".into(),
            Some(record_payload(vec![
                (
                    "parameter",
                    part_type_to_self_hosted_ast(parameter, type_ast_hash)?,
                ),
                (
                    "return_type",
                    part_type_to_self_hosted_ast(return_type, type_ast_hash)?,
                ),
            ])?),
        )),
        T::Record(fields) => {
            let fields = fields
                .iter()
                .map(|field| {
                    record_payload(vec![
                        ("key", Expression::String(string(&field.key))),
                        (
                            "field_type",
                            part_type_to_self_hosted_ast(&field.value, type_ast_hash)?,
                        ),
                    ])
                })
                .collect::<Result<Vec<_>, String>>()?;
            Ok(make_variant(
                "record".into(),
                Some(Expression::ListLiteral(
                    definy_event::event::ListLiteralExpression { items: fields },
                )),
            ))
        }
        T::Union(variants) => {
            let variants = variants
                .iter()
                .map(|variant| {
                    let payload_type = match &variant.payload {
                        Some(payload) => Expression::Variant(VariantExpression {
                            type_part_definition_event_hash: None,
                            tag: "some".into(),
                            payload: Some(Box::new(part_type_to_self_hosted_ast(
                                payload,
                                type_ast_hash,
                            )?)),
                        }),
                        None => Expression::Variant(VariantExpression {
                            type_part_definition_event_hash: None,
                            tag: "none".into(),
                            payload: None,
                        }),
                    };
                    record(vec![
                        ("tag", Expression::String(string(&variant.tag))),
                        ("payload_type", payload_type),
                    ])
                })
                .collect::<Result<Vec<_>, String>>()?;
            Ok(make_variant(
                "union".into(),
                Some(Expression::ListLiteral(
                    definy_event::event::ListLiteralExpression { items: variants },
                )),
            ))
        }
        T::Type => Ok(make_variant("type".into(), None)),
        T::TypePart(part_hash) => Ok(make_variant(
            "reference".into(),
            Some(record_payload(vec![(
                "part_hash",
                Expression::String(string(&part_hash.to_string())),
            )])?),
        )),
    }
}

fn expression_variant(
    tag: impl Into<Box<str>>,
    payload: Option<Expression>,
    expression_type_hash: &EventHashId,
) -> Expression {
    Expression::Variant(VariantExpression {
        type_part_definition_event_hash: Some(expression_type_hash.clone()),
        tag: tag.into(),
        payload: payload.map(Box::new),
    })
}

fn record(items: Vec<(&str, Expression)>) -> Result<Expression, String> {
    Ok(Expression::TypeLiteral(TypeLiteralExpression {
        items: items
            .into_iter()
            .map(|(key, value)| TypeLiteralItemExpression {
                key: key.into(),
                value: Box::new(value),
            })
            .collect(),
    }))
}

fn number(value: i64) -> definy_event::event::NumberExpression {
    definy_event::event::NumberExpression { value }
}

fn string(value: &str) -> definy_event::event::StringExpression {
    definy_event::event::StringExpression {
        value: value.into(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use definy_event::event::{AddExpression, NumberExpression};

    fn dummy_hash() -> EventHashId {
        EventHashId::from_bytes(&[7; 32])
    }

    #[test]
    fn encodes_nested_arithmetic_as_core_expression_values() {
        let expression_hash = dummy_hash();
        let expression = Expression::Add(AddExpression {
            left: Box::new(Expression::Number(NumberExpression { value: 20 })),
            right: Box::new(Expression::Number(NumberExpression { value: 22 })),
        });

        let encoded = expression_to_self_hosted_ast(&expression, &expression_hash).unwrap();

        let Expression::Variant(add) = encoded else {
            panic!("expected encoded add variant");
        };
        assert_eq!(add.tag.as_ref(), "add");
        assert_eq!(add.type_part_definition_event_hash, Some(expression_hash));
        let add_payload = add.payload.unwrap();
        let Expression::TypeLiteral(payload) = add_payload.as_ref() else {
            panic!("expected add payload record");
        };
        for item in &payload.items {
            let Expression::Variant(number) = item.value.as_ref() else {
                panic!("expected nested number variant");
            };
            assert_eq!(number.tag.as_ref(), "number");
        }
    }

    #[test]
    fn rejects_nodes_missing_from_core_expression() {
        let error = expression_to_self_hosted_ast(
            &Expression::Compiler(definy_event::event::CompilerBuiltin::Plus),
            &dummy_hash(),
        )
        .unwrap_err();

        assert!(error.contains("compiler builtins"));
    }

    #[test]
    fn encodes_function_part_types() {
        let type_hash = dummy_hash();
        let encoded = part_type_to_self_hosted_ast(
            &PartType::Function {
                parameter: Box::new(PartType::Number),
                return_type: Box::new(PartType::String),
            },
            &type_hash,
        )
        .unwrap();

        let Expression::Variant(function) = encoded else {
            panic!("expected encoded function type");
        };
        assert_eq!(function.tag.as_ref(), "function");
        assert_eq!(function.type_part_definition_event_hash, Some(type_hash));
    }

    #[test]
    fn encodes_union_payloads_as_optional_type_ast_values() {
        let type_hash = dummy_hash();
        let encoded = part_type_to_self_hosted_ast(
            &PartType::Union(vec![
                definy_event::event::UnionVariantType {
                    tag: "none".into(),
                    payload: None,
                },
                definy_event::event::UnionVariantType {
                    tag: "some".into(),
                    payload: Some(Box::new(PartType::Number)),
                },
            ]),
            &type_hash,
        )
        .unwrap();

        let Expression::Variant(union) = encoded else {
            panic!("expected encoded union type");
        };
        assert_eq!(union.tag.as_ref(), "union");
        let union_payload = union.payload.unwrap();
        let Expression::ListLiteral(variants) = union_payload.as_ref() else {
            panic!("expected union variant list");
        };
        let Expression::TypeLiteral(none_variant) = variants.items[0].clone() else {
            panic!("expected first union variant record");
        };
        let payload_type = none_variant
            .items
            .iter()
            .find(|item| item.key.as_ref() == "payload_type")
            .unwrap();
        let Expression::Variant(none) = payload_type.value.as_ref() else {
            panic!("expected none payload type");
        };
        assert_eq!(none.tag.as_ref(), "none");

        let Expression::TypeLiteral(some_variant) = variants.items[1].clone() else {
            panic!("expected second union variant record");
        };
        let payload_type = some_variant
            .items
            .iter()
            .find(|item| item.key.as_ref() == "payload_type")
            .unwrap();
        let Expression::Variant(some) = payload_type.value.as_ref() else {
            panic!("expected some payload type");
        };
        assert_eq!(some.tag.as_ref(), "some");
        assert!(matches!(
            some.payload.as_deref(),
            Some(Expression::Variant(type_ast)) if type_ast.tag.as_ref() == "number"
        ));
    }
}

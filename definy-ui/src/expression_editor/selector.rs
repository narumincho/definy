use std::collections::HashMap;
use std::str::FromStr;

use definy_event::EventHashId;

use crate::app_state::AppState;
use crate::language::Language;
use crate::part_projection::collect_part_snapshots;

use super::diagnostics::part_type_to_expression_type;
use super::types::{ExpressionType, FunctionParameterTypeInfo, ScopeVariable};

pub fn selector_options(
    state: &AppState,
    language: Language,
    scope_variables: &[ScopeVariable],
    is_root: bool,
    expected_type: Option<&ExpressionType>,
    variable_types: &HashMap<i64, ExpressionType>,
) -> Vec<(String, String)> {
    let snapshots = collect_part_snapshots(state);
    let mut options = Vec::new();

    if is_root {
        options.push((
            "expr:none".to_string(),
            format!("{}\t\t", language.label("none", "none", "none")),
        ));
    }

    // Local Variables
    options.extend(scope_variables.iter().map(|scope_var| {
        (
            format!("ref:local:{}", scope_var.id),
            format!("{}\tLocal\t#{}", scope_var.name, scope_var.id),
        )
    }));

    // Fallback options when snapshots are empty (e.g. uninitialized state, offline, unit tests)
    if snapshots.is_empty() {
        options.extend([
            ("expr:number".to_string(), "number\tLiteral\t".to_string()),
            ("expr:string".to_string(), "string\tLiteral\t".to_string()),
            ("expr:boolean".to_string(), "boolean\tLiteral\t".to_string()),
            ("expr:list".to_string(), "list\tLiteral\t".to_string()),
            ("expr:equal".to_string(), "equal\tFunction\t".to_string()),
            (
                "expr:not_equal".to_string(),
                "not_equal\tFunction\t".to_string(),
            ),
            (
                "expr:less_than".to_string(),
                "less_than\tFunction\t".to_string(),
            ),
            (
                "expr:less_than_or_equal".to_string(),
                "less_than_or_equal\tFunction\t".to_string(),
            ),
            (
                "expr:greater_than".to_string(),
                "greater_than\tFunction\t".to_string(),
            ),
            (
                "expr:greater_than_or_equal".to_string(),
                "greater_than_or_equal\tFunction\t".to_string(),
            ),
            ("expr:not".to_string(), "not\tFunction\t".to_string()),
            ("expr:and".to_string(), "and\tFunction\t".to_string()),
            ("expr:or".to_string(), "or\tFunction\t".to_string()),
            ("expr:add".to_string(), "add\tFunction\t".to_string()),
            (
                "expr:subtract".to_string(),
                "subtract\tFunction\t".to_string(),
            ),
            (
                "expr:multiply".to_string(),
                "multiply\tFunction\t".to_string(),
            ),
            ("expr:divide".to_string(), "divide\tFunction\t".to_string()),
            (
                "expr:remainder".to_string(),
                "remainder\tFunction\t".to_string(),
            ),
            (
                "expr:bit_and".to_string(),
                "bit_and\tFunction\t".to_string(),
            ),
            ("expr:bit_or".to_string(), "bit_or\tFunction\t".to_string()),
            (
                "expr:bit_xor".to_string(),
                "bit_xor\tFunction\t".to_string(),
            ),
            (
                "expr:shift_left".to_string(),
                "shift_left\tFunction\t".to_string(),
            ),
            (
                "expr:shift_right".to_string(),
                "shift_right\tFunction\t".to_string(),
            ),
            (
                "expr:string_concat".to_string(),
                "string_concat\tFunction\t".to_string(),
            ),
            (
                "expr:string_length".to_string(),
                "string_length\tFunction\t".to_string(),
            ),
            (
                "expr:string_slice".to_string(),
                "string_slice\tFunction\t".to_string(),
            ),
            (
                "expr:list_length".to_string(),
                "list_length\tFunction\t".to_string(),
            ),
            (
                "expr:list_concat".to_string(),
                "list_concat\tFunction\t".to_string(),
            ),
            (
                "expr:list_get".to_string(),
                "list_get\tFunction\t".to_string(),
            ),
            (
                "expr:list_append".to_string(),
                "list_append\tFunction\t".to_string(),
            ),
            (
                "expr:match_boolean".to_string(),
                "match (true / false)\tSyntax\t".to_string(),
            ),
            ("expr:let".to_string(), "let\tSyntax\t".to_string()),
            ("expr:type:number".to_string(), "number\ttype\t".to_string()),
            ("expr:type:string".to_string(), "string\ttype\t".to_string()),
            (
                "expr:type:boolean".to_string(),
                "boolean\ttype\t".to_string(),
            ),
            ("expr:type:list".to_string(), "list\ttype\t".to_string()),
        ]);
    }

    // Single pass over snapshots for constructors, variants, part_type_map, and global parts
    let mut part_type_map = HashMap::new();
    let mut seen_variant_tags = std::collections::HashSet::new();
    let mut variant_options = Vec::new();
    let mut constructor_options = Vec::new();
    let mut global_part_options = Vec::new();

    for snapshot in &snapshots {
        if let Some(part_type) = &snapshot.part_type {
            part_type_map.insert(
                snapshot.definition_event_hash.clone(),
                part_type_to_expression_type(part_type),
            );
            if *part_type == definy_event::event::PartType::Type && snapshot.expression.is_some() {
                constructor_options.push((
                    format!("expr:constructor:{}", snapshot.definition_event_hash),
                    format!(
                        "{}\tConstructor\t{}",
                        snapshot.part_name, snapshot.definition_event_hash
                    ),
                ));
            }
        } else if let Some(definy_event::event::Expression::Compiler(builtin)) =
            &snapshot.expression
        {
            let expr_type = match builtin {
                definy_event::event::CompilerBuiltin::NumberLiteral
                | definy_event::event::CompilerBuiltin::Plus
                | definy_event::event::CompilerBuiltin::Minus
                | definy_event::event::CompilerBuiltin::Multiply
                | definy_event::event::CompilerBuiltin::Divide
                | definy_event::event::CompilerBuiltin::Remainder
                | definy_event::event::CompilerBuiltin::BitAnd
                | definy_event::event::CompilerBuiltin::BitOr
                | definy_event::event::CompilerBuiltin::BitXor
                | definy_event::event::CompilerBuiltin::ShiftLeft
                | definy_event::event::CompilerBuiltin::ShiftRight
                | definy_event::event::CompilerBuiltin::StringLength
                | definy_event::event::CompilerBuiltin::ListLength => Some(ExpressionType::Number),

                definy_event::event::CompilerBuiltin::Equal
                | definy_event::event::CompilerBuiltin::NotEqual
                | definy_event::event::CompilerBuiltin::LessThan
                | definy_event::event::CompilerBuiltin::LessThanOrEqual
                | definy_event::event::CompilerBuiltin::GreaterThan
                | definy_event::event::CompilerBuiltin::GreaterThanOrEqual
                | definy_event::event::CompilerBuiltin::Not
                | definy_event::event::CompilerBuiltin::And
                | definy_event::event::CompilerBuiltin::Or => Some(ExpressionType::Boolean),

                definy_event::event::CompilerBuiltin::StringConcat
                | definy_event::event::CompilerBuiltin::StringSlice => Some(ExpressionType::String),

                definy_event::event::CompilerBuiltin::StringToBytes => {
                    Some(ExpressionType::List(Box::new(ExpressionType::Number)))
                }

                definy_event::event::CompilerBuiltin::ListConcat
                | definy_event::event::CompilerBuiltin::ListAppend => {
                    Some(ExpressionType::List(Box::new(ExpressionType::Unknown)))
                }

                _ => None,
            };
            if let Some(t) = expr_type {
                part_type_map.insert(snapshot.definition_event_hash.clone(), t);
            }
        }

        if let Some(definy_event::event::Expression::TypeUnion(type_union)) = &snapshot.expression {
            for v in &type_union.variants {
                let tag = v.tag.as_ref();
                if seen_variant_tags.insert(tag.to_string()) {
                    variant_options.push((
                        format!("expr:variant:{}", tag),
                        format!("{}\tVariant\t{}", tag, snapshot.part_name),
                    ));
                }
            }
        }

        let type_text = snapshot
            .part_type
            .as_ref()
            .map(ToString::to_string)
            .unwrap_or_else(|| "Part".to_string());
        let is_inline_function_builtin = matches!(
            snapshot.expression.as_ref(),
            Some(definy_event::event::Expression::Compiler(
                definy_event::event::CompilerBuiltin::Function
                    | definy_event::event::CompilerBuiltin::Call
            ))
        );
        if !is_inline_function_builtin {
            global_part_options.push((
                format!("ref:global:{}", snapshot.definition_event_hash),
                format!(
                    "{}\t{}\t{}",
                    snapshot.part_name, type_text, snapshot.definition_event_hash
                ),
            ));
        }
    }

    if seen_variant_tags.insert("none".to_string()) {
        variant_options.push((
            "expr:variant:none".to_string(),
            "none\tVariant\t".to_string(),
        ));
    }
    if seen_variant_tags.insert("some".to_string()) {
        variant_options.push((
            "expr:variant:some".to_string(),
            "some\tVariant\t".to_string(),
        ));
    }

    options.extend(global_part_options);
    options.extend(constructor_options);
    options.extend(variant_options);

    // Generic syntax constructors not backed by a snapshot part
    options.extend([
        ("expr:string".to_string(), "string\tLiteral\t".to_string()),
        ("expr:boolean".to_string(), "boolean\tLiteral\t".to_string()),
        ("expr:list".to_string(), "list\tLiteral\t".to_string()),
        (
            "expr:type_literal".to_string(),
            "record\ttype\t".to_string(),
        ),
        (
            "expr:record_get".to_string(),
            "record_get\tProperty\t".to_string(),
        ),
        (
            "expr:function".to_string(),
            "function\tSyntax\t".to_string(),
        ),
        ("expr:call".to_string(), "call\tSyntax\t".to_string()),
        ("expr:match".to_string(), "match\tSyntax\t".to_string()),
        (
            "expr:type:function".to_string(),
            "function\ttype\t".to_string(),
        ),
        ("expr:type:union".to_string(), "union\ttype\t".to_string()),
    ]);

    if !matches!(expected_type, Some(ExpressionType::Function { .. })) {
        options.retain(|(value, _)| value != "expr:function");
    }

    if let Some(expected) = expected_type {
        options.sort_by_cached_key(|(val, _)| {
            let opt_type = classify_option_type(val, &part_type_map, variable_types);
            option_match_rank(val, opt_type.as_ref(), Some(expected))
        });
    }

    options
}

fn classify_option_type(
    opt_val: &str,
    part_type_map: &HashMap<EventHashId, ExpressionType>,
    variable_types: &HashMap<i64, ExpressionType>,
) -> Option<ExpressionType> {
    if opt_val == "expr:number" {
        return Some(ExpressionType::Number);
    }
    if opt_val == "expr:string" {
        return Some(ExpressionType::String);
    }
    if opt_val == "expr:boolean" {
        return Some(ExpressionType::Boolean);
    }
    if opt_val == "expr:list" {
        return Some(ExpressionType::List(Box::new(ExpressionType::Unknown)));
    }
    if opt_val == "expr:type_literal" {
        return Some(ExpressionType::Record(vec![]));
    }
    if matches!(
        opt_val,
        "expr:add"
            | "expr:subtract"
            | "expr:multiply"
            | "expr:divide"
            | "expr:remainder"
            | "expr:bit_and"
            | "expr:bit_or"
            | "expr:bit_xor"
            | "expr:shift_left"
            | "expr:shift_right"
            | "expr:string_length"
            | "expr:list_length"
    ) {
        return Some(ExpressionType::Number);
    }
    if matches!(
        opt_val,
        "expr:equal"
            | "expr:not_equal"
            | "expr:less_than"
            | "expr:less_than_or_equal"
            | "expr:greater_than"
            | "expr:greater_than_or_equal"
            | "expr:not"
            | "expr:and"
            | "expr:or"
    ) {
        return Some(ExpressionType::Boolean);
    }
    if matches!(opt_val, "expr:string_concat" | "expr:string_slice") {
        return Some(ExpressionType::String);
    }
    if matches!(opt_val, "expr:list_concat" | "expr:list_append") {
        return Some(ExpressionType::List(Box::new(ExpressionType::Unknown)));
    }
    if opt_val.starts_with("expr:type:") {
        return Some(ExpressionType::Type);
    }
    if opt_val == "expr:function" {
        return Some(ExpressionType::Function {
            parameters: vec![FunctionParameterTypeInfo {
                name: "x".into(),
                r#type: ExpressionType::Unknown,
            }],
            return_type: Box::new(ExpressionType::Unknown),
        });
    }
    if opt_val.starts_with("expr:variant:") || opt_val == "expr:variant" {
        return Some(ExpressionType::Union);
    }
    if let Some(hash_str) = opt_val.strip_prefix("expr:constructor:") {
        return EventHashId::from_str(hash_str)
            .ok()
            .map(ExpressionType::TypePart);
    }
    if let Some(hash_str) = opt_val.strip_prefix("ref:global:") {
        return EventHashId::from_str(hash_str)
            .ok()
            .and_then(|hash| part_type_map.get(&hash).cloned());
    }
    if let Some(var_id_str) = opt_val.strip_prefix("ref:local:") {
        return var_id_str
            .parse::<i64>()
            .ok()
            .and_then(|var_id| variable_types.get(&var_id).cloned());
    }
    None
}

fn option_match_rank(
    opt_val: &str,
    opt_type: Option<&ExpressionType>,
    expected: Option<&ExpressionType>,
) -> u8 {
    let Some(expected) = expected else {
        return 0;
    };
    if expected == &ExpressionType::Unknown {
        return 0;
    }

    if opt_val == "expr:none" {
        return 3;
    }

    if opt_val == "expr:type_literal" && expected == &ExpressionType::Type {
        return 0;
    }

    if let Some(actual) = opt_type {
        if actual == &ExpressionType::Unknown {
            return 2;
        }
        let is_match = match (expected, actual) {
            (ExpressionType::Number, ExpressionType::Number) => true,
            (ExpressionType::String, ExpressionType::String) => true,
            (ExpressionType::Boolean, ExpressionType::Boolean) => true,
            (ExpressionType::Type, ExpressionType::Type) => true,
            (ExpressionType::TypePart(h1), ExpressionType::TypePart(h2)) => h1 == h2,
            (ExpressionType::List(_), ExpressionType::List(_)) => true,
            (ExpressionType::Record(_), ExpressionType::Record(_)) => true,
            (ExpressionType::Union, ExpressionType::Union) => true,
            (ExpressionType::Function { .. }, ExpressionType::Function { .. }) => true,
            _ => false,
        };
        if is_match {
            return 0;
        } else {
            return 2;
        }
    }

    if matches!(
        opt_val,
        "expr:match_boolean" | "expr:let" | "expr:call" | "expr:match" | "expr:list_get"
    ) {
        return 1;
    }

    2
}

fn compiler_builtin_fallback_value(builtin: definy_event::event::CompilerBuiltin) -> &'static str {
    use definy_event::event::CompilerBuiltin;
    match builtin {
        CompilerBuiltin::Let => "expr:let",
        CompilerBuiltin::Plus => "expr:add",
        CompilerBuiltin::Minus => "expr:subtract",
        CompilerBuiltin::Multiply => "expr:multiply",
        CompilerBuiltin::Divide => "expr:divide",
        CompilerBuiltin::Remainder => "expr:remainder",
        CompilerBuiltin::BitAnd => "expr:bit_and",
        CompilerBuiltin::BitOr => "expr:bit_or",
        CompilerBuiltin::BitXor => "expr:bit_xor",
        CompilerBuiltin::ShiftLeft => "expr:shift_left",
        CompilerBuiltin::ShiftRight => "expr:shift_right",
        CompilerBuiltin::Equal => "expr:equal",
        CompilerBuiltin::NotEqual => "expr:not_equal",
        CompilerBuiltin::LessThan => "expr:less_than",
        CompilerBuiltin::LessThanOrEqual => "expr:less_than_or_equal",
        CompilerBuiltin::GreaterThan => "expr:greater_than",
        CompilerBuiltin::GreaterThanOrEqual => "expr:greater_than_or_equal",
        CompilerBuiltin::Not => "expr:not",
        CompilerBuiltin::And => "expr:and",
        CompilerBuiltin::Or => "expr:or",
        CompilerBuiltin::StringConcat => "expr:string_concat",
        CompilerBuiltin::StringLength => "expr:string_length",
        CompilerBuiltin::StringSlice => "expr:string_slice",
        CompilerBuiltin::StringToBytes => "expr:string_to_bytes",
        CompilerBuiltin::ListLength => "expr:list_length",
        CompilerBuiltin::ListConcat => "expr:list_concat",
        CompilerBuiltin::ListGet => "expr:list_get",
        CompilerBuiltin::ListAppend => "expr:list_append",
        CompilerBuiltin::NumberLiteral => "expr:number",
        CompilerBuiltin::Function => "expr:function",
        CompilerBuiltin::Call => "expr:call",
    }
}

fn expression_compiler_builtin(
    expression: &definy_event::event::Expression,
) -> Option<definy_event::event::CompilerBuiltin> {
    use definy_event::event::{CompilerBuiltin, Expression};
    match expression {
        Expression::Number(_) => Some(CompilerBuiltin::NumberLiteral),
        Expression::Add(_) => Some(CompilerBuiltin::Plus),
        Expression::Subtract(_) => Some(CompilerBuiltin::Minus),
        Expression::Multiply(_) => Some(CompilerBuiltin::Multiply),
        Expression::Divide(_) => Some(CompilerBuiltin::Divide),
        Expression::Remainder(_) => Some(CompilerBuiltin::Remainder),
        Expression::BitAnd(_) => Some(CompilerBuiltin::BitAnd),
        Expression::BitOr(_) => Some(CompilerBuiltin::BitOr),
        Expression::BitXor(_) => Some(CompilerBuiltin::BitXor),
        Expression::ShiftLeft(_) => Some(CompilerBuiltin::ShiftLeft),
        Expression::ShiftRight(_) => Some(CompilerBuiltin::ShiftRight),
        Expression::Equal(_) => Some(CompilerBuiltin::Equal),
        Expression::NotEqual(_) => Some(CompilerBuiltin::NotEqual),
        Expression::LessThan(_) => Some(CompilerBuiltin::LessThan),
        Expression::LessThanOrEqual(_) => Some(CompilerBuiltin::LessThanOrEqual),
        Expression::GreaterThan(_) => Some(CompilerBuiltin::GreaterThan),
        Expression::GreaterThanOrEqual(_) => Some(CompilerBuiltin::GreaterThanOrEqual),
        Expression::Not(_) => Some(CompilerBuiltin::Not),
        Expression::And(_) => Some(CompilerBuiltin::And),
        Expression::Or(_) => Some(CompilerBuiltin::Or),
        Expression::StringConcat(_) => Some(CompilerBuiltin::StringConcat),
        Expression::StringLength(_) => Some(CompilerBuiltin::StringLength),
        Expression::StringSlice(_) => Some(CompilerBuiltin::StringSlice),
        Expression::StringToBytes(_) => Some(CompilerBuiltin::StringToBytes),
        Expression::ListLength(_) => Some(CompilerBuiltin::ListLength),
        Expression::ListConcat(_) => Some(CompilerBuiltin::ListConcat),
        Expression::ListGet(_) => Some(CompilerBuiltin::ListGet),
        Expression::ListAppend(_) => Some(CompilerBuiltin::ListAppend),
        Expression::Let(_) => Some(CompilerBuiltin::Let),
        Expression::Compiler(builtin) => Some(*builtin),
        _ => None,
    }
}

fn type_part_selection_value(state: &AppState, name: &str, fallback: &str) -> String {
    find_part_hash_by_name(state, name, Some(definy_event::event::PartType::Type))
        .map(|h| format!("ref:global:{h}"))
        .unwrap_or_else(|| fallback.to_string())
}

pub fn current_selection_value(
    state: &AppState,
    expression: &definy_event::event::Expression,
) -> String {
    if let Some(builtin) = expression_compiler_builtin(expression) {
        return find_builtin_part_hash(state, builtin)
            .map(|h| format!("ref:global:{h}"))
            .unwrap_or_else(|| compiler_builtin_fallback_value(builtin).to_string());
    }

    match expression {
        definy_event::event::Expression::String(_) => "expr:string".to_string(),
        definy_event::event::Expression::Boolean(_) => "expr:boolean".to_string(),
        definy_event::event::Expression::ListLiteral(_) => "expr:list".to_string(),
        definy_event::event::Expression::TypeLiteral(_) => "expr:type_literal".to_string(),
        definy_event::event::Expression::RecordGet(_) => "expr:record_get".to_string(),
        definy_event::event::Expression::TypeNumber => {
            type_part_selection_value(state, "number", "expr:type:number")
        }
        definy_event::event::Expression::TypeString => {
            type_part_selection_value(state, "string", "expr:type:string")
        }
        definy_event::event::Expression::TypeBoolean => {
            type_part_selection_value(state, "boolean", "expr:type:boolean")
        }
        definy_event::event::Expression::TypeList(_) => {
            type_part_selection_value(state, "list", "expr:type:list")
        }
        definy_event::event::Expression::Constructor(constructor_expression) => format!(
            "expr:constructor:{}",
            constructor_expression.type_part_definition_event_hash
        ),
        definy_event::event::Expression::Function(_) => "expr:function".to_string(),
        definy_event::event::Expression::Call(_) => "expr:call".to_string(),
        definy_event::event::Expression::TypeFunction(_) => "expr:type:function".to_string(),
        definy_event::event::Expression::TypeUnion(_) => "expr:type:union".to_string(),
        definy_event::event::Expression::Variant(variant_expr) => {
            format!("expr:variant:{}", variant_expr.tag)
        }
        definy_event::event::Expression::Match(_) => "expr:match".to_string(),
        definy_event::event::Expression::PartReference(part_ref) => {
            format!("ref:global:{}", part_ref.part_definition_event_hash)
        }
        definy_event::event::Expression::Variable(var_expr) => {
            format!("ref:local:{}", var_expr.variable_id)
        }
        _ => String::new(),
    }
}

pub(crate) fn find_builtin_part_hash(
    state: &AppState,
    target: definy_event::event::CompilerBuiltin,
) -> Option<EventHashId> {
    collect_part_snapshots(state)
        .into_iter()
        .find(|snapshot| match snapshot.expression.as_ref() {
            Some(definy_event::event::Expression::Compiler(builtin)) => *builtin == target,
            _ => false,
        })
        .map(|snapshot| snapshot.definition_event_hash)
}

pub(crate) fn find_part_hash_by_name(
    state: &AppState,
    name: &str,
    part_type: Option<definy_event::event::PartType>,
) -> Option<EventHashId> {
    collect_part_snapshots(state)
        .into_iter()
        .find(|snapshot| {
            snapshot.part_name == name && (part_type.is_none() || snapshot.part_type == part_type)
        })
        .map(|snapshot| snapshot.definition_event_hash)
}

#[cfg(test)]
#[path = "selector_tests.rs"]
mod tests;

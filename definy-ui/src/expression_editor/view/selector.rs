use std::collections::HashMap;
use std::str::FromStr;

use definy_event::EventHashId;
use dioxus::prelude::*;

use crate::app_state::{AppState, PathStep};
use crate::language::Language;
use crate::part_projection::collect_part_snapshots;

use super::super::diagnostics::constructor_default_value_from_type_part;
use super::super::mutation::{apply_selection, path_to_key};
use super::super::types::{ExpressionType, ScopeVariable};

pub fn allow_kind_change_for_nested_values(allow_kind_change: bool, path: &[PathStep]) -> bool {
    if allow_kind_change {
        return true;
    }
    path.iter()
        .any(|step| matches!(step, PathStep::ConstructorValue))
}

pub fn expression_selector(
    _state: &AppState,
    path: Vec<PathStep>,
    current_value: &str,
    options: &[(String, String)],
) -> Element {
    let name = format!("expr-kind-{}", path_to_key(path.as_slice()));

    let path_clone = path.clone();
    let current_val_str = current_value.to_string();
    let options_vec = options.to_vec();

    rsx! {
        crate::dropdown::SearchableDropdown {
            name,
            current_value: current_val_str,
            options: options_vec,
            compact: true,
            show_arrow: false,
            on_change: move |selected_value: String| {
                let state_sig = use_context::<Signal<AppState>>();
                let constructor_default = selected_value
                    .strip_prefix("expr:constructor:")
                    .and_then(|value| EventHashId::from_str(value).ok())
                    .map(|type_part_definition_event_hash| {
                        (
                            type_part_definition_event_hash.clone(),
                            constructor_default_value_from_type_part(
                                &state_sig.read(),
                                &type_part_definition_event_hash,
                            ),
                        )
                    });
                let mut expr_sig = use_context::<
                    Signal<Option<definy_event::event::Expression>>,
                >();
                let mut expr = expr_sig.read().clone();
                apply_selection(
                    &state_sig.read(),
                    &mut expr,
                    path_clone.as_slice(),
                    selected_value.as_str(),
                    constructor_default,
                );
                expr_sig.set(expr);
            },
        }
    }
}

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

    // Literals and generic constructors
    options.extend([
        ("expr:number".to_string(), "number\tLiteral\t".to_string()),
        ("expr:string".to_string(), "string\tLiteral\t".to_string()),
        ("expr:boolean".to_string(), "boolean\tLiteral\t".to_string()),
        ("expr:list".to_string(), "list\tLiteral\t".to_string()),
        (
            "expr:type_literal".to_string(),
            "record\tLiteral\t".to_string(),
        ),
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
        ("expr:if".to_string(), "if\tSyntax\t".to_string()),
        ("expr:let".to_string(), "let\tSyntax\t".to_string()),
        (
            "expr:function".to_string(),
            "function\tSyntax\t".to_string(),
        ),
        ("expr:call".to_string(), "call\tSyntax\t".to_string()),
        ("expr:match".to_string(), "match\tSyntax\t".to_string()),
        (
            "expr:type:number".to_string(),
            "Type: Number\tType\t".to_string(),
        ),
        (
            "expr:type:string".to_string(),
            "Type: String\tType\t".to_string(),
        ),
        (
            "expr:type:boolean".to_string(),
            "Type: Boolean\tType\t".to_string(),
        ),
        (
            "expr:type:list".to_string(),
            "Type: List\tType\t".to_string(),
        ),
        (
            "expr:type:function".to_string(),
            "Type: Function\tType\t".to_string(),
        ),
        (
            "expr:type:union".to_string(),
            "Type: Union\tType\t".to_string(),
        ),
    ]);

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
                super::super::diagnostics::part_type_to_expression_type(part_type),
            );
            if *part_type == definy_event::event::PartType::Type {
                constructor_options.push((
                    format!("expr:constructor:{}", snapshot.definition_event_hash),
                    format!(
                        "{}\tConstructor\t{}",
                        snapshot.part_name, snapshot.definition_event_hash
                    ),
                ));
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
        global_part_options.push((
            format!("ref:global:{}", snapshot.definition_event_hash),
            format!(
                "{}\t{}\t{}",
                snapshot.part_name, type_text, snapshot.definition_event_hash
            ),
        ));
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

    options.extend(constructor_options);
    options.extend(variant_options);
    options.extend(global_part_options);

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
        return Some(ExpressionType::Record);
    }
    if matches!(
        opt_val,
        "expr:add"
            | "expr:subtract"
            | "expr:multiply"
            | "expr:divide"
            | "expr:remainder"
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
            parameter: Box::new(ExpressionType::Unknown),
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
            (ExpressionType::Record, ExpressionType::Record) => true,
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
        "expr:if" | "expr:let" | "expr:call" | "expr:match" | "expr:list_get"
    ) {
        return 1;
    }

    2
}

pub(crate) fn current_selection_value(
    state: &AppState,
    expression: &definy_event::event::Expression,
) -> String {
    match expression {
        definy_event::event::Expression::Number(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::NumberLiteral)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:number".to_string())
        }
        definy_event::event::Expression::Add(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::Plus)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:add".to_string())
        }
        definy_event::event::Expression::Subtract(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::Minus)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:subtract".to_string())
        }
        definy_event::event::Expression::Multiply(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::Multiply)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:multiply".to_string())
        }
        definy_event::event::Expression::Divide(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::Divide)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:divide".to_string())
        }
        definy_event::event::Expression::Remainder(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::Remainder)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:remainder".to_string())
        }
        definy_event::event::Expression::If(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::If)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:if".to_string())
        }
        definy_event::event::Expression::Equal(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::Equal)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:equal".to_string())
        }
        definy_event::event::Expression::NotEqual(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::NotEqual)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:not_equal".to_string())
        }
        definy_event::event::Expression::LessThan(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::LessThan)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:less_than".to_string())
        }
        definy_event::event::Expression::LessThanOrEqual(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::LessThanOrEqual)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:less_than_or_equal".to_string())
        }
        definy_event::event::Expression::GreaterThan(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::GreaterThan)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:greater_than".to_string())
        }
        definy_event::event::Expression::GreaterThanOrEqual(_) => find_builtin_part_hash(
            state,
            definy_event::event::CompilerBuiltin::GreaterThanOrEqual,
        )
        .map(|h| format!("ref:global:{}", h))
        .unwrap_or_else(|| "expr:greater_than_or_equal".to_string()),
        definy_event::event::Expression::Not(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::Not)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:not".to_string())
        }
        definy_event::event::Expression::And(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::And)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:and".to_string())
        }
        definy_event::event::Expression::Or(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::Or)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:or".to_string())
        }
        definy_event::event::Expression::StringConcat(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::StringConcat)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:string_concat".to_string())
        }
        definy_event::event::Expression::StringLength(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::StringLength)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:string_length".to_string())
        }
        definy_event::event::Expression::StringSlice(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::StringSlice)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:string_slice".to_string())
        }
        definy_event::event::Expression::ListLength(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::ListLength)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:list_length".to_string())
        }
        definy_event::event::Expression::ListConcat(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::ListConcat)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:list_concat".to_string())
        }
        definy_event::event::Expression::ListGet(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::ListGet)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:list_get".to_string())
        }
        definy_event::event::Expression::ListAppend(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::ListAppend)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:list_append".to_string())
        }
        definy_event::event::Expression::Let(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::Let)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:let".to_string())
        }
        definy_event::event::Expression::Compiler(builtin) => {
            find_builtin_part_hash(state, *builtin)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| match builtin {
                    definy_event::event::CompilerBuiltin::Let => "expr:let".to_string(),
                    definy_event::event::CompilerBuiltin::Plus => "expr:add".to_string(),
                    definy_event::event::CompilerBuiltin::Minus => "expr:subtract".to_string(),
                    definy_event::event::CompilerBuiltin::Multiply => "expr:multiply".to_string(),
                    definy_event::event::CompilerBuiltin::Divide => "expr:divide".to_string(),
                    definy_event::event::CompilerBuiltin::Remainder => "expr:remainder".to_string(),
                    definy_event::event::CompilerBuiltin::Equal => "expr:equal".to_string(),
                    definy_event::event::CompilerBuiltin::NotEqual => "expr:not_equal".to_string(),
                    definy_event::event::CompilerBuiltin::LessThan => "expr:less_than".to_string(),
                    definy_event::event::CompilerBuiltin::LessThanOrEqual => {
                        "expr:less_than_or_equal".to_string()
                    }
                    definy_event::event::CompilerBuiltin::GreaterThan => {
                        "expr:greater_than".to_string()
                    }
                    definy_event::event::CompilerBuiltin::GreaterThanOrEqual => {
                        "expr:greater_than_or_equal".to_string()
                    }
                    definy_event::event::CompilerBuiltin::Not => "expr:not".to_string(),
                    definy_event::event::CompilerBuiltin::And => "expr:and".to_string(),
                    definy_event::event::CompilerBuiltin::Or => "expr:or".to_string(),
                    definy_event::event::CompilerBuiltin::StringConcat => {
                        "expr:string_concat".to_string()
                    }
                    definy_event::event::CompilerBuiltin::StringLength => {
                        "expr:string_length".to_string()
                    }
                    definy_event::event::CompilerBuiltin::StringSlice => {
                        "expr:string_slice".to_string()
                    }
                    definy_event::event::CompilerBuiltin::ListLength => {
                        "expr:list_length".to_string()
                    }
                    definy_event::event::CompilerBuiltin::ListConcat => {
                        "expr:list_concat".to_string()
                    }
                    definy_event::event::CompilerBuiltin::ListGet => "expr:list_get".to_string(),
                    definy_event::event::CompilerBuiltin::ListAppend => {
                        "expr:list_append".to_string()
                    }
                    definy_event::event::CompilerBuiltin::NumberLiteral => {
                        "expr:number".to_string()
                    }
                    definy_event::event::CompilerBuiltin::If => "expr:if".to_string(),
                    definy_event::event::CompilerBuiltin::Function => "expr:function".to_string(),
                    definy_event::event::CompilerBuiltin::Call => "expr:call".to_string(),
                })
        }
        definy_event::event::Expression::String(_) => "expr:string".to_string(),
        definy_event::event::Expression::Boolean(_) => "expr:boolean".to_string(),
        definy_event::event::Expression::ListLiteral(_) => "expr:list".to_string(),
        definy_event::event::Expression::TypeLiteral(_) => "expr:type_literal".to_string(),
        definy_event::event::Expression::TypeNumber => "expr:type:number".to_string(),
        definy_event::event::Expression::TypeString => "expr:type:string".to_string(),
        definy_event::event::Expression::TypeBoolean => "expr:type:boolean".to_string(),
        definy_event::event::Expression::TypeList(_) => "expr:type:list".to_string(),
        definy_event::event::Expression::Constructor(constructor_expression) => format!(
            "expr:constructor:{}",
            constructor_expression.type_part_definition_event_hash
        ),
        definy_event::event::Expression::Function(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::Function)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:function".to_string())
        }
        definy_event::event::Expression::Call(_) => {
            find_builtin_part_hash(state, definy_event::event::CompilerBuiltin::Call)
                .map(|h| format!("ref:global:{}", h))
                .unwrap_or_else(|| "expr:call".to_string())
        }
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn test_selector_options_sorted_for_number() {
        let state = AppState::default();
        let options = selector_options(
            &state,
            Language::English,
            &[],
            false,
            Some(&ExpressionType::Number),
            &HashMap::new(),
        );

        // First options should be Number compatible (number literal, arithmetic, etc.)
        let first_three_keys: Vec<&str> = options.iter().take(3).map(|(k, _)| k.as_str()).collect();
        assert!(
            first_three_keys.contains(&"expr:number"),
            "Expected 'expr:number' near top when expecting Number, got: {:?}",
            first_three_keys
        );
        assert!(
            first_three_keys.contains(&"expr:add"),
            "Expected 'expr:add' near top when expecting Number, got: {:?}",
            first_three_keys
        );
    }

    #[test]
    fn test_selector_options_sorted_for_boolean() {
        let state = AppState::default();
        let options = selector_options(
            &state,
            Language::English,
            &[],
            false,
            Some(&ExpressionType::Boolean),
            &HashMap::new(),
        );

        // First options should be Boolean compatible
        let first_three_keys: Vec<&str> = options.iter().take(3).map(|(k, _)| k.as_str()).collect();
        assert!(
            first_three_keys.contains(&"expr:boolean"),
            "Expected 'expr:boolean' near top when expecting Boolean, got: {:?}",
            first_three_keys
        );
        assert!(
            first_three_keys.contains(&"expr:equal"),
            "Expected 'expr:equal' near top when expecting Boolean, got: {:?}",
            first_three_keys
        );
    }

    #[test]
    fn test_selector_options_sorted_for_type() {
        let state = AppState::default();
        let options = selector_options(
            &state,
            Language::English,
            &[],
            false,
            Some(&ExpressionType::Type),
            &HashMap::new(),
        );

        // First options should be Type compatible
        let first_keys: Vec<&str> = options.iter().take(4).map(|(k, _)| k.as_str()).collect();
        assert!(
            first_keys.contains(&"expr:type_literal")
                || first_keys.iter().any(|k| k.starts_with("expr:type:")),
            "Expected type options near top when expecting Type, got: {:?}",
            first_keys
        );
    }

    #[test]
    fn test_selector_options_sorted_for_union() {
        let state = AppState::default();
        let options = selector_options(
            &state,
            Language::English,
            &[],
            false,
            Some(&ExpressionType::Union),
            &HashMap::new(),
        );

        // First options should be Union compatible (e.g. expr:variant:some, expr:variant:none)
        let first_keys: Vec<&str> = options.iter().take(3).map(|(k, _)| k.as_str()).collect();
        assert!(
            first_keys.iter().any(|k| k.starts_with("expr:variant:")),
            "Expected variant options near top when expecting Union, got: {:?}",
            first_keys
        );
    }

    #[test]
    fn test_current_selection_value_for_variant() {
        let state = AppState::default();
        let some_expr =
            definy_event::event::Expression::Variant(definy_event::event::VariantExpression {
                tag: "some".into(),
                payload: Some(Box::new(definy_event::event::Expression::Number(
                    definy_event::event::NumberExpression { value: 42 },
                ))),
                type_part_definition_event_hash: None,
            });
        assert_eq!(
            current_selection_value(&state, &some_expr),
            "expr:variant:some"
        );

        let none_expr =
            definy_event::event::Expression::Variant(definy_event::event::VariantExpression {
                tag: "none".into(),
                payload: None,
                type_part_definition_event_hash: None,
            });
        assert_eq!(
            current_selection_value(&state, &none_expr),
            "expr:variant:none"
        );
    }
}

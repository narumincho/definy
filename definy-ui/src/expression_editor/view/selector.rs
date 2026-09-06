use std::str::FromStr;

use definy_event::EventHashId;
use dioxus::prelude::*;

use crate::app_state::{AppState, PathStep};
use crate::language::Language;
use crate::part_projection::collect_part_snapshots;

use super::super::diagnostics::constructor_default_value_from_type_part;
use super::super::mutation::{
    apply_selection, path_to_key, selector_prefix, target_expression_mut,
};
use super::super::types::{EditorTarget, ScopeVariable};

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
    target: EditorTarget,
    current_value: &str,
    options: &[(String, String)],
) -> Element {
    let name = format!(
        "{}-expr-kind-{}",
        selector_prefix(target),
        path_to_key(path.as_slice())
    );

    let path_clone = path.clone();
    let current_val_str = current_value.to_string();
    let options_vec = options.to_vec();

    rsx! {
        crate::dropdown::SearchableDropdown {
            name,
            current_value: current_val_str,
            options: options_vec,
            compact: true,
            on_change: move |selected_value: String| {
                let mut state_sig = use_context::<Signal<AppState>>();
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
                let mut state_val = state_sig.read().clone();
                let root_expression = target_expression_mut(&mut state_val, target);
                apply_selection(
                    &state_sig.read(),
                    root_expression,
                    path_clone.as_slice(),
                    selected_value.as_str(),
                    constructor_default,
                );
                state_sig.set(state_val);
            },
        }
    }
}

pub fn selector_options(
    state: &AppState,
    language: Language,
    scope_variables: &[ScopeVariable],
    is_root: bool,
) -> Vec<(String, String)> {
    let snapshots = collect_part_snapshots(state);
    let mut options = Vec::new();

    if is_root {
        options.push((
            "expr:none".to_string(),
            format!("{}\t\t", language.label("None", "なし", "Neniu")),
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
        ("expr:number".to_string(), "Number\tLiteral\t".to_string()),
        ("expr:string".to_string(), "String\tLiteral\t".to_string()),
        ("expr:boolean".to_string(), "Boolean\tLiteral\t".to_string()),
        ("expr:list".to_string(), "List\tLiteral\t".to_string()),
        (
            "expr:type_literal".to_string(),
            "Record\tLiteral\t".to_string(),
        ),
        ("expr:add".to_string(), "Add (+)\tFunction\t".to_string()),
        (
            "expr:subtract".to_string(),
            "Subtract (-)\tFunction\t".to_string(),
        ),
        (
            "expr:multiply".to_string(),
            "Multiply (*)\tFunction\t".to_string(),
        ),
        (
            "expr:divide".to_string(),
            "Divide (/)\tFunction\t".to_string(),
        ),
        (
            "expr:remainder".to_string(),
            "Remainder (%)\tFunction\t".to_string(),
        ),
        (
            "expr:equal".to_string(),
            "Equal (==)\tFunction\t".to_string(),
        ),
        (
            "expr:not_equal".to_string(),
            "Not Equal (!=)\tFunction\t".to_string(),
        ),
        (
            "expr:less_than".to_string(),
            "Less Than (<)\tFunction\t".to_string(),
        ),
        (
            "expr:less_than_or_equal".to_string(),
            "Less Than or Equal (<=)\tFunction\t".to_string(),
        ),
        (
            "expr:greater_than".to_string(),
            "Greater Than (>)\tFunction\t".to_string(),
        ),
        (
            "expr:greater_than_or_equal".to_string(),
            "Greater Than or Equal (>=)\tFunction\t".to_string(),
        ),
        ("expr:not".to_string(), "Not (not)\tFunction\t".to_string()),
        ("expr:and".to_string(), "And (and)\tFunction\t".to_string()),
        ("expr:or".to_string(), "Or (or)\tFunction\t".to_string()),
        (
            "expr:string_concat".to_string(),
            "String Concat (string_concat)\tFunction\t".to_string(),
        ),
        (
            "expr:string_length".to_string(),
            "String Length (string_length)\tFunction\t".to_string(),
        ),
        (
            "expr:string_slice".to_string(),
            "String Slice (string_slice)\tFunction\t".to_string(),
        ),
        (
            "expr:list_length".to_string(),
            "List Length (list_length)\tFunction\t".to_string(),
        ),
        (
            "expr:list_concat".to_string(),
            "List Concat (list_concat)\tFunction\t".to_string(),
        ),
        (
            "expr:list_get".to_string(),
            "List Get (list_get)\tFunction\t".to_string(),
        ),
        (
            "expr:list_append".to_string(),
            "List Append (list_append)\tFunction\t".to_string(),
        ),
        ("expr:if".to_string(), "If\tSyntax\t".to_string()),
        ("expr:let".to_string(), "Let\tSyntax\t".to_string()),
    ]);

    // Type constructors
    options.extend(snapshots.iter().filter_map(|snapshot| {
        if snapshot.part_type == Some(definy_event::event::PartType::Type) {
            Some((
                format!("expr:constructor:{}", snapshot.definition_event_hash),
                format!(
                    "{}\tConstructor\t{}",
                    snapshot.part_name, snapshot.definition_event_hash
                ),
            ))
        } else {
            None
        }
    }));

    // Global Parts
    options.extend(snapshots.into_iter().map(|snapshot| {
        let type_text = snapshot
            .part_type
            .as_ref()
            .map(crate::part_list::part_type_text)
            .unwrap_or_else(|| "Part".to_string());
        (
            format!("ref:global:{}", snapshot.definition_event_hash),
            format!(
                "{}\t{}\t{}",
                snapshot.part_name, type_text, snapshot.definition_event_hash
            ),
        )
    }));

    options
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

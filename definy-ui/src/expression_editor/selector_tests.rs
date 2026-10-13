use super::*;
use crate::expression_editor::types::FunctionParameterTypeInfo;
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
fn test_lambda_selector_is_only_available_for_function_expectations() {
    let state = AppState::default();
    let function_type = ExpressionType::Function {
        parameters: vec![FunctionParameterTypeInfo {
            name: "x".to_string(),
            r#type: ExpressionType::Number,
        }],
        return_type: Box::new(ExpressionType::Number),
    };
    let function_options = selector_options(
        &state,
        Language::English,
        &[],
        false,
        Some(&function_type),
        &HashMap::new(),
    );
    assert!(
        function_options
            .iter()
            .any(|(value, _)| value == "expr:function")
    );

    let number_options = selector_options(
        &state,
        Language::English,
        &[],
        false,
        Some(&ExpressionType::Number),
        &HashMap::new(),
    );
    assert!(
        !number_options
            .iter()
            .any(|(value, _)| value == "expr:function")
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

#[test]
fn test_function_and_call_use_syntax_selector_values() {
    let state = AppState::default();
    let function =
        definy_event::event::Expression::Function(definy_event::event::FunctionExpression {
            parameters: vec![definy_event::event::FunctionParameter {
                parameter_id: 1,
                parameter_name: "value".into(),
            }],
            body: Box::new(definy_event::event::Expression::Variable(
                definy_event::event::VariableExpression { variable_id: 1 },
            )),
        });
    let call = definy_event::event::Expression::Call(definy_event::event::CallExpression {
        function: Box::new(definy_event::event::Expression::Variable(
            definy_event::event::VariableExpression { variable_id: 1 },
        )),
        arguments: vec![definy_event::event::CallArgument {
            name: "value".into(),
            value: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 1 },
            )),
        }],
    });

    assert_eq!(current_selection_value(&state, &function), "expr:function");
    assert_eq!(current_selection_value(&state, &call), "expr:call");
}

#[test]
fn test_selector_options_with_snapshots_has_part_links() {
    use definy_event::event::{
        AccountId, Description, Event, EventContent, ModuleCommitEvent, ModulePartEntry, PartType,
    };

    let mut state = AppState::default();
    let signing_key = ed25519_dalek::SigningKey::from_bytes(&[1u8; 32]);
    let account_id = AccountId(signing_key.verifying_key());

    let commit_event = Event {
        account_id: account_id.clone(),
        time: chrono::DateTime::UNIX_EPOCH,
        content: EventContent::ModuleCommit(ModuleCommitEvent {
            module_name: "core".into(),
            module_description: Description::localized(vec![("en", "core module")]),
            parent_commit_hash: None,
            message: "Initial commit".into(),
            parts: vec![
                ModulePartEntry {
                    name: "number".into(),
                    part_type: Some(PartType::Type),
                    description: Description::localized(vec![("en", "number type")]),
                    content_hash: None,
                    expression: None,
                },
                ModulePartEntry {
                    name: "number-literal".into(),
                    part_type: Some(PartType::Number),
                    description: Description::localized(vec![("en", "number literal")]),
                    content_hash: None,
                    expression: Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::NumberLiteral,
                    )),
                },
            ],
        }),
    };
    let commit_bytes = definy_event::sign_and_serialize(commit_event, &signing_key).unwrap();
    let commit_hash = EventHashId::from_bytes(&commit_bytes);
    state.event_cache.insert(
        commit_hash.clone(),
        definy_event::verify_and_deserialize(&commit_bytes),
    );

    let mod_id = definy_event::event::derive_module_id(&account_id, "core");
    let number_hash = definy_event::event::derive_module_part_id(&mod_id, "number");
    let num_lit_hash = definy_event::event::derive_module_part_id(&mod_id, "number-literal");

    // When expecting Type: "number" part should be at the top
    let type_options = selector_options(
        &state,
        Language::English,
        &[],
        false,
        Some(&ExpressionType::Type),
        &HashMap::new(),
    );
    let number_part_key = format!("ref:global:{}", number_hash);
    let top_keys_type: Vec<&str> = type_options
        .iter()
        .take(2)
        .map(|(k, _)| k.as_str())
        .collect();
    assert!(
        top_keys_type.contains(&number_part_key.as_str()),
        "Expected 'number' part at top when expecting Type, got: {:?}",
        top_keys_type
    );

    // When expecting Number: "number-literal" should be at the top, "number" part should be lower
    let number_options = selector_options(
        &state,
        Language::English,
        &[],
        false,
        Some(&ExpressionType::Number),
        &HashMap::new(),
    );
    let num_lit_key = format!("ref:global:{}", num_lit_hash);
    let top_keys_num: Vec<&str> = number_options
        .iter()
        .take(2)
        .map(|(k, _)| k.as_str())
        .collect();
    assert!(
        top_keys_num.contains(&num_lit_key.as_str()),
        "Expected 'number-literal' at top when expecting Number, got: {:?}",
        top_keys_num
    );
    assert!(
        !top_keys_num.contains(&number_part_key.as_str()),
        "'number' type part should not be at top when expecting Number"
    );

    // current_selection_value for Expression::TypeNumber should match the part hash
    assert_eq!(
        current_selection_value(&state, &definy_event::event::Expression::TypeNumber),
        number_part_key
    );

    // Label for number part should have name "number" and type "type"
    let (_, number_label) = type_options
        .iter()
        .find(|(k, _)| k == &number_part_key)
        .unwrap();
    let label_parts: Vec<&str> = number_label.split('\t').collect();
    assert_eq!(label_parts[0], "number");
    assert_eq!(label_parts[1], "type");
    assert_eq!(label_parts[2], number_hash.to_string());
}

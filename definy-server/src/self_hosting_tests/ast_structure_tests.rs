//! セルフホスティング関連ビルトインパーツの登録および静的 AST 構造検証テスト。
//!
//! evaluator, type-checker, wasm-compiler, formatter, validator の
//! 各パーツが正しいメタデータ、型アノテーション、および式 AST パターンマッチ構造を持つことを検証します。

use std::collections::HashSet;

use definy_event::event::{Expression, MatchArm};

use super::helpers::seed_part;

/// 全セルフホスティング用パーツの重複なき登録、型定義、説明文の存在を検証します。
#[test]
fn test_self_hosting_parts_registration() {
    // Phase 1 parts
    let val_part = seed_part("value");
    let env_part = seed_part("env");
    let env_lookup_part = seed_part("env-lookup");
    let env_lookup_inner_part = seed_part("env-lookup-inner");
    let env_extend_part = seed_part("env-extend");
    let eval_value_part = seed_part("eval-value");

    // Phase 2 parts
    let type_err_part = seed_part("type-error");
    let type_res_part = seed_part("type-result");
    let type_env_part = seed_part("type-env");
    let type_env_lookup = seed_part("type-env-lookup");
    let type_env_lookup_inner = seed_part("type-env-lookup-inner");
    let type_env_extend = seed_part("type-env-extend");
    let part_type_env = seed_part("part-type-env");
    let part_type_lookup = seed_part("part-type-lookup");
    let part_type_lookup_inner = seed_part("part-type-lookup-inner");
    let type_env_lookup_part = seed_part("type-env-lookup-part");
    let type_equals = seed_part("type-equals");
    let type_equals_record_fields = seed_part("type-equals-record-fields");
    let type_equals_union_variants = seed_part("type-equals-union-variants");
    let type_assignable_record_fields = seed_part("type-assignable-record-fields");
    let union_variant_type_lookup = seed_part("union-variant-type-lookup");
    let find_tag_in_arms = seed_part("find-tag-in-arms");
    let check_union_exhaustiveness = seed_part("check-union-exhaustiveness");
    let type_assignable_union_variants = seed_part("type-assignable-union-variants");
    let type_check_match_arms_inner = seed_part("type-check-match-arms-inner");
    let type_check_match_arms = seed_part("type-check-match-arms");
    let type_check_list_items = seed_part("type-check-list-items");
    let type_check_list = seed_part("type-check-list");
    let type_assignable = seed_part("type-assignable");
    let type_check = seed_part("type-check");
    let type_check_against = seed_part("type-check-against");

    // Phase 3 parts
    let compile_instr = seed_part("compile-expr-instructions");
    let compile_to_wasm = seed_part("compile-to-wasm");

    // Formatter part
    let expr_to_source = seed_part("expression-to-source");

    // Validator parts
    let collect_part_type_env_inner = seed_part("collect-part-type-env-inner");
    let collect_part_type_env = seed_part("collect-part-type-env");
    let validate_part_in_env = seed_part("validate-part-in-env");
    let validate_part = seed_part("validate-part");
    let validate_parts_in_env = seed_part("validate-parts-in-env");
    let validate_parts = seed_part("validate-parts");
    let validate_module = seed_part("validate-module");

    // Optimizer part
    let optimize_expr = seed_part("optimize-expression");

    // Value equals parts
    let val_equals = seed_part("value-equals");
    let val_equals_record_fields = seed_part("value-equals-record-fields");

    // Record evaluation parts
    let record_field_lookup = seed_part("record-field-lookup");
    let eval_record_fields = seed_part("eval-record-fields");

    // Record type checking parts
    let record_field_type_lookup = seed_part("record-field-type-lookup");
    let check_record_fields = seed_part("type-check-record-fields");

    // Pattern match evaluation parts
    let eval_match_arms = seed_part("eval-match-arms");
    let eval_match_arms_inner = seed_part("eval-match-arms-inner");

    // List operations parts
    let list_map = seed_part("list-map");
    let list_map_inner = seed_part("list-map-inner");
    let list_fold = seed_part("list-fold");
    let list_fold_inner = seed_part("list-fold-inner");

    let all_parts = vec![
        val_part,
        env_part,
        env_lookup_part,
        env_lookup_inner_part,
        env_extend_part,
        eval_value_part,
        type_err_part,
        type_res_part,
        type_env_part,
        type_env_lookup,
        type_env_lookup_inner,
        type_env_extend,
        part_type_env,
        part_type_lookup,
        part_type_lookup_inner,
        type_env_lookup_part,
        type_equals,
        type_equals_record_fields,
        type_equals_union_variants,
        record_field_type_lookup,
        check_record_fields,
        type_assignable_record_fields,
        union_variant_type_lookup,
        find_tag_in_arms,
        check_union_exhaustiveness,
        type_assignable_union_variants,
        type_check_match_arms_inner,
        type_check_match_arms,
        type_check_list_items,
        type_check_list,
        type_assignable,
        type_check,
        type_check_against,
        compile_instr,
        compile_to_wasm,
        expr_to_source,
        collect_part_type_env_inner,
        collect_part_type_env,
        validate_part_in_env,
        validate_part,
        validate_parts_in_env,
        validate_parts,
        validate_module,
        optimize_expr,
        val_equals,
        val_equals_record_fields,
        record_field_lookup,
        eval_record_fields,
        eval_match_arms,
        eval_match_arms_inner,
        list_map,
        list_map_inner,
        list_fold,
        list_fold_inner,
    ];

    let mut names = HashSet::new();
    for part in all_parts {
        assert!(
            part.part_type.is_some(),
            "Part {} must have a part_type",
            part.name
        );
        let has_desc = match &part.description {
            definy_event::event::Description::Plain(s) => !s.is_empty(),
            definy_event::event::Description::Localized(v) => !v.is_empty(),
        };
        assert!(has_desc, "Part {} must have a description", part.name);
        assert!(
            names.insert(part.name.clone()),
            "Duplicate part name detected: {}",
            part.name
        );
    }
}

#[test]
fn test_phase1_evaluator_ast_structure() {
    let eval_part = seed_part("eval-value");
    let expr = eval_part
        .expression
        .expect("eval-value must have expression");

    // Structure: Function([expr, env] -> Match(expr))
    let (params, match_expr) = match expr {
        Expression::Function(f) => (f.parameters, *f.body),
        other => panic!("Expected Function, got: {:?}", other),
    };
    assert_eq!(params.len(), 2);
    assert_eq!(params[0].parameter_id, 0);
    assert_eq!(&*params[0].parameter_name, "expr");
    assert_eq!(params[1].parameter_id, 1);
    assert_eq!(&*params[1].parameter_name, "env");

    let match_arms: Vec<MatchArm> = match match_expr {
        Expression::Match(m) => m.arms,
        other => panic!("Expected Match expression, got: {:?}", other),
    };

    let arm_tags: HashSet<String> = match_arms.into_iter().map(|a| a.tag.to_string()).collect();

    // Verify presence of all expected built-in expression tags in interpreter match
    let expected_tags = [
        "number",
        "string",
        "boolean",
        "add",
        "subtract",
        "multiply",
        "divide",
        "remainder",
        "equal",
        "less_than",
        "variable",
        "function",
        "call",
        "let",
        "record",
        "record_get",
        "not",
        "and",
        "or",
        "_",
    ];

    for tag in expected_tags {
        assert!(
            arm_tags.contains(tag),
            "core.eval-value match arms must contain tag: '{}', found: {:?}",
            tag,
            arm_tags
        );
    }
}

#[test]
fn test_phase2_type_checker_ast_structure() {
    let type_check_part = seed_part("type-check");
    let expr = type_check_part
        .expression
        .expect("type-check must have expression");

    // Structure: Function([expr, env] -> Match(expr))
    let (params, match_expr) = match expr {
        Expression::Function(f) => (f.parameters, *f.body),
        other => panic!("Expected Function, got: {:?}", other),
    };
    assert_eq!(params.len(), 2);
    assert_eq!(params[0].parameter_id, 0);
    assert_eq!(&*params[0].parameter_name, "expr");
    assert_eq!(params[1].parameter_id, 1);
    assert_eq!(&*params[1].parameter_name, "env");

    let match_arms: Vec<MatchArm> = match match_expr {
        Expression::Match(m) => m.arms,
        other => panic!("Expected Match expression, got: {:?}", other),
    };

    let arm_tags: HashSet<String> = match_arms.into_iter().map(|a| a.tag.to_string()).collect();

    let expected_tags = [
        "number",
        "string",
        "boolean",
        "add",
        "subtract",
        "multiply",
        "divide",
        "equal",
        "less_than",
        "variable",
        "let",
        "record",
        "record_get",
        "variant",
        "match",
        "list",
        "not",
        "and",
        "or",
        "_",
    ];

    for tag in expected_tags {
        assert!(
            arm_tags.contains(tag),
            "core.type-check match arms must contain tag: '{}', found: {:?}",
            tag,
            arm_tags
        );
    }

    // Test type-equals part
    let type_equals_part = seed_part("type-equals");
    assert!(type_equals_part.expression.is_some());
}

#[test]
fn test_phase3_wasm_compiler_ast_structure() {
    let compile_instr_part = seed_part("compile-expr-instructions");
    let expr = compile_instr_part
        .expression
        .expect("compile-expr-instructions must have expression");

    // Structure: Function(expr -> Match(expr))
    let match_arms = match expr {
        Expression::Function(f) => match *f.body {
            Expression::Match(m) => m.arms,
            other => panic!("Expected Match in body, got: {:?}", other),
        },
        other => panic!("Expected Function, got: {:?}", other),
    };

    let arm_tags: HashSet<String> = match_arms.into_iter().map(|a| a.tag.to_string()).collect();
    let expected_tags = [
        "number",
        "add",
        "subtract",
        "multiply",
        "divide",
        "equal",
        "less_than",
        "and",
        "or",
        "not",
        "_",
    ];

    for tag in expected_tags {
        assert!(
            arm_tags.contains(tag),
            "core.compile-expr-instructions arms must contain: '{}'",
            tag
        );
    }

    // Test compile-to-wasm module generator structure
    let compile_to_wasm_part = seed_part("compile-to-wasm");
    let to_wasm_expr = compile_to_wasm_part
        .expression
        .expect("compile-to-wasm must have expression");

    // The expression should be a function([expr] -> Let*(ListConcat(...)))
    match to_wasm_expr {
        Expression::Function(f) => {
            assert_eq!(f.parameters.len(), 1);
            assert_eq!(f.parameters[0].parameter_id, 0);
            assert_eq!(&*f.parameters[0].parameter_name, "expr");
            let mut current = &*f.body;
            while let Expression::Let(let_expr) = current {
                current = &*let_expr.body;
            }
            match current {
                Expression::ListConcat(_) => {}
                other => {
                    panic!(
                        "Expected ListConcat at core of module assembler, got: {:?}",
                        other
                    )
                }
            }
        }
        other => panic!("Expected Function, got: {:?}", other),
    }
}

#[test]
fn test_phase3_wasm_binary_structure_validation() {
    // Validate WebAssembly binary emission rules:
    // Magic header: \0asm
    let magic = [0x00u8, 0x61, 0x73, 0x6d];
    // Version 1
    let version = [0x01u8, 0x00, 0x00, 0x00];

    // Type Section: 1 type () -> i64
    let type_sec = [0x01u8, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7e];
    // Function Section: 1 func of type 0
    let func_sec = [0x03u8, 0x02, 0x01, 0x00];
    // Export Section: "main" -> func 0
    let export_sec = [0x07u8, 0x08, 0x01, 0x04, b'm', b'a', b'i', b'n', 0x00, 0x00];

    // Instructions for 42 + 8:
    let _instr = [0x42u8, 42, 0x42, 8, 0x7c, 0x0b];
    // Code Section:
    // Section id: 0x0a
    // Section size: 1 (count) + 1 (body size) + 1 (locals count) + 6 (instr) = 9
    // Function count: 1
    // Function body size: 1 (locals count) + 6 (instr) = 7
    // Locals count: 0
    let code_sec = [0x0au8, 9, 1, 7, 0, 0x42, 42, 0x42, 8, 0x7c, 0x0b];

    let mut wasm_binary = Vec::new();
    wasm_binary.extend_from_slice(&magic);
    wasm_binary.extend_from_slice(&version);
    wasm_binary.extend_from_slice(&type_sec);
    wasm_binary.extend_from_slice(&func_sec);
    wasm_binary.extend_from_slice(&export_sec);
    wasm_binary.extend_from_slice(&code_sec);

    // Verify valid Wasm Magic & Version
    assert_eq!(&wasm_binary[0..4], b"\0asm");
    assert_eq!(&wasm_binary[4..8], &[1, 0, 0, 0]);

    // Verify that sections appear in the mandatory WebAssembly order (1, 3, 7, 10)
    let mut section_ids = Vec::new();
    let mut idx = 8;
    while idx < wasm_binary.len() {
        let sec_id = wasm_binary[idx];
        section_ids.push(sec_id);
        let sec_len = wasm_binary[idx + 1] as usize;
        idx += 2 + sec_len;
    }

    assert_eq!(section_ids, vec![1, 3, 7, 10]);
}

#[test]
fn test_formatter_ast_structure() {
    let formatter_part = seed_part("expression-to-source");
    let expr = formatter_part
        .expression
        .expect("expression-to-source must have expression");

    let match_arms = match expr {
        Expression::Function(f) => match *f.body {
            Expression::Match(m) => m.arms,
            other => panic!("Expected Match in formatter body, got: {:?}", other),
        },
        other => panic!("Expected Function, got: {:?}", other),
    };

    let arm_tags: HashSet<String> = match_arms.into_iter().map(|a| a.tag.to_string()).collect();
    let expected_tags = [
        "number",
        "string",
        "boolean",
        "add",
        "subtract",
        "multiply",
        "divide",
        "remainder",
        "equal",
        "less_than",
        "and",
        "or",
        "not",
        "variable",
        "match",
        "call",
        "_",
    ];

    for tag in expected_tags {
        assert!(
            arm_tags.contains(tag),
            "core.expression-to-source arms must contain: '{}'",
            tag
        );
    }
}

#[test]
fn test_validator_ast_structure() {
    let val_part = seed_part("validate-part");
    let expr = val_part
        .expression
        .expect("validate-part must have expression");

    // validate-part: Function([part] => Call(validate-part-in-env, &[("part", ...), ("env", ...)]))
    match expr {
        Expression::Function(f) => {
            assert_eq!(f.parameters.len(), 1);
            assert_eq!(f.parameters[0].parameter_id, 0);
            assert_eq!(&*f.parameters[0].parameter_name, "part");
            assert!(matches!(*f.body, Expression::Call(_)));
        }
        other => panic!("Expected Function, got: {:?}", other),
    }

    // validate-part-in-env: Function([part, env] => Match(...))
    let val_in_env_part = seed_part("validate-part-in-env");
    let in_env_expr = val_in_env_part
        .expression
        .expect("validate-part-in-env must have expression");

    match in_env_expr {
        Expression::Function(f) => {
            assert_eq!(f.parameters.len(), 2);
            assert_eq!(f.parameters[0].parameter_id, 0);
            assert_eq!(&*f.parameters[0].parameter_name, "part");
            assert_eq!(f.parameters[1].parameter_id, 1);
            assert_eq!(&*f.parameters[1].parameter_name, "env");
            match *f.body {
                Expression::Match(m) => {
                    let arm_tags: HashSet<String> =
                        m.arms.into_iter().map(|a| a.tag.to_string()).collect();
                    assert!(arm_tags.contains("ok"));
                    assert!(arm_tags.contains("error"));
                    assert!(arm_tags.contains("_"));
                }
                other => panic!("Expected Match in validate-part-in-env, got: {:?}", other),
            }
        }
        other => panic!("Expected Function, got: {:?}", other),
    }
}

/// `core.optimize-expression` の AST 構造（関数、マッチアームのタグ構成）を検証します。
#[test]
fn test_optimizer_ast_structure() {
    let opt_part = seed_part("optimize-expression");
    let expr = opt_part
        .expression
        .expect("optimize-expression must have expression");

    match expr {
        Expression::Function(f) => {
            assert_eq!(f.parameters.len(), 1);
            assert_eq!(f.parameters[0].parameter_id, 0);
            assert_eq!(&*f.parameters[0].parameter_name, "expr");
            match *f.body {
                Expression::Match(m) => {
                    let arm_tags: HashSet<String> =
                        m.arms.into_iter().map(|a| a.tag.to_string()).collect();
                    assert!(arm_tags.contains("number"));
                    assert!(arm_tags.contains("boolean"));
                    assert!(arm_tags.contains("add"));
                    assert!(arm_tags.contains("subtract"));
                    assert!(arm_tags.contains("multiply"));
                    assert!(arm_tags.contains("match"));
                    assert!(arm_tags.contains("not"));
                    assert!(arm_tags.contains("_"));
                }
                other => panic!("Expected Match in optimize-expression, got: {:?}", other),
            }
        }
        other => panic!("Expected Function, got: {:?}", other),
    }
}

/// `core.validate-module` の AST 構造（関数、モジュール名・パーツ検証の論理結合）を検証します。
#[test]
fn test_validate_module_ast_structure() {
    let val_mod_part = seed_part("validate-module");
    let expr = val_mod_part
        .expression
        .expect("validate-module must have expression");

    match expr {
        Expression::Function(f) => {
            assert_eq!(f.parameters.len(), 1);
            assert_eq!(f.parameters[0].parameter_id, 0);
            assert_eq!(&*f.parameters[0].parameter_name, "mod_def");
            match *f.body {
                Expression::Match(m) => {
                    let arm_tags: HashSet<String> =
                        m.arms.into_iter().map(|a| a.tag.to_string()).collect();
                    assert!(arm_tags.contains("true"));
                    assert!(arm_tags.contains("false"));
                }
                other => panic!("Expected boolean Match in validate-module, got: {:?}", other),
            }
        }
        other => panic!("Expected Function, got: {:?}", other),
    }
}

/// `core.value-equals` の AST 構造（複数引数関数、パターンマッチ）を検証します。
#[test]
fn test_value_equals_ast_structure() {
    let val_eq_part = seed_part("value-equals");
    let expr = val_eq_part.expression.expect("value-equals expression");

    match expr {
        Expression::Function(f) => {
            assert_eq!(f.parameters.len(), 2);
            assert_eq!(f.parameters[0].parameter_id, 0);
            assert_eq!(&*f.parameters[0].parameter_name, "val_a");
            assert_eq!(f.parameters[1].parameter_id, 1);
            assert_eq!(&*f.parameters[1].parameter_name, "val_b");
            match *f.body {
                Expression::Match(m) => {
                    let tags: HashSet<String> = m.arms.iter().map(|a| a.tag.to_string()).collect();
                    assert!(tags.contains("number"));
                    assert!(tags.contains("string"));
                    assert!(tags.contains("boolean"));
                    assert!(tags.contains("unit"));
                    assert!(tags.contains("variant"));
                    assert!(tags.contains("record"));
                    assert!(tags.contains("_"));
                }
                other => panic!("Expected Match, got {:?}", other),
            }
        }
        other => panic!("Expected Function, got {:?}", other),
    }
}

/// `core.list-map` および `core.list-fold` の AST 構造を検証します。
#[test]
fn test_list_ops_ast_structure() {
    let list_map_part = seed_part("list-map");
    let list_fold_part = seed_part("list-fold");

    match list_map_part.expression.expect("list-map expression") {
        Expression::Function(f) => {
            assert_eq!(f.parameters.len(), 2);
            assert_eq!(f.parameters[0].parameter_id, 0);
            assert_eq!(&*f.parameters[0].parameter_name, "f");
            assert_eq!(f.parameters[1].parameter_id, 1);
            assert_eq!(&*f.parameters[1].parameter_name, "xs");
            assert!(matches!(*f.body, Expression::Call(_)));
        }
        other => panic!("Expected Function in list-map, got {:?}", other),
    }

    match list_fold_part.expression.expect("list-fold expression") {
        Expression::Function(f) => {
            assert_eq!(f.parameters.len(), 3);
            assert_eq!(f.parameters[0].parameter_id, 0);
            assert_eq!(&*f.parameters[0].parameter_name, "reducer");
            assert_eq!(f.parameters[1].parameter_id, 1);
            assert_eq!(&*f.parameters[1].parameter_name, "init");
            assert_eq!(f.parameters[2].parameter_id, 2);
            assert_eq!(&*f.parameters[2].parameter_name, "xs");
            assert!(matches!(*f.body, Expression::Call(_)));
        }
        other => panic!("Expected Function in list-fold, got {:?}", other),
    }
}

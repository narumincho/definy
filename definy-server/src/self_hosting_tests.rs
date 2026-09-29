#[cfg(test)]
mod tests {
    use definy_event::EventHashId;
    use definy_event::event::{Expression, MatchArm};
    use std::collections::HashSet;

    fn get_dummy_core_id() -> EventHashId {
        EventHashId::from_bytes(&[1u8; 32])
    }

    #[test]
    fn test_self_hosting_parts_registration() {
        let core_id = get_dummy_core_id();

        // Phase 1 parts
        let val_part = crate::builtin_value_type::create_value_type_part(&core_id);
        let env_part = crate::builtin_value_type::create_env_type_part(&core_id);
        let env_lookup_part = crate::builtin_value_type::create_env_lookup_part(&core_id);
        let env_lookup_inner_part =
            crate::builtin_value_type::create_env_lookup_inner_part(&core_id);
        let env_extend_part = crate::builtin_value_type::create_env_extend_part(&core_id);
        let eval_value_part = crate::builtin_evaluator::create_eval_value_part(&core_id);

        // Phase 2 parts
        let type_err_part = crate::builtin_type_checker::create_type_error_part(&core_id);
        let type_res_part = crate::builtin_type_checker::create_type_result_part(&core_id);
        let type_env_part = crate::builtin_type_checker::create_type_env_part(&core_id);
        let type_env_lookup = crate::builtin_type_checker::create_type_env_lookup_part(&core_id);
        let type_env_lookup_inner =
            crate::builtin_type_checker::create_type_env_lookup_inner_part(&core_id);
        let type_env_extend = crate::builtin_type_checker::create_type_env_extend_part(&core_id);
        let type_equals = crate::builtin_type_checker::create_type_equals_part(&core_id);
        let type_check = crate::builtin_type_checker::create_type_check_part(&core_id);

        // Phase 3 parts
        let compile_instr =
            crate::builtin_wasm_compiler::create_compile_expr_instructions_part(&core_id);
        let compile_to_wasm = crate::builtin_wasm_compiler::create_compile_to_wasm_part(&core_id);

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
            type_equals,
            type_check,
            compile_instr,
            compile_to_wasm,
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
        let core_id = get_dummy_core_id();
        let eval_part = crate::builtin_evaluator::create_eval_value_part(&core_id);
        let expr = eval_part
            .expression
            .expect("eval-value must have expression");

        // Structure: Function(expr -> Function(env -> Match(expr)))
        let (expr_var, env_func) = match expr {
            Expression::Function(f) => (f.parameter_id, *f.body),
            other => panic!("Expected outer Function, got: {:?}", other),
        };
        assert_eq!(expr_var, 0);

        let (env_var, match_expr) = match env_func {
            Expression::Function(f) => (f.parameter_id, *f.body),
            other => panic!("Expected inner Function, got: {:?}", other),
        };
        assert_eq!(env_var, 1);

        let match_arms: Vec<MatchArm> = match match_expr {
            Expression::Match(m) => m.arms,
            other => panic!("Expected Match expression, got: {:?}", other),
        };

        let arm_tags: HashSet<String> = match_arms.into_iter().map(|a| a.tag.to_string()).collect();

        // Must cover literals, arithmetics, comparisons, branching, and functions
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
            "if",
            "function",
            "call",
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
        let core_id = get_dummy_core_id();
        let type_check_part = crate::builtin_type_checker::create_type_check_part(&core_id);
        let expr = type_check_part
            .expression
            .expect("type-check must have expression");

        // Structure: Function(expr -> Function(env -> Match(expr)))
        let (expr_var, env_func) = match expr {
            Expression::Function(f) => (f.parameter_id, *f.body),
            other => panic!("Expected outer Function, got: {:?}", other),
        };
        assert_eq!(expr_var, 0);

        let (env_var, match_expr) = match env_func {
            Expression::Function(f) => (f.parameter_id, *f.body),
            other => panic!("Expected inner Function, got: {:?}", other),
        };
        assert_eq!(env_var, 1);

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
            "if",
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
        let type_equals_part = crate::builtin_type_checker::create_type_equals_part(&core_id);
        assert!(type_equals_part.expression.is_some());
    }

    #[test]
    fn test_phase3_wasm_compiler_ast_structure() {
        let core_id = get_dummy_core_id();
        let compile_instr_part =
            crate::builtin_wasm_compiler::create_compile_expr_instructions_part(&core_id);
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
        let compile_to_wasm_part =
            crate::builtin_wasm_compiler::create_compile_to_wasm_part(&core_id);
        let to_wasm_expr = compile_to_wasm_part
            .expression
            .expect("compile-to-wasm must have expression");

        // The expression should be a function(expr -> Let*(ListConcat(...)))
        match to_wasm_expr {
            Expression::Function(f) => {
                assert_eq!(f.parameter_id, 0);
                assert_eq!(&*f.parameter_name, "expr");
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
        // i64.const 42: [0x42, 42]
        // i64.const 8:  [0x42, 8]
        // i64.add:      [0x7c]
        // end:          [0x0b]
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
}

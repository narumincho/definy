use definy_event::EventHashId;
use definy_event::event::{CompilerBuiltin, Description, Expression, ModulePartEntry, PartType};

fn compiler_part_entry(
    name: &str,
    part_type: Option<PartType>,
    desc_en: &str,
    desc_ja: &str,
    builtin: CompilerBuiltin,
) -> ModulePartEntry {
    ModulePartEntry {
        name: name.into(),
        part_type,
        description: Description::localized(vec![("en", desc_en), ("ja", desc_ja)]),
        content_hash: None,
        expression: Some(Expression::Compiler(builtin)),
    }
}

fn type_part_entry(name: &str, desc_en: &str, desc_ja: &str) -> ModulePartEntry {
    ModulePartEntry {
        name: name.into(),
        part_type: Some(PartType::Type),
        description: Description::localized(vec![("en", desc_en), ("ja", desc_ja)]),
        content_hash: None,
        expression: None,
    }
}

pub fn create_core_module_parts(core_module_id: &EventHashId) -> Vec<ModulePartEntry> {
    let mut core_parts = vec![
        compiler_part_entry(
            "let",
            None,
            "Compiler built-in let binding",
            "ローカル変数を定義する組み込み構文 (let)",
            CompilerBuiltin::Let,
        ),
        compiler_part_entry(
            "plus",
            None,
            "Compiler built-in addition",
            "数値の加算を行う組み込み関数 (+)",
            CompilerBuiltin::Plus,
        ),
        compiler_part_entry(
            "number-literal",
            Some(PartType::Number),
            "Compiler built-in number literal",
            "数値リテラル",
            CompilerBuiltin::NumberLiteral,
        ),
        compiler_part_entry(
            "if",
            None,
            "Compiler built-in conditional expression",
            "条件分岐を行う組み込み構文 (if)",
            CompilerBuiltin::If,
        ),
        type_part_entry(
            "number",
            "Built-in 64-bit integer type",
            "組み込み 64ビット符号付き整数型",
        ),
        type_part_entry(
            "string",
            "Built-in UTF-8 string type",
            "組み込み UTF-8 文字列型",
        ),
        type_part_entry("boolean", "Built-in boolean type", "組み込み真偽値型"),
        type_part_entry(
            "list",
            "Built-in list type constructor",
            "組み込みリスト型コンストラクタ",
        ),
        compiler_part_entry(
            "equal",
            None,
            "Compiler built-in equality comparison",
            "値が等しいかを判定する組み込み関数 (==)",
            CompilerBuiltin::Equal,
        ),
        compiler_part_entry(
            "minus",
            None,
            "Compiler built-in subtraction",
            "数値の減算を行う組み込み関数 (-)",
            CompilerBuiltin::Minus,
        ),
        compiler_part_entry(
            "multiply",
            None,
            "Compiler built-in multiplication",
            "数値の乗算を行う組み込み関数 (*)",
            CompilerBuiltin::Multiply,
        ),
        compiler_part_entry(
            "divide",
            None,
            "Compiler built-in division",
            "数値の除算を行う組み込み関数 (/)",
            CompilerBuiltin::Divide,
        ),
        compiler_part_entry(
            "remainder",
            None,
            "Compiler built-in remainder",
            "数値の剰余を求める組み込み関数 (%)",
            CompilerBuiltin::Remainder,
        ),
        compiler_part_entry(
            "less-than",
            None,
            "Compiler built-in less than comparison",
            "左辺が右辺より小さいかを判定する組み込み関数 (<)",
            CompilerBuiltin::LessThan,
        ),
        compiler_part_entry(
            "less-than-or-equal",
            None,
            "Compiler built-in less than or equal comparison",
            "左辺が右辺以下かを判定する組み込み関数 (<=)",
            CompilerBuiltin::LessThanOrEqual,
        ),
        compiler_part_entry(
            "greater-than",
            None,
            "Compiler built-in greater than comparison",
            "左辺が右辺より大きいかを判定する組み込み関数 (>)",
            CompilerBuiltin::GreaterThan,
        ),
        compiler_part_entry(
            "greater-than-or-equal",
            None,
            "Compiler built-in greater than or equal comparison",
            "左辺が右辺以上かを判定する組み込み関数 (>=)",
            CompilerBuiltin::GreaterThanOrEqual,
        ),
        compiler_part_entry(
            "not-equal",
            None,
            "Compiler built-in not equal comparison",
            "値が等しくないかを判定する組み込み関数 (!=)",
            CompilerBuiltin::NotEqual,
        ),
        compiler_part_entry(
            "not",
            None,
            "Compiler built-in boolean negation",
            "真偽値の否定を行う組み込み関数 (not)",
            CompilerBuiltin::Not,
        ),
        compiler_part_entry(
            "and",
            None,
            "Compiler built-in boolean and",
            "真偽値の論理積を行う組み込み関数 (and)",
            CompilerBuiltin::And,
        ),
        compiler_part_entry(
            "or",
            None,
            "Compiler built-in boolean or",
            "真偽値の論理和を行う組み込み関数 (or)",
            CompilerBuiltin::Or,
        ),
        compiler_part_entry(
            "string-concat",
            None,
            "Compiler built-in string concatenation",
            "文字列の結合を行う組み込み関数",
            CompilerBuiltin::StringConcat,
        ),
        compiler_part_entry(
            "string-length",
            None,
            "Compiler built-in string length",
            "文字列の文字数を取得する組み込み関数",
            CompilerBuiltin::StringLength,
        ),
        compiler_part_entry(
            "string-slice",
            None,
            "Compiler built-in string slice",
            "文字列の部分文字列を取得する組み込み関数",
            CompilerBuiltin::StringSlice,
        ),
        compiler_part_entry(
            "list-length",
            None,
            "Compiler built-in list length",
            "リストの要素数を取得する組み込み関数",
            CompilerBuiltin::ListLength,
        ),
        compiler_part_entry(
            "list-concat",
            None,
            "Compiler built-in list concatenation",
            "2つのリストを結合する組み込み関数",
            CompilerBuiltin::ListConcat,
        ),
        compiler_part_entry(
            "list-get",
            None,
            "Compiler built-in list item access by index",
            "リストのインデックス参照 (list-get)",
            CompilerBuiltin::ListGet,
        ),
        compiler_part_entry(
            "list-append",
            None,
            "Compiler built-in list append item",
            "リストの末尾に要素を追加 (list-append)",
            CompilerBuiltin::ListAppend,
        ),
        compiler_part_entry(
            "bit-and",
            None,
            "Compiler built-in bitwise AND",
            "ビット積を行う組み込み関数 (&)",
            CompilerBuiltin::BitAnd,
        ),
        compiler_part_entry(
            "bit-or",
            None,
            "Compiler built-in bitwise OR",
            "ビット和を行う組み込み関数 (|)",
            CompilerBuiltin::BitOr,
        ),
        compiler_part_entry(
            "bit-xor",
            None,
            "Compiler built-in bitwise XOR",
            "排他的ビット和を行う組み込み関数 (^)",
            CompilerBuiltin::BitXor,
        ),
        compiler_part_entry(
            "shift-left",
            None,
            "Compiler built-in left shift",
            "左シフトを行う組み込み関数 (<<)",
            CompilerBuiltin::ShiftLeft,
        ),
        compiler_part_entry(
            "shift-right",
            None,
            "Compiler built-in right shift",
            "右シフトを行う組み込み関数 (>>)",
            CompilerBuiltin::ShiftRight,
        ),
    ];

    core_parts.push(crate::builtin_expression_type::create_expression_ast_part(
        core_module_id,
    ));
    core_parts.push(crate::builtin_value_type::create_value_type_part(
        core_module_id,
    ));
    core_parts.push(crate::builtin_value_type::create_env_type_part(
        core_module_id,
    ));
    core_parts.push(crate::builtin_value_type::create_env_lookup_part(
        core_module_id,
    ));
    core_parts.push(crate::builtin_value_type::create_env_lookup_inner_part(
        core_module_id,
    ));
    core_parts.push(crate::builtin_value_type::create_env_extend_part(
        core_module_id,
    ));
    core_parts.push(crate::builtin_value_type::create_value_equals_part(
        core_module_id,
    ));
    core_parts
        .push(crate::builtin_value_type::create_value_equals_record_fields_part(core_module_id));
    core_parts.push(crate::builtin_value_type::create_value_equals_list_items_part(core_module_id));
    core_parts.push(crate::builtin_type_ast::create_type_ast_part(
        core_module_id,
    ));
    core_parts.push(crate::builtin_type_ast::create_part_definition_part(
        core_module_id,
    ));
    core_parts.push(crate::builtin_type_ast::create_module_definition_part(
        core_module_id,
    ));
    core_parts.push(crate::builtin_expression_type::create_eval_ast_part(
        core_module_id,
    ));
    core_parts.push(crate::builtin_evaluator::create_eval_value_part(
        core_module_id,
    ));
    core_parts.push(crate::builtin_evaluator::create_record_field_lookup_part(
        core_module_id,
    ));
    core_parts.push(crate::builtin_evaluator::create_eval_record_fields_part(
        core_module_id,
    ));
    core_parts.push(crate::builtin_evaluator::create_eval_list_items_part(
        core_module_id,
    ));
    core_parts.push(crate::builtin_evaluator::create_eval_call_arguments_part(
        core_module_id,
    ));
    core_parts.push(crate::builtin_eval_match::create_eval_match_arms_part(
        core_module_id,
    ));
    core_parts.push(crate::builtin_eval_match::create_eval_match_arms_inner_part(core_module_id));
    core_parts.push(crate::builtin_type_checker::create_type_error_part(
        core_module_id,
    ));
    core_parts.push(crate::builtin_type_checker::create_type_result_part(
        core_module_id,
    ));
    core_parts.push(crate::builtin_type_checker::create_type_env_part(
        core_module_id,
    ));
    core_parts.push(crate::builtin_type_checker::create_type_env_lookup_part(
        core_module_id,
    ));
    core_parts.push(crate::builtin_type_checker::create_type_env_lookup_inner_part(core_module_id));
    core_parts.push(crate::builtin_type_checker::create_type_env_extend_part(
        core_module_id,
    ));
    core_parts.push(crate::builtin_type_checker::create_part_type_env_part(
        core_module_id,
    ));
    core_parts.push(crate::builtin_type_checker::create_part_type_lookup_part(
        core_module_id,
    ));
    core_parts
        .push(crate::builtin_type_checker::create_part_type_lookup_inner_part(core_module_id));
    core_parts.push(crate::builtin_type_checker::create_type_env_lookup_part_part(core_module_id));
    core_parts.push(crate::builtin_type_checker::create_type_equals_part(
        core_module_id,
    ));
    core_parts
        .push(crate::builtin_type_checker::create_type_equals_record_fields_part(core_module_id));
    core_parts.push(
        crate::builtin_type_checker::create_type_equals_function_parameters_part(core_module_id),
    );
    core_parts
        .push(crate::builtin_type_checker::create_type_equals_union_variants_part(core_module_id));
    core_parts
        .push(crate::builtin_type_checker::create_record_field_type_lookup_part(core_module_id));
    core_parts
        .push(crate::builtin_type_checker::create_type_check_record_fields_part(core_module_id));
    core_parts.push(
        crate::builtin_type_checker::create_type_assignable_record_fields_part(core_module_id),
    );
    core_parts.push(
        crate::builtin_type_checker::create_type_assignable_function_parameters_part(
            core_module_id,
        ),
    );
    core_parts
        .push(crate::builtin_type_checker::create_union_variant_type_lookup_part(core_module_id));
    core_parts.push(crate::builtin_type_checker::create_find_tag_in_arms_part(
        core_module_id,
    ));
    core_parts
        .push(crate::builtin_type_checker::create_check_union_exhaustiveness_part(core_module_id));
    core_parts.push(
        crate::builtin_type_checker::create_type_assignable_union_variants_part(core_module_id),
    );
    core_parts
        .push(crate::builtin_type_checker::create_type_check_match_arms_inner_part(core_module_id));
    core_parts.push(crate::builtin_type_checker::create_type_check_match_arms_part(core_module_id));
    core_parts.push(crate::builtin_type_checker::create_type_check_list_items_part(core_module_id));
    core_parts.push(crate::builtin_type_checker::create_type_check_list_part(
        core_module_id,
    ));
    core_parts.push(crate::builtin_type_checker::create_type_assignable_part(
        core_module_id,
    ));
    core_parts.push(crate::builtin_type_checker::create_type_check_part(
        core_module_id,
    ));
    core_parts.push(crate::builtin_type_checker::create_list_contains_string_part(core_module_id));
    core_parts.push(
        crate::builtin_type_checker::create_type_check_type_record_fields_part(core_module_id),
    );
    core_parts.push(
        crate::builtin_type_checker::create_type_check_type_union_variants_part(core_module_id),
    );
    core_parts.push(
        crate::builtin_type_checker::create_type_check_type_function_parameters_part(
            core_module_id,
        ),
    );
    core_parts
        .push(crate::builtin_type_checker::create_type_check_call_arguments_part(core_module_id));
    core_parts.push(crate::builtin_type_checker::create_type_check_function_part(core_module_id));

    core_parts.push(crate::builtin_type_checker::create_type_check_against_part(
        core_module_id,
    ));
    core_parts
        .push(crate::builtin_wasm_compiler::create_compile_expr_instructions_part(core_module_id));
    core_parts.push(crate::builtin_wasm_compiler::create_compile_to_wasm_part(
        core_module_id,
    ));
    core_parts.push(crate::builtin_formatter::create_expression_to_source_part(
        core_module_id,
    ));
    core_parts
        .push(crate::builtin_validator::create_collect_part_type_env_inner_part(core_module_id));
    core_parts.push(crate::builtin_validator::create_collect_part_type_env_part(
        core_module_id,
    ));
    core_parts.push(crate::builtin_validator::create_validate_part_in_env_part(
        core_module_id,
    ));
    core_parts.push(crate::builtin_validator::create_validate_part_part(
        core_module_id,
    ));
    core_parts.push(crate::builtin_validator::create_validate_parts_in_env_part(
        core_module_id,
    ));
    core_parts.push(crate::builtin_validator::create_validate_parts_part(
        core_module_id,
    ));
    core_parts.push(crate::builtin_validator::create_validate_module_part(
        core_module_id,
    ));
    core_parts.push(crate::builtin_optimizer::create_optimize_expression_part(
        core_module_id,
    ));
    core_parts.push(crate::builtin_list_ops::create_list_map_part(
        core_module_id,
    ));
    core_parts.push(crate::builtin_list_ops::create_list_map_inner_part(
        core_module_id,
    ));
    core_parts.push(crate::builtin_list_ops::create_list_fold_part(
        core_module_id,
    ));
    core_parts.push(crate::builtin_list_ops::create_list_fold_inner_part(
        core_module_id,
    ));

    core_parts
}

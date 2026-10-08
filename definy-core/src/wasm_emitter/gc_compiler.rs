use std::collections::HashMap;

use definy_event::event::*;

use super::bytecode::*;
use super::gc_ops::*;

// WASM GC Type Indices
pub const TYPE_IDX_BYTE_ARRAY: u32 = 0;
pub const TYPE_IDX_STRING: u32 = 1;
pub const TYPE_IDX_NUMBER: u32 = 2;
pub const TYPE_IDX_BOOL: u32 = 3;
pub const TYPE_IDX_VALUE_ARRAY: u32 = 4;
pub const TYPE_IDX_LIST: u32 = 5;
pub const TYPE_IDX_RECORD_FIELD: u32 = 6;
pub const TYPE_IDX_RECORD_FIELD_ARRAY: u32 = 7;
pub const TYPE_IDX_RECORD: u32 = 8;
pub const TYPE_IDX_VARIANT: u32 = 9;
pub const TYPE_IDX_STRING_EQ: u32 = 10;
pub const TYPE_IDX_RECORD_GET: u32 = 11;
pub const TYPE_IDX_EVALUATE: u32 = 12;

pub const FUNC_IDX_EVALUATE: u32 = 0;
pub const FUNC_IDX_STRING_EQ: u32 = 1;
pub const FUNC_IDX_RECORD_GET: u32 = 2;

/// WASM GC の標準 Type Section を構築します。
pub fn build_standard_gc_type_section() -> Vec<u8> {
    let mut payload = Vec::new();
    encode_u32_leb128(&mut payload, 13);

    // 0: ByteArray = (array (mut i8))
    payload.extend_from_slice(&encode_array_type(I8, false));

    // 1: String = (struct (field i32) (field (ref 0)))
    payload.extend_from_slice(&encode_struct_type_flexible(&[
        (&[I32], false),
        (&ref_exact_type(TYPE_IDX_BYTE_ARRAY), false),
    ]));

    // 2: Number = (struct (field i32) (field i64))
    payload.extend_from_slice(&encode_struct_type(&[(I32, false), (I64, false)]));

    // 3: Bool = (struct (field i32) (field i32))
    payload.extend_from_slice(&encode_struct_type(&[(I32, false), (I32, false)]));

    // 4: ValueArray = (array (ref null any))
    payload.extend_from_slice(&encode_array_type_flexible(ref_null_any(), false));

    // 5: List = (struct (field i32) (field (ref 4)))
    payload.extend_from_slice(&encode_struct_type_flexible(&[
        (&[I32], false),
        (&ref_exact_type(TYPE_IDX_VALUE_ARRAY), false),
    ]));

    // 6: RecordField = (struct (field (ref 1)) (field (ref null any)))
    payload.extend_from_slice(&encode_struct_type_flexible(&[
        (&ref_exact_type(TYPE_IDX_STRING), false),
        (ref_null_any(), false),
    ]));

    // 7: RecordFieldArray = (array (ref 6))
    payload.extend_from_slice(&encode_array_type_flexible(
        &ref_exact_type(TYPE_IDX_RECORD_FIELD),
        false,
    ));

    // 8: Record = (struct (field i32) (field (ref 7)))
    payload.extend_from_slice(&encode_struct_type_flexible(&[
        (&[I32], false),
        (&ref_exact_type(TYPE_IDX_RECORD_FIELD_ARRAY), false),
    ]));

    // 9: Variant = (struct (field i32) (field (ref 1)) (field (ref null any)))
    payload.extend_from_slice(&encode_struct_type_flexible(&[
        (&[I32], false),
        (&ref_exact_type(TYPE_IDX_STRING), false),
        (ref_null_any(), false),
    ]));

    // 10: StringEq = func ((ref 1), (ref 1)) -> i32
    payload.extend_from_slice(&[
        FUNC_TYPE,
        2,
        REF_EXACT_PREFIX,
        TYPE_IDX_STRING as u8,
        REF_EXACT_PREFIX,
        TYPE_IDX_STRING as u8,
        1,
        I32,
    ]);

    // 11: RecordGet = func ((ref null any), (ref 1)) -> (ref null any)
    payload.extend_from_slice(&[
        FUNC_TYPE,
        2,
        REF_NULL_PREFIX,
        HEAP_TYPE_ANY,
        REF_EXACT_PREFIX,
        TYPE_IDX_STRING as u8,
        1,
        REF_NULL_PREFIX,
        HEAP_TYPE_ANY,
    ]);

    // 12: Evaluate = func () -> (ref null any)
    payload.extend_from_slice(&[FUNC_TYPE, 0, 1, REF_NULL_PREFIX, HEAP_TYPE_ANY]);

    let mut section = Vec::new();
    section.push(TYPE_SECTION);
    encode_u32_leb128(&mut section, payload.len() as u32);
    section.extend_from_slice(&payload);
    section
}

pub struct GcCompileContext<'a> {
    pub events: &'a [crate::EventWithHash],
}

impl<'a> GcCompileContext<'a> {
    pub fn new(events: &'a [crate::EventWithHash]) -> Self {
        Self { events }
    }
}

/// 式を評価して (ref null any) の WASM GC オブジェクトを返す Wasm モジュールをコンパイルします。
pub fn compile_expression_to_wasm_gc(
    expression: &Expression,
    events: &[crate::EventWithHash],
) -> Result<Vec<u8>, String> {
    let mut ctx = GcCompileContext::new(events);
    let type_sec = build_standard_gc_type_section();

    // Function section: 3 functions:
    // Func 0: TYPE_IDX_EVALUATE (12)
    // Func 1: TYPE_IDX_STRING_EQ (10)
    // Func 2: TYPE_IDX_RECORD_GET (11)
    let func_sec = vec![
        FUNCTION_SECTION,
        4,
        3,
        TYPE_IDX_EVALUATE as u8,
        TYPE_IDX_STRING_EQ as u8,
        TYPE_IDX_RECORD_GET as u8,
    ];

    // Export "evaluate" (func 0)
    let export_name = b"evaluate";
    let mut export_sec_payload = Vec::new();
    encode_u32_leb128(&mut export_sec_payload, 1);
    encode_u32_leb128(&mut export_sec_payload, export_name.len() as u32);
    export_sec_payload.extend_from_slice(export_name);
    export_sec_payload.push(0x00); // kind func
    encode_u32_leb128(&mut export_sec_payload, FUNC_IDX_EVALUATE);

    let mut export_sec = Vec::new();
    export_sec.push(EXPORT_SECTION);
    encode_u32_leb128(&mut export_sec, export_sec_payload.len() as u32);
    export_sec.extend_from_slice(&export_sec_payload);

    // Code section: 3 functions
    let mut code_bytes = Vec::new();
    let mut next_local_idx = 0;
    let env = HashMap::new();

    emit_expression_gc(
        expression,
        &mut code_bytes,
        &env,
        &mut next_local_idx,
        &mut ctx,
    )?;

    code_bytes.push(END);

    // Func 0: evaluate
    let mut func_0_body = Vec::new();
    func_0_body.push(1); // 1 local group
    encode_u32_leb128(&mut func_0_body, (next_local_idx + 64).max(64));
    func_0_body.extend_from_slice(ref_null_any());
    func_0_body.extend_from_slice(&code_bytes);

    // Func 1: string_eq
    let func_1_body = build_string_eq_func_body();

    // Func 2: record_get
    let func_2_body = build_record_get_func_body();

    let mut code_sec_payload = Vec::new();
    encode_u32_leb128(&mut code_sec_payload, 3); // 3 functions
    encode_u32_leb128(&mut code_sec_payload, func_0_body.len() as u32);
    code_sec_payload.extend_from_slice(&func_0_body);
    encode_u32_leb128(&mut code_sec_payload, func_1_body.len() as u32);
    code_sec_payload.extend_from_slice(&func_1_body);
    encode_u32_leb128(&mut code_sec_payload, func_2_body.len() as u32);
    code_sec_payload.extend_from_slice(&func_2_body);

    let mut code_sec = Vec::new();
    code_sec.push(CODE_SECTION);
    encode_u32_leb128(&mut code_sec, code_sec_payload.len() as u32);
    code_sec.extend_from_slice(&code_sec_payload);

    let mut module = Vec::new();
    module.extend_from_slice(&WASM_MAGIC);
    module.extend_from_slice(&WASM_VERSION);
    module.extend_from_slice(&type_sec);
    module.extend_from_slice(&func_sec);
    module.extend_from_slice(&export_sec);
    module.extend_from_slice(&code_sec);

    Ok(module)
}

fn build_string_eq_func_body() -> Vec<u8> {
    let mut body = Vec::new();
    body.push(2); // 2 local decl groups
    encode_u32_leb128(&mut body, 2);
    body.extend_from_slice(&ref_exact_type(TYPE_IDX_BYTE_ARRAY));
    encode_u32_leb128(&mut body, 3);
    body.push(I32);

    // arr_a = struct.get $String 1 (str_a)
    body.push(LOCAL_GET);
    body.push(0);
    emit_struct_get(&mut body, TYPE_IDX_STRING, 1);
    body.push(LOCAL_SET);
    body.push(2);

    // arr_b = struct.get $String 1 (str_b)
    body.push(LOCAL_GET);
    body.push(1);
    emit_struct_get(&mut body, TYPE_IDX_STRING, 1);
    body.push(LOCAL_SET);
    body.push(3);

    // len_a = array.len (arr_a)
    body.push(LOCAL_GET);
    body.push(2);
    emit_array_len(&mut body);
    body.push(LOCAL_SET);
    body.push(4);

    // len_b = array.len (arr_b)
    body.push(LOCAL_GET);
    body.push(3);
    emit_array_len(&mut body);
    body.push(LOCAL_SET);
    body.push(5);

    // if len_a != len_b, return 0
    body.push(LOCAL_GET);
    body.push(4);
    body.push(LOCAL_GET);
    body.push(5);
    body.push(I32_NE);
    body.push(IF);
    body.push(BLOCK_TYPE_EMPTY);
    body.push(I32_CONST);
    encode_i32_sleb128(&mut body, 0);
    body.push(RETURN);
    body.push(END);

    // idx = 0
    body.push(I32_CONST);
    encode_i32_sleb128(&mut body, 0);
    body.push(LOCAL_SET);
    body.push(6);

    // Loop
    body.push(BLOCK);
    body.push(BLOCK_TYPE_EMPTY);
    body.push(LOOP);
    body.push(BLOCK_TYPE_EMPTY);

    // if idx == len_a, break loop
    body.push(LOCAL_GET);
    body.push(6);
    body.push(LOCAL_GET);
    body.push(4);
    body.push(I32_EQ);
    body.push(BR_IF);
    body.push(1);

    // if arr_a[idx] != arr_b[idx], return 0
    body.push(LOCAL_GET);
    body.push(2);
    body.push(LOCAL_GET);
    body.push(6);
    emit_array_get_u(&mut body, TYPE_IDX_BYTE_ARRAY);

    body.push(LOCAL_GET);
    body.push(3);
    body.push(LOCAL_GET);
    body.push(6);
    emit_array_get_u(&mut body, TYPE_IDX_BYTE_ARRAY);

    body.push(I32_NE);
    body.push(IF);
    body.push(BLOCK_TYPE_EMPTY);
    body.push(I32_CONST);
    encode_i32_sleb128(&mut body, 0);
    body.push(RETURN);
    body.push(END);

    // idx += 1
    body.push(LOCAL_GET);
    body.push(6);
    body.push(I32_CONST);
    encode_i32_sleb128(&mut body, 1);
    body.push(I32_ADD);
    body.push(LOCAL_SET);
    body.push(6);

    body.push(BR);
    body.push(0);

    body.push(END); // loop
    body.push(END); // block

    body.push(I32_CONST);
    encode_i32_sleb128(&mut body, 1);
    body.push(END);

    body
}

fn build_record_get_func_body() -> Vec<u8> {
    let mut body = Vec::new();
    body.push(5); // 5 local declaration entries
    encode_u32_leb128(&mut body, 1);
    body.extend_from_slice(&ref_exact_type(TYPE_IDX_RECORD));
    encode_u32_leb128(&mut body, 1);
    body.extend_from_slice(&ref_exact_type(TYPE_IDX_RECORD_FIELD_ARRAY));
    encode_u32_leb128(&mut body, 2);
    body.push(I32);
    encode_u32_leb128(&mut body, 1);
    body.extend_from_slice(&ref_exact_type(TYPE_IDX_RECORD_FIELD));
    encode_u32_leb128(&mut body, 1);
    body.extend_from_slice(&ref_exact_type(TYPE_IDX_STRING));

    // rec_struct = ref.cast 8 (local 0)
    body.push(LOCAL_GET);
    body.push(0);
    emit_ref_cast(&mut body, TYPE_IDX_RECORD);
    body.push(LOCAL_SET);
    body.push(2);

    // field_arr = struct.get 8 1 (local 2)
    body.push(LOCAL_GET);
    body.push(2);
    emit_struct_get(&mut body, TYPE_IDX_RECORD, 1);
    body.push(LOCAL_SET);
    body.push(3);

    // len = array.len (local 3)
    body.push(LOCAL_GET);
    body.push(3);
    emit_array_len(&mut body);
    body.push(LOCAL_SET);
    body.push(4);

    // idx = 0
    body.push(I32_CONST);
    encode_i32_sleb128(&mut body, 0);
    body.push(LOCAL_SET);
    body.push(5);

    // Loop
    body.push(BLOCK);
    body.push(BLOCK_TYPE_EMPTY);
    body.push(LOOP);
    body.push(BLOCK_TYPE_EMPTY);

    // if idx == len, break loop
    body.push(LOCAL_GET);
    body.push(5);
    body.push(LOCAL_GET);
    body.push(4);
    body.push(I32_EQ);
    body.push(BR_IF);
    body.push(1);

    // field_struct = array.get 7 (field_arr, idx)
    body.push(LOCAL_GET);
    body.push(3);
    body.push(LOCAL_GET);
    body.push(5);
    emit_array_get(&mut body, TYPE_IDX_RECORD_FIELD_ARRAY);
    body.push(LOCAL_SET);
    body.push(6);

    // field_key = struct.get 6 0 (field_struct)
    body.push(LOCAL_GET);
    body.push(6);
    emit_struct_get(&mut body, TYPE_IDX_RECORD_FIELD, 0);
    body.push(LOCAL_SET);
    body.push(7);

    // if string_eq(field_key, target_key) == 1
    body.push(LOCAL_GET);
    body.push(7);
    body.push(LOCAL_GET);
    body.push(1);
    body.push(CALL);
    encode_u32_leb128(&mut body, FUNC_IDX_STRING_EQ);
    body.push(IF);
    body.push(BLOCK_TYPE_EMPTY);

    // return struct.get 6 1 (field_struct)
    body.push(LOCAL_GET);
    body.push(6);
    emit_struct_get(&mut body, TYPE_IDX_RECORD_FIELD, 1);
    body.push(RETURN);
    body.push(END);

    // idx += 1
    body.push(LOCAL_GET);
    body.push(5);
    body.push(I32_CONST);
    encode_i32_sleb128(&mut body, 1);
    body.push(I32_ADD);
    body.push(LOCAL_SET);
    body.push(5);

    body.push(BR);
    body.push(0);

    body.push(END); // loop
    body.push(END); // block

    // Not found: return ref.null any
    emit_ref_null(&mut body, HEAP_TYPE_ANY);
    body.push(END);

    body
}

/// 式を評価して、スタックトップに (ref null any) の WASM GC 値を残すコードを生成します。
pub fn emit_expression_gc(
    expression: &Expression,
    out: &mut Vec<u8>,
    env: &HashMap<i64, u32>,
    next_local_idx: &mut u32,
    ctx: &mut GcCompileContext,
) -> Result<(), String> {
    match expression {
        Expression::Number(NumberExpression { value }) => {
            // struct $Number (tag 0: i32, val: i64)
            out.push(I32_CONST);
            encode_i32_sleb128(out, 0);
            out.push(I64_CONST);
            encode_i64_sleb128(out, *value);
            emit_struct_new(out, TYPE_IDX_NUMBER);
        }
        Expression::Boolean(BooleanExpression { value }) => {
            // struct $Bool (tag 1: i32, val: i32)
            out.push(I32_CONST);
            encode_i32_sleb128(out, 1);
            out.push(I32_CONST);
            encode_i32_sleb128(out, if *value { 1 } else { 0 });
            emit_struct_new(out, TYPE_IDX_BOOL);
        }
        Expression::String(StringExpression { value }) => {
            emit_string_gc(value, out);
        }
        Expression::ListLiteral(ListLiteralExpression { items }) => {
            // struct $List (tag 3: i32, items: (ref 4))
            out.push(I32_CONST);
            encode_i32_sleb128(out, 3);

            for item in items {
                emit_expression_gc(item, out, env, next_local_idx, ctx)?;
            }
            emit_array_new_fixed(out, TYPE_IDX_VALUE_ARRAY, items.len() as u32);
            emit_struct_new(out, TYPE_IDX_LIST);
        }
        Expression::TypeLiteral(TypeLiteralExpression { items }) => {
            // struct $Record (tag 4: i32, fields: (ref 7))
            out.push(I32_CONST);
            encode_i32_sleb128(out, 4);

            for item in items {
                // $RecordField (key: String, value: anyref)
                emit_string_gc(&item.key, out);
                emit_expression_gc(&item.value, out, env, next_local_idx, ctx)?;
                emit_struct_new(out, TYPE_IDX_RECORD_FIELD);
            }
            emit_array_new_fixed(out, TYPE_IDX_RECORD_FIELD_ARRAY, items.len() as u32);
            emit_struct_new(out, TYPE_IDX_RECORD);
        }
        Expression::RecordGet(RecordGetExpression { record, key }) => {
            emit_expression_gc(record, out, env, next_local_idx, ctx)?;
            emit_string_gc(key, out);
            out.push(CALL);
            encode_u32_leb128(out, FUNC_IDX_RECORD_GET);
        }
        Expression::Variant(VariantExpression { tag, payload, .. }) => {
            // struct $Variant (tag 6: i32, tag_str: String, payload: anyref)
            out.push(I32_CONST);
            encode_i32_sleb128(out, 6);
            emit_string_gc(tag, out);
            if let Some(p) = payload {
                emit_expression_gc(p, out, env, next_local_idx, ctx)?;
            } else {
                emit_ref_null(out, HEAP_TYPE_ANY);
            }
            emit_struct_new(out, TYPE_IDX_VARIANT);
        }
        Expression::Let(LetExpression {
            variable_id,
            value,
            body,
            ..
        }) => {
            let local_idx = *next_local_idx;
            *next_local_idx += 1;
            let mut new_env = env.clone();
            new_env.insert(*variable_id, local_idx);

            emit_expression_gc(value, out, env, next_local_idx, ctx)?;
            out.push(LOCAL_SET);
            encode_u32_leb128(out, local_idx);

            emit_expression_gc(body, out, &new_env, next_local_idx, ctx)?;
        }
        Expression::Variable(VariableExpression { variable_id }) => {
            let local_idx = env
                .get(variable_id)
                .ok_or_else(|| format!("Variable {variable_id} not found in scope"))?;
            out.push(LOCAL_GET);
            encode_u32_leb128(out, *local_idx);
        }
        Expression::Add(a) => {
            emit_binary_arithmetic(
                a.left.as_ref(),
                a.right.as_ref(),
                I64_ADD,
                out,
                env,
                next_local_idx,
                ctx,
            )?;
        }
        Expression::Subtract(s) => {
            emit_binary_arithmetic(
                s.left.as_ref(),
                s.right.as_ref(),
                I64_SUB,
                out,
                env,
                next_local_idx,
                ctx,
            )?;
        }
        Expression::Multiply(m) => {
            emit_binary_arithmetic(
                m.left.as_ref(),
                m.right.as_ref(),
                I64_MUL,
                out,
                env,
                next_local_idx,
                ctx,
            )?;
        }
        Expression::Divide(d) => {
            emit_binary_arithmetic(
                d.left.as_ref(),
                d.right.as_ref(),
                I64_DIV_S,
                out,
                env,
                next_local_idx,
                ctx,
            )?;
        }
        Expression::Remainder(r) => {
            emit_binary_arithmetic(
                r.left.as_ref(),
                r.right.as_ref(),
                I64_REM_S,
                out,
                env,
                next_local_idx,
                ctx,
            )?;
        }
        Expression::BitAnd(b) => {
            emit_binary_arithmetic(
                b.left.as_ref(),
                b.right.as_ref(),
                I64_AND,
                out,
                env,
                next_local_idx,
                ctx,
            )?;
        }
        Expression::BitOr(b) => {
            emit_binary_arithmetic(
                b.left.as_ref(),
                b.right.as_ref(),
                I64_OR,
                out,
                env,
                next_local_idx,
                ctx,
            )?;
        }
        Expression::BitXor(b) => {
            emit_binary_arithmetic(
                b.left.as_ref(),
                b.right.as_ref(),
                I64_XOR,
                out,
                env,
                next_local_idx,
                ctx,
            )?;
        }
        Expression::ShiftLeft(s) => {
            emit_binary_arithmetic(
                s.left.as_ref(),
                s.right.as_ref(),
                I64_SHL,
                out,
                env,
                next_local_idx,
                ctx,
            )?;
        }
        Expression::ShiftRight(s) => {
            emit_binary_arithmetic(
                s.left.as_ref(),
                s.right.as_ref(),
                I64_SHR_S,
                out,
                env,
                next_local_idx,
                ctx,
            )?;
        }
        Expression::StringLength(s) => {
            // struct $Number: tag 0 (i32), len (i64)
            out.push(I32_CONST);
            encode_i32_sleb128(out, 0);

            emit_expression_gc(&s.value, out, env, next_local_idx, ctx)?;
            emit_ref_cast(out, TYPE_IDX_STRING);
            emit_struct_get(out, TYPE_IDX_STRING, 1);
            emit_array_len(out);
            out.push(I64_EXTEND_I32_U);

            emit_struct_new(out, TYPE_IDX_NUMBER);
        }
        Expression::ListLength(l) => {
            // struct $Number: tag 0 (i32), len (i64)
            out.push(I32_CONST);
            encode_i32_sleb128(out, 0);

            emit_expression_gc(&l.value, out, env, next_local_idx, ctx)?;
            emit_ref_cast(out, TYPE_IDX_LIST);
            emit_struct_get(out, TYPE_IDX_LIST, 1);
            emit_array_len(out);
            out.push(I64_EXTEND_I32_U);

            emit_struct_new(out, TYPE_IDX_NUMBER);
        }
        Expression::ListGet(l) => {
            emit_expression_gc(&l.list, out, env, next_local_idx, ctx)?;
            emit_ref_cast(out, TYPE_IDX_LIST);
            emit_struct_get(out, TYPE_IDX_LIST, 1);

            emit_expression_gc(&l.index, out, env, next_local_idx, ctx)?;
            emit_ref_cast(out, TYPE_IDX_NUMBER);
            emit_struct_get(out, TYPE_IDX_NUMBER, 1);
            out.push(I32_WRAP_I64);

            emit_array_get(out, TYPE_IDX_VALUE_ARRAY);
        }
        Expression::LessThan(c) => {
            emit_binary_comparison(
                c.left.as_ref(),
                c.right.as_ref(),
                I64_LT_S,
                out,
                env,
                next_local_idx,
                ctx,
            )?;
        }
        Expression::LessThanOrEqual(c) => {
            emit_binary_comparison(
                c.left.as_ref(),
                c.right.as_ref(),
                I64_LE_S,
                out,
                env,
                next_local_idx,
                ctx,
            )?;
        }
        Expression::GreaterThan(c) => {
            emit_binary_comparison(
                c.left.as_ref(),
                c.right.as_ref(),
                I64_GT_S,
                out,
                env,
                next_local_idx,
                ctx,
            )?;
        }
        Expression::GreaterThanOrEqual(c) => {
            emit_binary_comparison(
                c.left.as_ref(),
                c.right.as_ref(),
                I64_GE_S,
                out,
                env,
                next_local_idx,
                ctx,
            )?;
        }
        Expression::Equal(e) => {
            emit_equality_comparison(
                e.left.as_ref(),
                e.right.as_ref(),
                true,
                out,
                env,
                next_local_idx,
                ctx,
            )?;
        }
        Expression::NotEqual(e) => {
            emit_equality_comparison(
                e.left.as_ref(),
                e.right.as_ref(),
                false,
                out,
                env,
                next_local_idx,
                ctx,
            )?;
        }
        Expression::Not(n) => {
            // struct $Bool (tag 1: i32, val: i32)
            out.push(I32_CONST);
            encode_i32_sleb128(out, 1);

            emit_expression_gc(&n.value, out, env, next_local_idx, ctx)?;
            emit_ref_cast(out, TYPE_IDX_BOOL);
            emit_struct_get(out, TYPE_IDX_BOOL, 1);
            out.push(I32_EQZ);

            emit_struct_new(out, TYPE_IDX_BOOL);
        }
        Expression::And(a) => {
            // Short-circuit AND: if left is true, then right, else false
            emit_expression_gc(&a.left, out, env, next_local_idx, ctx)?;
            emit_ref_cast(out, TYPE_IDX_BOOL);
            emit_struct_get(out, TYPE_IDX_BOOL, 1);

            out.push(IF);
            out.extend_from_slice(ref_null_any());
            emit_expression_gc(&a.right, out, env, next_local_idx, ctx)?;
            out.push(ELSE);
            // return Bool(false)
            out.push(I32_CONST);
            encode_i32_sleb128(out, 1);
            out.push(I32_CONST);
            encode_i32_sleb128(out, 0);
            emit_struct_new(out, TYPE_IDX_BOOL);
            out.push(END);
        }
        Expression::Or(o) => {
            // Short-circuit OR: if left is true, return true, else right
            emit_expression_gc(&o.left, out, env, next_local_idx, ctx)?;
            emit_ref_cast(out, TYPE_IDX_BOOL);
            emit_struct_get(out, TYPE_IDX_BOOL, 1);

            out.push(IF);
            out.extend_from_slice(ref_null_any());
            // return Bool(true)
            out.push(I32_CONST);
            encode_i32_sleb128(out, 1);
            out.push(I32_CONST);
            encode_i32_sleb128(out, 1);
            emit_struct_new(out, TYPE_IDX_BOOL);
            out.push(ELSE);
            emit_expression_gc(&o.right, out, env, next_local_idx, ctx)?;
            out.push(END);
        }
        Expression::If(IfExpression {
            condition,
            then_expr,
            else_expr,
        }) => {
            // Evaluate condition (returns $Bool struct)
            emit_expression_gc(condition, out, env, next_local_idx, ctx)?;
            emit_ref_cast(out, TYPE_IDX_BOOL);
            emit_struct_get(out, TYPE_IDX_BOOL, 1);

            out.push(IF);
            // block type: (ref null any)
            out.extend_from_slice(ref_null_any());

            emit_expression_gc(then_expr, out, env, next_local_idx, ctx)?;

            out.push(ELSE);
            emit_expression_gc(else_expr, out, env, next_local_idx, ctx)?;

            out.push(END);
        }
        other => {
            return Err(format!(
                "Expression not supported yet in WASM GC emitter: {other:?}"
            ));
        }
    }

    Ok(())
}

fn emit_binary_arithmetic(
    left: &Expression,
    right: &Expression,
    opcode: u8,
    out: &mut Vec<u8>,
    env: &HashMap<i64, u32>,
    next_local_idx: &mut u32,
    ctx: &mut GcCompileContext,
) -> Result<(), String> {
    // struct $Number: tag 0 (i32), val (i64)
    out.push(I32_CONST);
    encode_i32_sleb128(out, 0);

    // Evaluate left, get field 1 (i64)
    emit_expression_gc(left, out, env, next_local_idx, ctx)?;
    emit_ref_cast(out, TYPE_IDX_NUMBER);
    emit_struct_get(out, TYPE_IDX_NUMBER, 1);

    // Evaluate right, get field 1 (i64)
    emit_expression_gc(right, out, env, next_local_idx, ctx)?;
    emit_ref_cast(out, TYPE_IDX_NUMBER);
    emit_struct_get(out, TYPE_IDX_NUMBER, 1);

    // Perform arithmetic (opcode) -> produces i64
    out.push(opcode);

    // struct.new $Number (tag 0, result_i64)
    emit_struct_new(out, TYPE_IDX_NUMBER);
    Ok(())
}

fn emit_binary_comparison(
    left: &Expression,
    right: &Expression,
    opcode: u8,
    out: &mut Vec<u8>,
    env: &HashMap<i64, u32>,
    next_local_idx: &mut u32,
    ctx: &mut GcCompileContext,
) -> Result<(), String> {
    // struct $Bool: tag 1 (i32), val (i32)
    out.push(I32_CONST);
    encode_i32_sleb128(out, 1);

    emit_expression_gc(left, out, env, next_local_idx, ctx)?;
    emit_ref_cast(out, TYPE_IDX_NUMBER);
    emit_struct_get(out, TYPE_IDX_NUMBER, 1);

    emit_expression_gc(right, out, env, next_local_idx, ctx)?;
    emit_ref_cast(out, TYPE_IDX_NUMBER);
    emit_struct_get(out, TYPE_IDX_NUMBER, 1);

    out.push(opcode); // produces i32

    emit_struct_new(out, TYPE_IDX_BOOL);
    Ok(())
}

fn emit_equality_comparison(
    left: &Expression,
    right: &Expression,
    is_equal: bool,
    out: &mut Vec<u8>,
    env: &HashMap<i64, u32>,
    next_local_idx: &mut u32,
    ctx: &mut GcCompileContext,
) -> Result<(), String> {
    // struct $Bool (tag 1: i32, val: i32)
    out.push(I32_CONST);
    encode_i32_sleb128(out, 1);

    let left_local = *next_local_idx;
    *next_local_idx += 1;
    let right_local = *next_local_idx;
    *next_local_idx += 1;

    emit_expression_gc(left, out, env, next_local_idx, ctx)?;
    out.push(LOCAL_SET);
    encode_u32_leb128(out, left_local);

    emit_expression_gc(right, out, env, next_local_idx, ctx)?;
    out.push(LOCAL_SET);
    encode_u32_leb128(out, right_local);

    // If left is String (Type 1):
    out.push(LOCAL_GET);
    encode_u32_leb128(out, left_local);
    out.push(GC_PREFIX);
    out.push(REF_TEST);
    encode_u32_leb128(out, TYPE_IDX_STRING);

    out.push(IF);
    out.push(BLOCK_TYPE_I32);

    // String branch
    out.push(LOCAL_GET);
    encode_u32_leb128(out, left_local);
    emit_ref_cast(out, TYPE_IDX_STRING);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, right_local);
    emit_ref_cast(out, TYPE_IDX_STRING);
    out.push(CALL);
    encode_u32_leb128(out, FUNC_IDX_STRING_EQ);

    out.push(ELSE);

    // Check if left is Bool (Type 3)
    out.push(LOCAL_GET);
    encode_u32_leb128(out, left_local);
    out.push(GC_PREFIX);
    out.push(REF_TEST);
    encode_u32_leb128(out, TYPE_IDX_BOOL);

    out.push(IF);
    out.push(BLOCK_TYPE_I32);

    // Bool branch
    out.push(LOCAL_GET);
    encode_u32_leb128(out, left_local);
    emit_ref_cast(out, TYPE_IDX_BOOL);
    emit_struct_get(out, TYPE_IDX_BOOL, 1);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, right_local);
    emit_ref_cast(out, TYPE_IDX_BOOL);
    emit_struct_get(out, TYPE_IDX_BOOL, 1);
    out.push(I32_EQ);

    out.push(ELSE);

    // Number branch
    out.push(LOCAL_GET);
    encode_u32_leb128(out, left_local);
    emit_ref_cast(out, TYPE_IDX_NUMBER);
    emit_struct_get(out, TYPE_IDX_NUMBER, 1);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, right_local);
    emit_ref_cast(out, TYPE_IDX_NUMBER);
    emit_struct_get(out, TYPE_IDX_NUMBER, 1);
    out.push(I64_EQ);

    out.push(END); // end Bool/Number if
    out.push(END); // end String if

    if !is_equal {
        out.push(I32_EQZ);
    }

    emit_struct_new(out, TYPE_IDX_BOOL);
    Ok(())
}

fn emit_string_gc(s: &str, out: &mut Vec<u8>) {
    // struct $String (tag 2: i32, bytes: (ref 0))
    out.push(I32_CONST);
    encode_i32_sleb128(out, 2);

    let bytes = s.as_bytes();
    for &b in bytes {
        out.push(I32_CONST);
        encode_i32_sleb128(out, b as i32);
    }
    emit_array_new_fixed(out, TYPE_IDX_BYTE_ARRAY, bytes.len() as u32);
    emit_struct_new(out, TYPE_IDX_STRING);
}

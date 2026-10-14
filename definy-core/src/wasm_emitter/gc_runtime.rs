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

pub fn build_string_eq_func_body() -> Vec<u8> {
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

pub fn build_record_get_func_body() -> Vec<u8> {
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

use super::bytecode::*;

/// WASM GC の struct 型をエンコードします。
/// 各フィールドは (valtype, is_mutable) です。
pub fn encode_struct_type(fields: &[(u8, bool)]) -> Vec<u8> {
    let mut out = Vec::new();
    out.push(STRUCT_TYPE); // 0x5F
    encode_u32_leb128(&mut out, fields.len() as u32);
    for &(valtype, is_mutable) in fields {
        out.push(valtype);
        out.push(if is_mutable { MUT_VAR } else { MUT_CONST });
    }
    out
}

/// 複数バイトの型（参照型など）も扱える struct 型エンコーダ
pub fn encode_struct_type_flexible(fields: &[(&[u8], bool)]) -> Vec<u8> {
    let mut out = Vec::new();
    out.push(STRUCT_TYPE); // 0x5F
    encode_u32_leb128(&mut out, fields.len() as u32);
    for &(valtype_bytes, is_mutable) in fields {
        out.extend_from_slice(valtype_bytes);
        out.push(if is_mutable { MUT_VAR } else { MUT_CONST });
    }
    out
}

/// WASM GC の array 型をエンコードします。
pub fn encode_array_type(element_valtype: u8, is_mutable: bool) -> Vec<u8> {
    let mut out = Vec::new();
    out.push(ARRAY_TYPE); // 0x5E
    out.push(element_valtype);
    out.push(if is_mutable { MUT_VAR } else { MUT_CONST });
    out
}

/// 複数バイトの要素型を扱える array 型エンコーダ
pub fn encode_array_type_flexible(element_valtype_bytes: &[u8], is_mutable: bool) -> Vec<u8> {
    let mut out = Vec::new();
    out.push(ARRAY_TYPE); // 0x5E
    out.extend_from_slice(element_valtype_bytes);
    out.push(if is_mutable { MUT_VAR } else { MUT_CONST });
    out
}

/// (ref null any) の型表現バイト列 [0x63, 0x6E]
pub fn ref_null_any() -> &'static [u8] {
    &[REF_NULL_PREFIX, HEAP_TYPE_ANY]
}

/// (ref $type_idx) の型表現バイト列
pub fn ref_exact_type(type_idx: u32) -> Vec<u8> {
    let mut out = vec![REF_EXACT_PREFIX];
    encode_u32_leb128(&mut out, type_idx);
    out
}

/// (ref null $type_idx) の型表現バイト列
pub fn ref_null_type(type_idx: u32) -> Vec<u8> {
    let mut out = vec![REF_NULL_PREFIX];
    encode_u32_leb128(&mut out, type_idx);
    out
}

/// struct.new <type_idx> 命令を出力
pub fn emit_struct_new(out: &mut Vec<u8>, type_idx: u32) {
    out.push(GC_PREFIX);
    out.push(STRUCT_NEW);
    encode_u32_leb128(out, type_idx);
}

/// struct.get <type_idx> <field_idx> 命令を出力
pub fn emit_struct_get(out: &mut Vec<u8>, type_idx: u32, field_idx: u32) {
    out.push(GC_PREFIX);
    out.push(STRUCT_GET);
    encode_u32_leb128(out, type_idx);
    encode_u32_leb128(out, field_idx);
}

/// struct.set <type_idx> <field_idx> 命令を出力
pub fn emit_struct_set(out: &mut Vec<u8>, type_idx: u32, field_idx: u32) {
    out.push(GC_PREFIX);
    out.push(STRUCT_SET);
    encode_u32_leb128(out, type_idx);
    encode_u32_leb128(out, field_idx);
}

/// array.new_fixed <type_idx> <size> 命令を出力
pub fn emit_array_new_fixed(out: &mut Vec<u8>, type_idx: u32, size: u32) {
    out.push(GC_PREFIX);
    out.push(ARRAY_NEW_FIXED);
    encode_u32_leb128(out, type_idx);
    encode_u32_leb128(out, size);
}

/// array.get <type_idx> 命令を出力
pub fn emit_array_get(out: &mut Vec<u8>, type_idx: u32) {
    out.push(GC_PREFIX);
    out.push(ARRAY_GET);
    encode_u32_leb128(out, type_idx);
}

/// array.len 命令を出力
pub fn emit_array_len(out: &mut Vec<u8>) {
    out.push(GC_PREFIX);
    out.push(ARRAY_LEN);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encode_struct_and_array_types() {
        // struct with two immutable i64 fields
        let s = encode_struct_type(&[(I64, false), (I64, false)]);
        assert_eq!(s, vec![0x5F, 0x02, 0x7E, 0x00, 0x7E, 0x00]);

        // array with mutable i32 elements
        let a = encode_array_type(I32, true);
        assert_eq!(a, vec![0x5E, 0x7F, 0x01]);
    }

    #[test]
    fn test_emit_gc_instructions() {
        let mut code = Vec::new();
        emit_struct_new(&mut code, 0);
        emit_struct_get(&mut code, 0, 1);
        emit_array_len(&mut code);

        assert_eq!(
            code,
            vec![
                0xFB, 0x00, 0x00, // struct.new 0
                0xFB, 0x02, 0x00, 0x01, // struct.get 0 1
                0xFB, 0x0F, // array.len
            ]
        );
    }

    #[cfg(not(target_arch = "wasm32"))]
    #[test]
    fn test_wasmtime_struct_return() {
        // Type 0: struct { field 0: i64 const, field 1: i64 const }
        // Type 1: func () -> (ref 0)  [0x60, 0x00, 0x01, 0x64, 0x00]
        let mut type_sec_payload = Vec::new();
        encode_u32_leb128(&mut type_sec_payload, 2);
        type_sec_payload.extend_from_slice(&encode_struct_type(&[(I64, false), (I64, false)]));
        type_sec_payload.extend_from_slice(&[FUNC_TYPE, 0, 1, REF_EXACT_PREFIX, 0]);

        let mut type_sec = Vec::new();
        type_sec.push(TYPE_SECTION);
        encode_u32_leb128(&mut type_sec, type_sec_payload.len() as u32);
        type_sec.extend_from_slice(&type_sec_payload);

        let func_sec = vec![FUNCTION_SECTION, 2, 1, 1];

        let export_name = b"main";
        let mut export_sec_payload = Vec::new();
        encode_u32_leb128(&mut export_sec_payload, 1);
        encode_u32_leb128(&mut export_sec_payload, export_name.len() as u32);
        export_sec_payload.extend_from_slice(export_name);
        export_sec_payload.push(0x00);
        encode_u32_leb128(&mut export_sec_payload, 0);

        let mut export_sec = Vec::new();
        export_sec.push(EXPORT_SECTION);
        encode_u32_leb128(&mut export_sec, export_sec_payload.len() as u32);
        export_sec.extend_from_slice(&export_sec_payload);

        let mut func_body = Vec::new();
        func_body.push(0);
        func_body.push(I64_CONST);
        encode_i64_sleb128(&mut func_body, 10);
        func_body.push(I64_CONST);
        encode_i64_sleb128(&mut func_body, 42);
        emit_struct_new(&mut func_body, 0);
        func_body.push(END);

        let mut code_sec_payload = Vec::new();
        encode_u32_leb128(&mut code_sec_payload, 1);
        encode_u32_leb128(&mut code_sec_payload, func_body.len() as u32);
        code_sec_payload.extend_from_slice(&func_body);

        let mut code_sec = Vec::new();
        code_sec.push(CODE_SECTION);
        encode_u32_leb128(&mut code_sec, code_sec_payload.len() as u32);
        code_sec.extend_from_slice(&code_sec_payload);

        let mut wasm_module = Vec::new();
        wasm_module.extend_from_slice(&WASM_MAGIC);
        wasm_module.extend_from_slice(&WASM_VERSION);
        wasm_module.extend_from_slice(&type_sec);
        wasm_module.extend_from_slice(&func_sec);
        wasm_module.extend_from_slice(&export_sec);
        wasm_module.extend_from_slice(&code_sec);

        let mut config = wasmtime::Config::new();
        config.wasm_gc(true);
        let engine = wasmtime::Engine::new(&config).unwrap();
        let module = wasmtime::Module::new(&engine, &wasm_module).unwrap();
        let mut store = wasmtime::Store::new(&engine, ());
        let instance = wasmtime::Instance::new(&mut store, &module, &[]).unwrap();
        let main_func = instance.get_func(&mut store, "main").unwrap();
        let mut results = [wasmtime::Val::I32(0)];
        main_func.call(&mut store, &[], &mut results).unwrap();

        match &results[0] {
            wasmtime::Val::AnyRef(Some(anyref)) => {
                let struct_ref = anyref.as_struct(&store).unwrap().unwrap();
                let f0 = struct_ref.field(&mut store, 0).unwrap();
                let f1 = struct_ref.field(&mut store, 1).unwrap();
                assert_eq!(f0.i64(), Some(10));
                assert_eq!(f1.i64(), Some(42));
            }
            other => panic!("Unexpected val: {other:?}"),
        }
    }

    #[cfg(not(target_arch = "wasm32"))]
    #[test]
    fn test_wasmtime_struct_new_and_get() {
        // Construct a Wasm module using WASM GC struct.new and struct.get
        // Type 0: struct { field 0: i64 const, field 1: i64 const }
        // Type 1: func () -> i64
        let mut type_sec_payload = Vec::new();
        encode_u32_leb128(&mut type_sec_payload, 2); // 2 types
        // Type 0: struct
        type_sec_payload.extend_from_slice(&encode_struct_type(&[(I64, false), (I64, false)]));
        // Type 1: func () -> i64
        type_sec_payload.extend_from_slice(&[FUNC_TYPE, 0, 1, I64]);

        let mut type_sec = Vec::new();
        type_sec.push(TYPE_SECTION);
        encode_u32_leb128(&mut type_sec, type_sec_payload.len() as u32);
        type_sec.extend_from_slice(&type_sec_payload);

        // Function Section: 1 function of Type 1
        let func_sec = vec![FUNCTION_SECTION, 2, 1, 1];

        // Export Section: export "main" as func 0
        let export_name = b"main";
        let mut export_sec_payload = Vec::new();
        encode_u32_leb128(&mut export_sec_payload, 1); // 1 export
        encode_u32_leb128(&mut export_sec_payload, export_name.len() as u32);
        export_sec_payload.extend_from_slice(export_name);
        export_sec_payload.push(0x00); // export kind: func
        encode_u32_leb128(&mut export_sec_payload, 0); // func index 0

        let mut export_sec = Vec::new();
        export_sec.push(EXPORT_SECTION);
        encode_u32_leb128(&mut export_sec, export_sec_payload.len() as u32);
        export_sec.extend_from_slice(&export_sec_payload);

        // Code Section
        let mut func_body = Vec::new();
        func_body.push(0); // 0 local declarations

        // Push 10: i64
        func_body.push(I64_CONST);
        encode_i64_sleb128(&mut func_body, 10);
        // Push 42: i64
        func_body.push(I64_CONST);
        encode_i64_sleb128(&mut func_body, 42);

        // struct.new type_0 (consumes 10, 42, produces structref)
        emit_struct_new(&mut func_body, 0);

        // struct.get type_0 field_1 (consumes structref, produces 42)
        emit_struct_get(&mut func_body, 0, 1);

        func_body.push(END);

        let mut code_sec_payload = Vec::new();
        encode_u32_leb128(&mut code_sec_payload, 1); // 1 function body
        encode_u32_leb128(&mut code_sec_payload, func_body.len() as u32);
        code_sec_payload.extend_from_slice(&func_body);

        let mut code_sec = Vec::new();
        code_sec.push(CODE_SECTION);
        encode_u32_leb128(&mut code_sec, code_sec_payload.len() as u32);
        code_sec.extend_from_slice(&code_sec_payload);

        // Build entire Wasm module
        let mut wasm_module = Vec::new();
        wasm_module.extend_from_slice(&WASM_MAGIC);
        wasm_module.extend_from_slice(&WASM_VERSION);
        wasm_module.extend_from_slice(&type_sec);
        wasm_module.extend_from_slice(&func_sec);
        wasm_module.extend_from_slice(&export_sec);
        wasm_module.extend_from_slice(&code_sec);

        // Run with execute_wasm
        let res =
            crate::wasm_emitter::executor::execute_wasm(&wasm_module).expect("execution failed");
        assert_eq!(res, crate::expression_eval::Value::Number(42));
    }

    #[cfg(not(target_arch = "wasm32"))]
    #[test]
    fn test_wasmtime_array_new_fixed_and_get() {
        // Construct a Wasm module using WASM GC array.new_fixed and array.get
        // Type 0: array of i64 (const)
        // Type 1: func () -> i64
        let mut type_sec_payload = Vec::new();
        encode_u32_leb128(&mut type_sec_payload, 2); // 2 types
        // Type 0: array
        type_sec_payload.extend_from_slice(&encode_array_type(I64, false));
        // Type 1: func () -> i64
        type_sec_payload.extend_from_slice(&[FUNC_TYPE, 0, 1, I64]);

        let mut type_sec = Vec::new();
        type_sec.push(TYPE_SECTION);
        encode_u32_leb128(&mut type_sec, type_sec_payload.len() as u32);
        type_sec.extend_from_slice(&type_sec_payload);

        // Function Section: 1 function of Type 1
        let func_sec = vec![FUNCTION_SECTION, 2, 1, 1];

        // Export Section: export "main" as func 0
        let export_name = b"main";
        let mut export_sec_payload = Vec::new();
        encode_u32_leb128(&mut export_sec_payload, 1);
        encode_u32_leb128(&mut export_sec_payload, export_name.len() as u32);
        export_sec_payload.extend_from_slice(export_name);
        export_sec_payload.push(0x00);
        encode_u32_leb128(&mut export_sec_payload, 0);

        let mut export_sec = Vec::new();
        export_sec.push(EXPORT_SECTION);
        encode_u32_leb128(&mut export_sec, export_sec_payload.len() as u32);
        export_sec.extend_from_slice(&export_sec_payload);

        // Code Section
        let mut func_body = Vec::new();
        func_body.push(0); // 0 locals

        // Push 10, 20, 30: i64
        func_body.push(I64_CONST);
        encode_i64_sleb128(&mut func_body, 10);
        func_body.push(I64_CONST);
        encode_i64_sleb128(&mut func_body, 20);
        func_body.push(I64_CONST);
        encode_i64_sleb128(&mut func_body, 30);

        // array.new_fixed type_0 3 (consumes 10, 20, 30, produces arrayref)
        emit_array_new_fixed(&mut func_body, 0, 3);

        // Push index 1: i32
        func_body.push(I32_CONST);
        encode_i32_sleb128(&mut func_body, 1);

        // array.get type_0 (consumes arrayref, index, produces 20)
        emit_array_get(&mut func_body, 0);

        func_body.push(END);

        let mut code_sec_payload = Vec::new();
        encode_u32_leb128(&mut code_sec_payload, 1);
        encode_u32_leb128(&mut code_sec_payload, func_body.len() as u32);
        code_sec_payload.extend_from_slice(&func_body);

        let mut code_sec = Vec::new();
        code_sec.push(CODE_SECTION);
        encode_u32_leb128(&mut code_sec, code_sec_payload.len() as u32);
        code_sec.extend_from_slice(&code_sec_payload);

        // Build entire Wasm module
        let mut wasm_module = Vec::new();
        wasm_module.extend_from_slice(&WASM_MAGIC);
        wasm_module.extend_from_slice(&WASM_VERSION);
        wasm_module.extend_from_slice(&type_sec);
        wasm_module.extend_from_slice(&func_sec);
        wasm_module.extend_from_slice(&export_sec);
        wasm_module.extend_from_slice(&code_sec);

        let res =
            crate::wasm_emitter::executor::execute_wasm(&wasm_module).expect("execution failed");
        assert_eq!(res, crate::expression_eval::Value::Number(20));
    }

    #[cfg(not(target_arch = "wasm32"))]
    #[test]
    fn test_wasmtime_execute_gc_string() {
        // Type 0: (array (mut i8))
        // Type 1: (struct (field i32) (field (ref 0)))
        // Type 2: func () -> (ref null any)
        let mut type_sec_payload = Vec::new();
        encode_u32_leb128(&mut type_sec_payload, 3);
        type_sec_payload.extend_from_slice(&encode_array_type(I8, false));
        type_sec_payload.extend_from_slice(&encode_struct_type_flexible(&[
            (&[I32], false),
            (&ref_exact_type(0), false),
        ]));
        type_sec_payload.extend_from_slice(&[FUNC_TYPE, 0, 1, REF_NULL_PREFIX, HEAP_TYPE_ANY]);

        let mut type_sec = Vec::new();
        type_sec.push(TYPE_SECTION);
        encode_u32_leb128(&mut type_sec, type_sec_payload.len() as u32);
        type_sec.extend_from_slice(&type_sec_payload);

        let func_sec = vec![FUNCTION_SECTION, 2, 1, 2]; // 1 func of type 2

        // Export "evaluate"
        let export_name = b"evaluate";
        let mut export_sec_payload = Vec::new();
        encode_u32_leb128(&mut export_sec_payload, 1);
        encode_u32_leb128(&mut export_sec_payload, export_name.len() as u32);
        export_sec_payload.extend_from_slice(export_name);
        export_sec_payload.push(0x00);
        encode_u32_leb128(&mut export_sec_payload, 0);

        let mut export_sec = Vec::new();
        export_sec.push(EXPORT_SECTION);
        encode_u32_leb128(&mut export_sec, export_sec_payload.len() as u32);
        export_sec.extend_from_slice(&export_sec_payload);

        let mut func_body = Vec::new();
        func_body.push(0); // 0 locals

        // Tag 2: i32
        func_body.push(I32_CONST);
        encode_i32_sleb128(&mut func_body, 2);

        // Bytes 'h', 'i': i32 (104, 105)
        func_body.push(I32_CONST);
        encode_i32_sleb128(&mut func_body, b'h' as i32);
        func_body.push(I32_CONST);
        encode_i32_sleb128(&mut func_body, b'i' as i32);

        // array.new_fixed type 0, size 2
        emit_array_new_fixed(&mut func_body, 0, 2);

        // struct.new type 1 (tag 2, byte_array)
        emit_struct_new(&mut func_body, 1);

        func_body.push(END);

        let mut code_sec_payload = Vec::new();
        encode_u32_leb128(&mut code_sec_payload, 1);
        encode_u32_leb128(&mut code_sec_payload, func_body.len() as u32);
        code_sec_payload.extend_from_slice(&func_body);

        let mut code_sec = Vec::new();
        code_sec.push(CODE_SECTION);
        encode_u32_leb128(&mut code_sec, code_sec_payload.len() as u32);
        code_sec.extend_from_slice(&code_sec_payload);

        let mut wasm_module = Vec::new();
        wasm_module.extend_from_slice(&WASM_MAGIC);
        wasm_module.extend_from_slice(&WASM_VERSION);
        wasm_module.extend_from_slice(&type_sec);
        wasm_module.extend_from_slice(&func_sec);
        wasm_module.extend_from_slice(&export_sec);
        wasm_module.extend_from_slice(&code_sec);

        let res =
            crate::wasm_emitter::executor::execute_wasm(&wasm_module).expect("execution failed");
        assert_eq!(res, crate::expression_eval::Value::String("hi".into()));
    }

    #[cfg(not(target_arch = "wasm32"))]
    #[test]
    fn test_wasmtime_execute_gc_record_and_variant() {
        // Type 0: (array (mut i8))
        // Type 1: $String = (struct (field i32) (field (ref 0)))
        // Type 2: $Number = (struct (field i32) (field i64))
        // Type 3: $RecordField = (struct (field (ref 1)) (field (ref null any)))
        // Type 4: $RecordFieldArray = (array (ref 3))
        // Type 5: $Record = (struct (field i32) (field (ref 4)))
        // Type 6: $Variant = (struct (field i32) (field (ref 1)) (field (ref null any)))
        // Type 7: func () -> (ref null any)
        let mut type_sec_payload = Vec::new();
        encode_u32_leb128(&mut type_sec_payload, 8);
        // 0: ByteArray
        type_sec_payload.extend_from_slice(&encode_array_type(I8, false));
        // 1: String
        type_sec_payload.extend_from_slice(&encode_struct_type_flexible(&[
            (&[I32], false),
            (&ref_exact_type(0), false),
        ]));
        // 2: Number
        type_sec_payload.extend_from_slice(&encode_struct_type(&[(I32, false), (I64, false)]));
        // 3: RecordField (String, anyref)
        type_sec_payload.extend_from_slice(&encode_struct_type_flexible(&[
            (&ref_exact_type(1), false),
            (ref_null_any(), false),
        ]));
        // 4: RecordFieldArray
        type_sec_payload.extend_from_slice(&encode_array_type_flexible(&ref_exact_type(3), false));
        // 5: Record (tag 4, RecordFieldArray)
        type_sec_payload.extend_from_slice(&encode_struct_type_flexible(&[
            (&[I32], false),
            (&ref_exact_type(4), false),
        ]));
        // 6: Variant (tag 6, String, anyref)
        type_sec_payload.extend_from_slice(&encode_struct_type_flexible(&[
            (&[I32], false),
            (&ref_exact_type(1), false),
            (ref_null_any(), false),
        ]));
        // 7: func () -> (ref null any)
        type_sec_payload.extend_from_slice(&[FUNC_TYPE, 0, 1, REF_NULL_PREFIX, HEAP_TYPE_ANY]);

        let mut type_sec = Vec::new();
        type_sec.push(TYPE_SECTION);
        encode_u32_leb128(&mut type_sec, type_sec_payload.len() as u32);
        type_sec.extend_from_slice(&type_sec_payload);

        let func_sec = vec![FUNCTION_SECTION, 2, 1, 7]; // 1 func of type 7

        // Export "evaluate"
        let export_name = b"evaluate";
        let mut export_sec_payload = Vec::new();
        encode_u32_leb128(&mut export_sec_payload, 1);
        encode_u32_leb128(&mut export_sec_payload, export_name.len() as u32);
        export_sec_payload.extend_from_slice(export_name);
        export_sec_payload.push(0x00);
        encode_u32_leb128(&mut export_sec_payload, 0);

        let mut export_sec = Vec::new();
        export_sec.push(EXPORT_SECTION);
        encode_u32_leb128(&mut export_sec, export_sec_payload.len() as u32);
        export_sec.extend_from_slice(&export_sec_payload);

        // Function body: construct Record {"val": 42}
        let mut func_body = Vec::new();
        func_body.push(0); // 0 locals

        // Record tag 4: i32
        func_body.push(I32_CONST);
        encode_i32_sleb128(&mut func_body, 4);

        // Field 0: Key = "val"
        // Key String tag 2: i32
        func_body.push(I32_CONST);
        encode_i32_sleb128(&mut func_body, 2);
        // bytes "val" (118, 97, 108)
        func_body.push(I32_CONST);
        encode_i32_sleb128(&mut func_body, b'v' as i32);
        func_body.push(I32_CONST);
        encode_i32_sleb128(&mut func_body, b'a' as i32);
        func_body.push(I32_CONST);
        encode_i32_sleb128(&mut func_body, b'l' as i32);
        emit_array_new_fixed(&mut func_body, 0, 3);
        emit_struct_new(&mut func_body, 1); // Key String

        // Field 0: Value = Number 42
        func_body.push(I32_CONST);
        encode_i32_sleb128(&mut func_body, 0); // Number tag 0
        func_body.push(I64_CONST);
        encode_i64_sleb128(&mut func_body, 42); // 42
        emit_struct_new(&mut func_body, 2); // Number struct

        // RecordField struct (Key, Value)
        emit_struct_new(&mut func_body, 3);

        // RecordFieldArray: 1 element
        emit_array_new_fixed(&mut func_body, 4, 1);

        // Record struct (tag 4, RecordFieldArray)
        emit_struct_new(&mut func_body, 5);

        func_body.push(END);

        let mut code_sec_payload = Vec::new();
        encode_u32_leb128(&mut code_sec_payload, 1);
        encode_u32_leb128(&mut code_sec_payload, func_body.len() as u32);
        code_sec_payload.extend_from_slice(&func_body);

        let mut code_sec = Vec::new();
        code_sec.push(CODE_SECTION);
        encode_u32_leb128(&mut code_sec, code_sec_payload.len() as u32);
        code_sec.extend_from_slice(&code_sec_payload);

        let mut wasm_module = Vec::new();
        wasm_module.extend_from_slice(&WASM_MAGIC);
        wasm_module.extend_from_slice(&WASM_VERSION);
        wasm_module.extend_from_slice(&type_sec);
        wasm_module.extend_from_slice(&func_sec);
        wasm_module.extend_from_slice(&export_sec);
        wasm_module.extend_from_slice(&code_sec);

        let res =
            crate::wasm_emitter::executor::execute_wasm(&wasm_module).expect("execution failed");
        assert_eq!(
            res,
            crate::expression_eval::Value::Record(vec![(
                "val".into(),
                crate::expression_eval::Value::Number(42)
            )])
        );
    }
}

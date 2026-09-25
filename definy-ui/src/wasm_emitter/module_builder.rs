use super::bytecode::*;

/// Assembles a complete WebAssembly module binary from compiled function bodies and static data.
pub(crate) fn assemble_wasm_module(
    main_code_bytes: &[u8],
    main_locals_count: u32,
    compiled_function_bodies: &[Vec<u8>],
    static_data: &[u8],
) -> Vec<u8> {
    let mut module = Vec::new();
    module.extend_from_slice(&WASM_MAGIC);
    module.extend_from_slice(&WASM_VERSION);

    // 1. Type Section:
    // Type 0: () -> i32 (returns pointer to Value in memory)
    // Type 1: (i32, i32) -> i32 (function with env_ptr and arg_ptr returning Value pointer)
    let mut type_section = Vec::new();
    type_section.push(2); // 2 types
    type_section.extend_from_slice(&[0x60, 0, 1, I32]);
    type_section.extend_from_slice(&[0x60, 2, I32, I32, 1, I32]);
    emit_section(&mut module, TYPE_SECTION, &type_section);

    // 2. Function Section:
    let num_funcs = compiled_function_bodies.len();
    let mut function_section = Vec::new();
    encode_u32_leb128(&mut function_section, (1 + num_funcs) as u32);
    function_section.push(0); // function 0 is evaluate (type 0)
    function_section.resize(function_section.len() + num_funcs, 1);
    emit_section(&mut module, FUNCTION_SECTION, &function_section);

    // 3. Table Section:
    let mut table_section = Vec::new();
    table_section.push(1); // 1 table
    table_section.push(FUNCREF);
    table_section.push(0x00); // limits: flag 0 (min only)
    encode_u32_leb128(&mut table_section, num_funcs.max(1) as u32);
    emit_section(&mut module, TABLE_SECTION, &table_section);

    // 4. Memory Section: 1 memory, min 2 pages (128KB)
    let memory_section = vec![1, 0x00, 2];
    emit_section(&mut module, MEMORY_SECTION, &memory_section);

    // 5. Global Section:
    // Global 0: mut i32 = HEAP_START_OFFSET (bump heap pointer)
    let mut global_section = vec![1, I32, 1, I32_CONST];
    encode_i32_sleb128(&mut global_section, HEAP_START_OFFSET as i32);
    global_section.push(END);
    emit_section(&mut module, GLOBAL_SECTION, &global_section);

    // 6. Export Section:
    let mut export_section = Vec::new();
    export_section.push(2); // 2 exports

    let export_name_eval = "evaluate".as_bytes();
    export_section.push(export_name_eval.len() as u8);
    export_section.extend_from_slice(export_name_eval);
    export_section.push(0x00); // kind: function
    export_section.push(0); // function idx 0

    let export_name_mem = "memory".as_bytes();
    export_section.push(export_name_mem.len() as u8);
    export_section.extend_from_slice(export_name_mem);
    export_section.push(0x02); // kind: memory
    export_section.push(0); // memory idx 0

    emit_section(&mut module, EXPORT_SECTION, &export_section);

    // 7. Element Section: initialize Table with Function indices 1..=num_funcs
    if num_funcs > 0 {
        let mut element_section = Vec::new();
        element_section.push(1); // 1 segment
        element_section.push(0); // table index 0
        element_section.push(I32_CONST);
        encode_i32_sleb128(&mut element_section, 0); // table offset 0
        element_section.push(END);
        encode_u32_leb128(&mut element_section, num_funcs as u32);
        for f in 0..num_funcs {
            encode_u32_leb128(&mut element_section, (1 + f) as u32);
        }
        emit_section(&mut module, ELEMENT_SECTION, &element_section);
    }

    // 8. Code Section:
    let mut code_section = Vec::new();
    encode_u32_leb128(&mut code_section, (1 + num_funcs) as u32);

    let mut func_body = Vec::new();
    func_body.push(2); // 2 local declaration groups
    encode_u32_leb128(&mut func_body, 1);
    func_body.push(I64); // local 0 is i64 (temp for number arithmetic)
    encode_u32_leb128(&mut func_body, main_locals_count);
    func_body.push(I32); // locals 1 .. 1 + main_locals_count are i32 (pointers / temp values)
    func_body.extend_from_slice(main_code_bytes);

    encode_u32_leb128(&mut code_section, func_body.len() as u32);
    code_section.extend_from_slice(&func_body);

    for f_body in compiled_function_bodies {
        encode_u32_leb128(&mut code_section, f_body.len() as u32);
        code_section.extend_from_slice(f_body);
    }

    emit_section(&mut module, CODE_SECTION, &code_section);

    // 9. Data Section:
    if !static_data.is_empty() {
        let mut data_section = Vec::new();
        data_section.push(1); // 1 segment
        data_section.push(0); // memory 0
        data_section.push(I32_CONST);
        encode_i32_sleb128(&mut data_section, 1024);
        data_section.push(END);
        encode_u32_leb128(&mut data_section, static_data.len() as u32);
        data_section.extend_from_slice(static_data);
        emit_section(&mut module, DATA_SECTION, &data_section);
    }

    module
}

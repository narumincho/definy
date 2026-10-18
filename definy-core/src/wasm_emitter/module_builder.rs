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
    // Function 0: evaluate (type 0)
    // Functions 1..=num_funcs: user closures (type 1)
    // Function 1 + num_funcs: built-in byte_stream_next helper (type 1)
    let num_funcs = compiled_function_bodies.len();
    let total_table_funcs = num_funcs + 1;
    let mut function_section = Vec::new();
    encode_u32_leb128(&mut function_section, (1 + total_table_funcs) as u32);
    function_section.push(0); // function 0 is evaluate (type 0)
    function_section.resize(function_section.len() + total_table_funcs, 1);
    emit_section(&mut module, FUNCTION_SECTION, &function_section);

    // 3. Table Section:
    let mut table_section = Vec::new();
    table_section.push(1); // 1 table
    table_section.push(FUNCREF);
    table_section.push(0x00); // limits: flag 0 (min only)
    encode_u32_leb128(&mut table_section, total_table_funcs as u32);
    emit_section(&mut module, TABLE_SECTION, &table_section);

    // 静的データ (1024 番地から) が HEAP_START_OFFSET を超えるときは, その後ろからヒープを始める.
    // 以前は常に HEAP_START_OFFSET から始めていたため, 大きなリテラル (definy 製コンパイラに渡す
    // コンパイラ自身の式など) を含むとヒープの確保で静的データを上書きしていた
    let heap_start = HEAP_START_OFFSET.max((1024 + static_data.len() as u32).next_multiple_of(8));

    // 4. Memory Section: 1 memory, min 16 pages (1MB) or enough for the static data
    let min_pages = 16.max(heap_start.div_ceil(65536) + 1);
    let mut memory_section = vec![1, 0x00];
    encode_u32_leb128(&mut memory_section, min_pages);
    emit_section(&mut module, MEMORY_SECTION, &memory_section);

    // 5. Global Section:
    // Global 0: mut i32 = heap_start (bump heap pointer)
    // Global 1: const i32 = num_funcs (table index of byte_stream_next)
    let mut global_section = vec![2, I32, 1, I32_CONST];
    encode_i32_sleb128(&mut global_section, heap_start as i32);
    global_section.push(END);
    global_section.extend_from_slice(&[I32, 0, I32_CONST]);
    encode_i32_sleb128(&mut global_section, num_funcs as i32);
    global_section.push(END);
    emit_section(&mut module, GLOBAL_SECTION, &global_section);

    // 6. Export Section:
    let mut export_section = Vec::new();
    export_section.push(4); // 4 exports

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

    let export_name_table = "table".as_bytes();
    export_section.push(export_name_table.len() as u8);
    export_section.extend_from_slice(export_name_table);
    export_section.push(0x01); // kind: table
    export_section.push(0); // table idx 0

    let export_name_stream_next = "stream_next_table_idx".as_bytes();
    export_section.push(export_name_stream_next.len() as u8);
    export_section.extend_from_slice(export_name_stream_next);
    export_section.push(0x03); // kind: global
    export_section.push(1); // global idx 1

    emit_section(&mut module, EXPORT_SECTION, &export_section);

    // 7. Element Section: initialize Table with Function indices 1..=total_table_funcs
    let mut element_section = Vec::new();
    element_section.push(1); // 1 segment
    element_section.push(0); // table index 0
    element_section.push(I32_CONST);
    encode_i32_sleb128(&mut element_section, 0); // table offset 0
    element_section.push(END);
    encode_u32_leb128(&mut element_section, total_table_funcs as u32);
    for f in 0..total_table_funcs {
        encode_u32_leb128(&mut element_section, (1 + f) as u32);
    }
    emit_section(&mut module, ELEMENT_SECTION, &element_section);

    // 8. Code Section:
    let mut code_section = Vec::new();
    encode_u32_leb128(&mut code_section, (1 + total_table_funcs) as u32);

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

    // Built-in byte_stream_next(env_ptr: i32, args_ptr: i32) -> i32
    // env_ptr points to [step0_ptr: i32, done_ptr: i32]
    // args_ptr points to [state_ptr: i32] (Tag 0 Number with i64 at +8)
    let stream_next_body: [u8; 22] = [
        0x00, // 0 local declarations
        LOCAL_GET, 0x00, I32_LOAD, 0x02, 0x00, // step0_ptr = i32.load(env_ptr + 0)
        LOCAL_GET, 0x00, I32_LOAD, 0x02, 0x04, // done_ptr = i32.load(env_ptr + 4)
        LOCAL_GET, 0x01, I32_LOAD, 0x02, 0x00, // state_ptr = i32.load(args_ptr + 0)
        I64_LOAD, 0x03, 0x08, // state_val = i64.load(state_ptr + 8)
        I64_EQZ, SELECT, END,
    ];
    encode_u32_leb128(&mut code_section, stream_next_body.len() as u32);
    code_section.extend_from_slice(&stream_next_body);

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

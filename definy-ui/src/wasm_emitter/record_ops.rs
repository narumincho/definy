use std::collections::HashMap;

use crate::wasm_emitter::adt_ops::emit_string_eq;
use crate::wasm_emitter::bytecode::*;
use crate::wasm_emitter::compiler::{CompileContext, emit_expression};

pub(crate) fn emit_record_get(
    record_get: &definy_event::event::RecordGetExpression,
    out: &mut Vec<u8>,
    env: &HashMap<i64, u32>,
    next_local_idx: &mut u32,
    ctx: &mut CompileContext,
) -> Result<(), String> {
    // 1. Evaluate record expression
    emit_expression(&record_get.record, out, env, next_local_idx, ctx)?;
    let record_ptr_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(LOCAL_SET);
    encode_u32_leb128(out, record_ptr_local);

    // 2. Target key string pointer
    let target_key_ptr = ctx.alloc_static_string(&record_get.key);
    let target_key_ptr_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(I32_CONST);
    encode_i32_sleb128(out, target_key_ptr as i32);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, target_key_ptr_local);

    // 3. Load record items count (stored at record_ptr + 4)
    let count_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(LOCAL_GET);
    encode_u32_leb128(out, record_ptr_local);
    out.push(I32_LOAD);
    encode_mem_arg(out, 2, 4);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, count_local);

    // 4. Result val ptr local (init to 0)
    let result_ptr_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(I32_CONST);
    encode_i32_sleb128(out, 0);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, result_ptr_local);

    // 5. Loop counter idx_local (init to 0)
    let idx_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(I32_CONST);
    encode_i32_sleb128(out, 0);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, idx_local);

    // Outer block (label 1: break target)
    out.push(BLOCK);
    out.push(BLOCK_TYPE_EMPTY);

    // Loop (label 0: continue target)
    out.push(LOOP);
    out.push(BLOCK_TYPE_EMPTY);

    // if idx == count, break out of block
    out.push(LOCAL_GET);
    encode_u32_leb128(out, idx_local);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, count_local);
    out.push(I32_EQ);
    out.push(BR_IF);
    out.push(1); // break out of BLOCK

    // Current item's key pointer: record_ptr + 8 + idx * 8
    let curr_key_ptr_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(LOCAL_GET);
    encode_u32_leb128(out, record_ptr_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 8);
    out.push(I32_ADD);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, idx_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 8);
    out.push(I32_MUL);
    out.push(I32_ADD);
    out.push(I32_LOAD);
    encode_mem_arg(out, 2, 0);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, curr_key_ptr_local);

    // Compare curr_key and target_key
    emit_string_eq(
        curr_key_ptr_local,
        target_key_ptr_local,
        out,
        next_local_idx,
    );

    out.push(IF);
    out.push(BLOCK_TYPE_EMPTY);

    // Load val_ptr from record_ptr + 12 + idx * 8
    out.push(LOCAL_GET);
    encode_u32_leb128(out, record_ptr_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 12);
    out.push(I32_ADD);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, idx_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 8);
    out.push(I32_MUL);
    out.push(I32_ADD);
    out.push(I32_LOAD);
    encode_mem_arg(out, 2, 0);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, result_ptr_local);

    // Break out of loop/block (depth: IF=0, LOOP=1, BLOCK=2)
    out.push(BR);
    out.push(2);

    out.push(END); // end if

    // idx += 1
    out.push(LOCAL_GET);
    encode_u32_leb128(out, idx_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 1);
    out.push(I32_ADD);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, idx_local);

    // continue loop
    out.push(BR);
    out.push(0);

    out.push(END); // end loop
    out.push(END); // end block

    // Push result pointer to stack
    out.push(LOCAL_GET);
    encode_u32_leb128(out, result_ptr_local);

    Ok(())
}

use std::collections::HashMap;

use definy_event::event::Expression;

use super::bytecode::*;
use super::compiler::{CompileContext, emit_alloc_number_from_stack, emit_expression};

pub(crate) fn emit_list_length(
    value: &Expression,
    out: &mut Vec<u8>,
    env: &HashMap<i64, u32>,
    next_local_idx: &mut u32,
    ctx: &mut CompileContext,
) -> Result<(), String> {
    emit_expression(value, out, env, next_local_idx, ctx)?;
    out.push(I32_LOAD);
    encode_mem_arg(out, 2, 4); // load count at offset 4
    out.push(I64_EXTEND_I32_U);
    emit_alloc_number_from_stack(out, next_local_idx);
    Ok(())
}

pub(crate) fn emit_list_concat(
    left: &Expression,
    right: &Expression,
    out: &mut Vec<u8>,
    env: &HashMap<i64, u32>,
    next_local_idx: &mut u32,
    ctx: &mut CompileContext,
) -> Result<(), String> {
    emit_expression(left, out, env, next_local_idx, ctx)?;
    let left_ptr_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(LOCAL_SET);
    encode_u32_leb128(out, left_ptr_local);

    emit_expression(right, out, env, next_local_idx, ctx)?;
    let right_ptr_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(LOCAL_SET);
    encode_u32_leb128(out, right_ptr_local);

    let left_count_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(LOCAL_GET);
    encode_u32_leb128(out, left_ptr_local);
    out.push(I32_LOAD);
    encode_mem_arg(out, 2, 4);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, left_count_local);

    let right_count_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(LOCAL_GET);
    encode_u32_leb128(out, right_ptr_local);
    out.push(I32_LOAD);
    encode_mem_arg(out, 2, 4);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, right_count_local);

    let new_count_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(LOCAL_GET);
    encode_u32_leb128(out, left_count_local);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, right_count_local);
    out.push(I32_ADD);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, new_count_local);

    let new_list_ptr_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(GLOBAL_GET);
    out.push(0);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, new_list_ptr_local);

    // Tag 3
    out.push(LOCAL_GET);
    encode_u32_leb128(out, new_list_ptr_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 3);
    out.push(I32_STORE8);
    encode_mem_arg(out, 0, 0);

    // Count
    out.push(LOCAL_GET);
    encode_u32_leb128(out, new_list_ptr_local);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, new_count_local);
    out.push(I32_STORE);
    encode_mem_arg(out, 2, 4);

    // Update heap
    out.push(GLOBAL_GET);
    out.push(0);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, new_count_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 4);
    out.push(I32_MUL);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 15);
    out.push(I32_ADD);
    out.push(I32_CONST);
    encode_i32_sleb128(out, !7);
    out.push(I32_AND);
    out.push(I32_ADD);
    out.push(GLOBAL_SET);
    out.push(0);

    // Copy left items
    let i_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(I32_CONST);
    encode_i32_sleb128(out, 0);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, i_local);

    out.push(BLOCK);
    out.push(BLOCK_TYPE_EMPTY);
    out.push(LOOP);
    out.push(BLOCK_TYPE_EMPTY);

    out.push(LOCAL_GET);
    encode_u32_leb128(out, i_local);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, left_count_local);
    out.push(I32_GE_S);
    out.push(BR_IF);
    encode_u32_leb128(out, 1);

    out.push(LOCAL_GET);
    encode_u32_leb128(out, new_list_ptr_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 8);
    out.push(I32_ADD);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, i_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 4);
    out.push(I32_MUL);
    out.push(I32_ADD);

    out.push(LOCAL_GET);
    encode_u32_leb128(out, left_ptr_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 8);
    out.push(I32_ADD);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, i_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 4);
    out.push(I32_MUL);
    out.push(I32_ADD);
    out.push(I32_LOAD);
    encode_mem_arg(out, 2, 0);

    out.push(I32_STORE);
    encode_mem_arg(out, 2, 0);

    out.push(LOCAL_GET);
    encode_u32_leb128(out, i_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 1);
    out.push(I32_ADD);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, i_local);

    out.push(BR);
    encode_u32_leb128(out, 0);
    out.push(END);
    out.push(END);

    // Copy right items
    out.push(I32_CONST);
    encode_i32_sleb128(out, 0);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, i_local);

    out.push(BLOCK);
    out.push(BLOCK_TYPE_EMPTY);
    out.push(LOOP);
    out.push(BLOCK_TYPE_EMPTY);

    out.push(LOCAL_GET);
    encode_u32_leb128(out, i_local);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, right_count_local);
    out.push(I32_GE_S);
    out.push(BR_IF);
    encode_u32_leb128(out, 1);

    out.push(LOCAL_GET);
    encode_u32_leb128(out, new_list_ptr_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 8);
    out.push(I32_ADD);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, left_count_local);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, i_local);
    out.push(I32_ADD);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 4);
    out.push(I32_MUL);
    out.push(I32_ADD);

    out.push(LOCAL_GET);
    encode_u32_leb128(out, right_ptr_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 8);
    out.push(I32_ADD);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, i_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 4);
    out.push(I32_MUL);
    out.push(I32_ADD);
    out.push(I32_LOAD);
    encode_mem_arg(out, 2, 0);

    out.push(I32_STORE);
    encode_mem_arg(out, 2, 0);

    out.push(LOCAL_GET);
    encode_u32_leb128(out, i_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 1);
    out.push(I32_ADD);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, i_local);

    out.push(BR);
    encode_u32_leb128(out, 0);
    out.push(END);
    out.push(END);

    out.push(LOCAL_GET);
    encode_u32_leb128(out, new_list_ptr_local);
    Ok(())
}

pub(crate) fn emit_list_get(
    list: &Expression,
    index: &Expression,
    out: &mut Vec<u8>,
    env: &HashMap<i64, u32>,
    next_local_idx: &mut u32,
    ctx: &mut CompileContext,
) -> Result<(), String> {
    emit_expression(list, out, env, next_local_idx, ctx)?;
    let list_ptr_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(LOCAL_SET);
    encode_u32_leb128(out, list_ptr_local);

    emit_expression(index, out, env, next_local_idx, ctx)?;
    out.push(I64_LOAD);
    encode_mem_arg(out, 3, 8);
    out.push(I32_WRAP_I64);
    let idx_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(LOCAL_SET);
    encode_u32_leb128(out, idx_local);

    let count_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(LOCAL_GET);
    encode_u32_leb128(out, list_ptr_local);
    out.push(I32_LOAD);
    encode_mem_arg(out, 2, 4);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, count_local);

    out.push(LOCAL_GET);
    encode_u32_leb128(out, idx_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 0);
    out.push(I32_GE_S);

    out.push(LOCAL_GET);
    encode_u32_leb128(out, idx_local);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, count_local);
    out.push(I32_LT_S);

    out.push(I32_AND);

    out.push(IF);
    out.push(BLOCK_TYPE_I32);

    out.push(LOCAL_GET);
    encode_u32_leb128(out, list_ptr_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 8);
    out.push(I32_ADD);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, idx_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 4);
    out.push(I32_MUL);
    out.push(I32_ADD);
    out.push(I32_LOAD);
    encode_mem_arg(out, 2, 0);

    out.push(ELSE);

    let default_ptr = ctx.alloc_static_number(0);
    out.push(I32_CONST);
    encode_i32_sleb128(out, default_ptr as i32);

    out.push(END);
    Ok(())
}

pub(crate) fn emit_list_append(
    list: &Expression,
    item: &Expression,
    out: &mut Vec<u8>,
    env: &HashMap<i64, u32>,
    next_local_idx: &mut u32,
    ctx: &mut CompileContext,
) -> Result<(), String> {
    emit_expression(list, out, env, next_local_idx, ctx)?;
    let list_ptr_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(LOCAL_SET);
    encode_u32_leb128(out, list_ptr_local);

    emit_expression(item, out, env, next_local_idx, ctx)?;
    let item_ptr_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(LOCAL_SET);
    encode_u32_leb128(out, item_ptr_local);

    let old_count_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(LOCAL_GET);
    encode_u32_leb128(out, list_ptr_local);
    out.push(I32_LOAD);
    encode_mem_arg(out, 2, 4);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, old_count_local);

    let new_count_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(LOCAL_GET);
    encode_u32_leb128(out, old_count_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 1);
    out.push(I32_ADD);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, new_count_local);

    let new_list_ptr_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(GLOBAL_GET);
    out.push(0);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, new_list_ptr_local);

    // Tag 3
    out.push(LOCAL_GET);
    encode_u32_leb128(out, new_list_ptr_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 3);
    out.push(I32_STORE8);
    encode_mem_arg(out, 0, 0);

    // new_count
    out.push(LOCAL_GET);
    encode_u32_leb128(out, new_list_ptr_local);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, new_count_local);
    out.push(I32_STORE);
    encode_mem_arg(out, 2, 4);

    // Update heap
    out.push(GLOBAL_GET);
    out.push(0);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, new_count_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 4);
    out.push(I32_MUL);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 15);
    out.push(I32_ADD);
    out.push(I32_CONST);
    encode_i32_sleb128(out, !7);
    out.push(I32_AND);
    out.push(I32_ADD);
    out.push(GLOBAL_SET);
    out.push(0);

    // Copy old items: i = 0; while (i < old_count) { ... }
    let i_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(I32_CONST);
    encode_i32_sleb128(out, 0);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, i_local);

    out.push(BLOCK);
    out.push(BLOCK_TYPE_EMPTY);
    out.push(LOOP);
    out.push(BLOCK_TYPE_EMPTY);

    out.push(LOCAL_GET);
    encode_u32_leb128(out, i_local);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, old_count_local);
    out.push(I32_GE_S);
    out.push(BR_IF);
    encode_u32_leb128(out, 1);

    // dest: new_list_ptr + 8 + i * 4
    out.push(LOCAL_GET);
    encode_u32_leb128(out, new_list_ptr_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 8);
    out.push(I32_ADD);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, i_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 4);
    out.push(I32_MUL);
    out.push(I32_ADD);

    // src: list_ptr + 8 + i * 4
    out.push(LOCAL_GET);
    encode_u32_leb128(out, list_ptr_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 8);
    out.push(I32_ADD);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, i_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 4);
    out.push(I32_MUL);
    out.push(I32_ADD);
    out.push(I32_LOAD);
    encode_mem_arg(out, 2, 0);

    out.push(I32_STORE);
    encode_mem_arg(out, 2, 0);

    // i++
    out.push(LOCAL_GET);
    encode_u32_leb128(out, i_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 1);
    out.push(I32_ADD);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, i_local);

    out.push(BR);
    encode_u32_leb128(out, 0);
    out.push(END);
    out.push(END);

    // Store appended item at new_list_ptr + 8 + old_count * 4
    out.push(LOCAL_GET);
    encode_u32_leb128(out, new_list_ptr_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 8);
    out.push(I32_ADD);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, old_count_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 4);
    out.push(I32_MUL);
    out.push(I32_ADD);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, item_ptr_local);
    out.push(I32_STORE);
    encode_mem_arg(out, 2, 0);

    out.push(LOCAL_GET);
    encode_u32_leb128(out, new_list_ptr_local);
    Ok(())
}

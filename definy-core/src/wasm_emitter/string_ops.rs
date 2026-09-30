use std::collections::HashMap;

use definy_event::event::Expression;

use super::bytecode::*;
use super::compiler::{CompileContext, emit_alloc_number_from_stack, emit_expression};

pub(crate) fn emit_string_length(
    value: &Expression,
    out: &mut Vec<u8>,
    env: &HashMap<i64, u32>,
    next_local_idx: &mut u32,
    ctx: &mut CompileContext,
) -> Result<(), String> {
    emit_expression(value, out, env, next_local_idx, ctx)?;
    out.push(I32_LOAD);
    encode_mem_arg(out, 2, 4); // load len (u32) at offset 4
    out.push(I64_EXTEND_I32_U);
    emit_alloc_number_from_stack(out, next_local_idx);
    Ok(())
}

pub(crate) fn emit_string_concat(
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

    let left_len_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(LOCAL_GET);
    encode_u32_leb128(out, left_ptr_local);
    out.push(I32_LOAD);
    encode_mem_arg(out, 2, 4);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, left_len_local);

    let right_len_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(LOCAL_GET);
    encode_u32_leb128(out, right_ptr_local);
    out.push(I32_LOAD);
    encode_mem_arg(out, 2, 4);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, right_len_local);

    let new_len_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(LOCAL_GET);
    encode_u32_leb128(out, left_len_local);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, right_len_local);
    out.push(I32_ADD);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, new_len_local);

    let new_str_ptr_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(GLOBAL_GET);
    out.push(0);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, new_str_ptr_local);

    // Tag 2 at new_str_ptr
    out.push(LOCAL_GET);
    encode_u32_leb128(out, new_str_ptr_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 2);
    out.push(I32_STORE8);
    encode_mem_arg(out, 0, 0);

    // new_len at new_str_ptr + 4
    out.push(LOCAL_GET);
    encode_u32_leb128(out, new_str_ptr_local);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, new_len_local);
    out.push(I32_STORE);
    encode_mem_arg(out, 2, 4);

    // Update global 0: new_str_ptr + ((8 + new_len + 7) / 8) * 8
    out.push(GLOBAL_GET);
    out.push(0);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, new_len_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 15);
    out.push(I32_ADD);
    out.push(I32_CONST);
    encode_i32_sleb128(out, !7);
    out.push(I32_AND);
    out.push(I32_ADD);
    out.push(GLOBAL_SET);
    out.push(0);

    // Copy left bytes
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
    encode_u32_leb128(out, left_len_local);
    out.push(I32_GE_S);
    out.push(BR_IF);
    encode_u32_leb128(out, 1);

    out.push(LOCAL_GET);
    encode_u32_leb128(out, new_str_ptr_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 8);
    out.push(I32_ADD);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, i_local);
    out.push(I32_ADD);

    out.push(LOCAL_GET);
    encode_u32_leb128(out, left_ptr_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 8);
    out.push(I32_ADD);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, i_local);
    out.push(I32_ADD);
    out.push(I32_LOAD8_U);
    encode_mem_arg(out, 0, 0);

    out.push(I32_STORE8);
    encode_mem_arg(out, 0, 0);

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

    // Copy right bytes
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
    encode_u32_leb128(out, right_len_local);
    out.push(I32_GE_S);
    out.push(BR_IF);
    encode_u32_leb128(out, 1);

    out.push(LOCAL_GET);
    encode_u32_leb128(out, new_str_ptr_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 8);
    out.push(I32_ADD);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, left_len_local);
    out.push(I32_ADD);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, i_local);
    out.push(I32_ADD);

    out.push(LOCAL_GET);
    encode_u32_leb128(out, right_ptr_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 8);
    out.push(I32_ADD);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, i_local);
    out.push(I32_ADD);
    out.push(I32_LOAD8_U);
    encode_mem_arg(out, 0, 0);

    out.push(I32_STORE8);
    encode_mem_arg(out, 0, 0);

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
    encode_u32_leb128(out, new_str_ptr_local);
    Ok(())
}

pub(crate) fn emit_string_slice(
    value: &Expression,
    start: &Expression,
    end: &Expression,
    out: &mut Vec<u8>,
    env: &HashMap<i64, u32>,
    next_local_idx: &mut u32,
    ctx: &mut CompileContext,
) -> Result<(), String> {
    emit_expression(value, out, env, next_local_idx, ctx)?;
    let str_ptr_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(LOCAL_SET);
    encode_u32_leb128(out, str_ptr_local);

    emit_expression(start, out, env, next_local_idx, ctx)?;
    out.push(I64_LOAD);
    encode_mem_arg(out, 3, 8);
    out.push(I32_WRAP_I64);
    let raw_start_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(LOCAL_SET);
    encode_u32_leb128(out, raw_start_local);

    emit_expression(end, out, env, next_local_idx, ctx)?;
    out.push(I64_LOAD);
    encode_mem_arg(out, 3, 8);
    out.push(I32_WRAP_I64);
    let raw_end_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(LOCAL_SET);
    encode_u32_leb128(out, raw_end_local);

    let str_len_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(LOCAL_GET);
    encode_u32_leb128(out, str_ptr_local);
    out.push(I32_LOAD);
    encode_mem_arg(out, 2, 4);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, str_len_local);

    // Clamp start = max(0, min(str_len, raw_start))
    let start_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(LOCAL_GET);
    encode_u32_leb128(out, raw_start_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 0);
    out.push(I32_LT_S);
    out.push(IF);
    out.push(BLOCK_TYPE_I32);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 0);
    out.push(ELSE);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, raw_start_local);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, str_len_local);
    out.push(I32_GT_S);
    out.push(IF);
    out.push(BLOCK_TYPE_I32);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, str_len_local);
    out.push(ELSE);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, raw_start_local);
    out.push(END);
    out.push(END);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, start_local);

    // Clamp end = max(start, min(str_len, raw_end))
    let end_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(LOCAL_GET);
    encode_u32_leb128(out, raw_end_local);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, start_local);
    out.push(I32_LT_S);
    out.push(IF);
    out.push(BLOCK_TYPE_I32);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, start_local);
    out.push(ELSE);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, raw_end_local);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, str_len_local);
    out.push(I32_GT_S);
    out.push(IF);
    out.push(BLOCK_TYPE_I32);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, str_len_local);
    out.push(ELSE);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, raw_end_local);
    out.push(END);
    out.push(END);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, end_local);

    // slice_len = end - start
    let slice_len_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(LOCAL_GET);
    encode_u32_leb128(out, end_local);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, start_local);
    out.push(I32_SUB);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, slice_len_local);

    let new_str_ptr_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(GLOBAL_GET);
    out.push(0);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, new_str_ptr_local);

    // Tag 2
    out.push(LOCAL_GET);
    encode_u32_leb128(out, new_str_ptr_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 2);
    out.push(I32_STORE8);
    encode_mem_arg(out, 0, 0);

    // len
    out.push(LOCAL_GET);
    encode_u32_leb128(out, new_str_ptr_local);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, slice_len_local);
    out.push(I32_STORE);
    encode_mem_arg(out, 2, 4);

    // Update heap
    out.push(GLOBAL_GET);
    out.push(0);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, slice_len_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 15);
    out.push(I32_ADD);
    out.push(I32_CONST);
    encode_i32_sleb128(out, !7);
    out.push(I32_AND);
    out.push(I32_ADD);
    out.push(GLOBAL_SET);
    out.push(0);

    // Copy slice bytes
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
    encode_u32_leb128(out, slice_len_local);
    out.push(I32_GE_S);
    out.push(BR_IF);
    encode_u32_leb128(out, 1);

    out.push(LOCAL_GET);
    encode_u32_leb128(out, new_str_ptr_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 8);
    out.push(I32_ADD);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, i_local);
    out.push(I32_ADD);

    out.push(LOCAL_GET);
    encode_u32_leb128(out, str_ptr_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 8);
    out.push(I32_ADD);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, start_local);
    out.push(I32_ADD);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, i_local);
    out.push(I32_ADD);
    out.push(I32_LOAD8_U);
    encode_mem_arg(out, 0, 0);

    out.push(I32_STORE8);
    encode_mem_arg(out, 0, 0);

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
    encode_u32_leb128(out, new_str_ptr_local);
    Ok(())
}

use std::collections::HashMap;

use definy_event::event::{Expression, MatchArm, MatchExpression, VariantExpression};

use super::bytecode::*;
use super::compiler::{CompileContext, emit_expression, encode_mem_arg};

pub(crate) fn emit_variant(
    variant: &VariantExpression,
    out: &mut Vec<u8>,
    env: &HashMap<i64, u32>,
    next_local_idx: &mut u32,
    ctx: &mut CompileContext,
) -> Result<(), String> {
    let tag_ptr = ctx.alloc_static_string(&variant.tag);

    let payload_ptr_local = *next_local_idx;
    *next_local_idx += 1;

    if let Some(payload_expr) = &variant.payload {
        emit_expression(payload_expr, out, env, next_local_idx, ctx)?;
        out.push(LOCAL_SET);
        encode_u32_leb128(out, payload_ptr_local);
    } else {
        out.push(I32_CONST);
        encode_i32_sleb128(out, 0);
        out.push(LOCAL_SET);
        encode_u32_leb128(out, payload_ptr_local);
    }

    let variant_ptr_local = *next_local_idx;
    *next_local_idx += 1;

    out.push(GLOBAL_GET);
    out.push(0);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, variant_ptr_local);

    // Bump heap by 16 bytes
    out.push(GLOBAL_GET);
    out.push(0);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 16);
    out.push(I32_ADD);
    out.push(GLOBAL_SET);
    out.push(0);

    // Store Tag 6 at ptr + 0
    out.push(LOCAL_GET);
    encode_u32_leb128(out, variant_ptr_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 6);
    out.push(I32_STORE8);
    encode_mem_arg(out, 0, 0);

    // Store tag_ptr at ptr + 4
    out.push(LOCAL_GET);
    encode_u32_leb128(out, variant_ptr_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, tag_ptr as i32);
    out.push(I32_STORE);
    encode_mem_arg(out, 2, 4);

    // Store payload_ptr at ptr + 8
    out.push(LOCAL_GET);
    encode_u32_leb128(out, variant_ptr_local);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, payload_ptr_local);
    out.push(I32_STORE);
    encode_mem_arg(out, 2, 8);

    // Result is variant_ptr
    out.push(LOCAL_GET);
    encode_u32_leb128(out, variant_ptr_local);
    Ok(())
}

pub(crate) fn emit_match(
    match_expr: &MatchExpression,
    out: &mut Vec<u8>,
    env: &HashMap<i64, u32>,
    next_local_idx: &mut u32,
    ctx: &mut CompileContext,
) -> Result<(), String> {
    emit_expression(&match_expr.target, out, env, next_local_idx, ctx)?;
    let target_ptr_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(LOCAL_SET);
    encode_u32_leb128(out, target_ptr_local);

    // Load target's tag string ptr from target_ptr + 4
    let target_tag_ptr_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(LOCAL_GET);
    encode_u32_leb128(out, target_ptr_local);
    out.push(I32_LOAD);
    encode_mem_arg(out, 2, 4);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, target_tag_ptr_local);

    // Load target's payload ptr from target_ptr + 8
    let target_payload_ptr_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(LOCAL_GET);
    encode_u32_leb128(out, target_ptr_local);
    out.push(I32_LOAD);
    encode_mem_arg(out, 2, 8);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, target_payload_ptr_local);

    emit_match_arms(
        &match_expr.arms,
        0,
        match_expr.default.as_deref(),
        target_tag_ptr_local,
        target_payload_ptr_local,
        out,
        env,
        next_local_idx,
        ctx,
    )
}

pub(crate) fn emit_string_eq(
    ptr_a_local: u32,
    ptr_b_local: u32,
    out: &mut Vec<u8>,
    next_local_idx: &mut u32,
) {
    let result_local = *next_local_idx;
    *next_local_idx += 1;
    let idx_local = *next_local_idx;
    *next_local_idx += 1;
    let len_local = *next_local_idx;
    *next_local_idx += 1;

    // Fast path: ptr_a == ptr_b
    out.push(LOCAL_GET);
    encode_u32_leb128(out, ptr_a_local);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, ptr_b_local);
    out.push(I32_EQ);
    out.push(IF);
    out.push(BLOCK_TYPE_I32);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 1);
    out.push(ELSE);

    // Check lengths
    out.push(LOCAL_GET);
    encode_u32_leb128(out, ptr_a_local);
    out.push(I32_LOAD);
    encode_mem_arg(out, 2, 4); // len_a
    out.push(LOCAL_TEE);
    encode_u32_leb128(out, len_local);

    out.push(LOCAL_GET);
    encode_u32_leb128(out, ptr_b_local);
    out.push(I32_LOAD);
    encode_mem_arg(out, 2, 4); // len_b

    out.push(I32_NE);
    out.push(IF);
    out.push(BLOCK_TYPE_I32);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 0);
    out.push(ELSE);

    // Loop over bytes
    out.push(I32_CONST);
    encode_i32_sleb128(out, 1);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, result_local);

    out.push(I32_CONST);
    encode_i32_sleb128(out, 0);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, idx_local);

    out.push(BLOCK);
    out.push(BLOCK_TYPE_EMPTY);
    out.push(LOOP);
    out.push(BLOCK_TYPE_EMPTY);

    // if idx == len, break out of block
    out.push(LOCAL_GET);
    encode_u32_leb128(out, idx_local);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, len_local);
    out.push(I32_EQ);
    out.push(BR_IF);
    out.push(1);

    // compare bytes
    out.push(LOCAL_GET);
    encode_u32_leb128(out, ptr_a_local);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, idx_local);
    out.push(I32_ADD);
    out.push(I32_LOAD8_U);
    encode_mem_arg(out, 0, 8);

    out.push(LOCAL_GET);
    encode_u32_leb128(out, ptr_b_local);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, idx_local);
    out.push(I32_ADD);
    out.push(I32_LOAD8_U);
    encode_mem_arg(out, 0, 8);

    out.push(I32_NE);
    out.push(IF);
    out.push(BLOCK_TYPE_EMPTY);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 0);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, result_local);
    out.push(BR);
    out.push(2); // break out of BLOCK
    out.push(END);

    // idx += 1
    out.push(LOCAL_GET);
    encode_u32_leb128(out, idx_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 1);
    out.push(I32_ADD);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, idx_local);

    out.push(BR);
    out.push(0);

    out.push(END); // loop
    out.push(END); // block

    out.push(LOCAL_GET);
    encode_u32_leb128(out, result_local);

    out.push(END); // else lengths
    out.push(END); // else fast path
}

fn emit_match_arms(
    arms: &[MatchArm],
    idx: usize,
    default: Option<&Expression>,
    target_tag_ptr_local: u32,
    target_payload_ptr_local: u32,
    out: &mut Vec<u8>,
    env: &HashMap<i64, u32>,
    next_local_idx: &mut u32,
    ctx: &mut CompileContext,
) -> Result<(), String> {
    if idx < arms.len() {
        let arm = &arms[idx];
        let arm_tag_ptr = ctx.alloc_static_string(&arm.tag);
        let arm_tag_ptr_local = *next_local_idx;
        *next_local_idx += 1;

        out.push(I32_CONST);
        encode_i32_sleb128(out, arm_tag_ptr as i32);
        out.push(LOCAL_SET);
        encode_u32_leb128(out, arm_tag_ptr_local);

        emit_string_eq(target_tag_ptr_local, arm_tag_ptr_local, out, next_local_idx);

        out.push(IF);
        out.push(BLOCK_TYPE_I32);

        let mut arm_env = env.clone();
        if let Some(var_id) = arm.variable_id {
            let var_local = *next_local_idx;
            *next_local_idx += 1;
            out.push(LOCAL_GET);
            encode_u32_leb128(out, target_payload_ptr_local);
            out.push(LOCAL_SET);
            encode_u32_leb128(out, var_local);
            arm_env.insert(var_id, var_local);
        }

        emit_expression(&arm.body, out, &arm_env, next_local_idx, ctx)?;

        out.push(ELSE);

        emit_match_arms(
            arms,
            idx + 1,
            default,
            target_tag_ptr_local,
            target_payload_ptr_local,
            out,
            env,
            next_local_idx,
            ctx,
        )?;

        out.push(END);
    } else {
        if let Some(default_expr) = default {
            emit_expression(default_expr, out, env, next_local_idx, ctx)?;
        } else {
            out.push(I32_CONST);
            encode_i32_sleb128(out, 0);
        }
    }
    Ok(())
}

use std::collections::HashMap;

use definy_event::event::*;

use super::{
    bytecode::*,
    compiler::{CompileContext, count_locals, emit_expression, encode_mem_arg},
};

#[derive(Clone)]
pub(crate) struct PendingFunction {
    pub(crate) captured_vars: Vec<i64>,
    pub(crate) parameter_id: i64,
    pub(crate) body: Expression,
}

pub(crate) fn collect_free_variables(
    expr: &Expression,
    bound: &mut std::collections::HashSet<i64>,
    free: &mut std::collections::HashSet<i64>,
) {
    match expr {
        Expression::Variable(v) => {
            if !bound.contains(&v.variable_id) {
                free.insert(v.variable_id);
            }
        }
        Expression::Let(LetExpression {
            variable_id,
            value,
            body,
            ..
        }) => {
            collect_free_variables(value, bound, free);
            let inserted = bound.insert(*variable_id);
            collect_free_variables(body, bound, free);
            if inserted {
                bound.remove(variable_id);
            }
        }
        Expression::Function(FunctionExpression {
            parameter_id, body, ..
        }) => {
            let inserted = bound.insert(*parameter_id);
            collect_free_variables(body, bound, free);
            if inserted {
                bound.remove(parameter_id);
            }
        }
        Expression::Call(CallExpression { function, argument }) => {
            collect_free_variables(function, bound, free);
            collect_free_variables(argument, bound, free);
        }
        Expression::Add(a) => {
            collect_free_variables(&a.left, bound, free);
            collect_free_variables(&a.right, bound, free);
        }
        Expression::Subtract(s) => {
            collect_free_variables(&s.left, bound, free);
            collect_free_variables(&s.right, bound, free);
        }
        Expression::Multiply(m) => {
            collect_free_variables(&m.left, bound, free);
            collect_free_variables(&m.right, bound, free);
        }
        Expression::Divide(d) => {
            collect_free_variables(&d.left, bound, free);
            collect_free_variables(&d.right, bound, free);
        }
        Expression::Remainder(r) => {
            collect_free_variables(&r.left, bound, free);
            collect_free_variables(&r.right, bound, free);
        }
        Expression::LessThan(lt) => {
            collect_free_variables(&lt.left, bound, free);
            collect_free_variables(&lt.right, bound, free);
        }
        Expression::LessThanOrEqual(le) => {
            collect_free_variables(&le.left, bound, free);
            collect_free_variables(&le.right, bound, free);
        }
        Expression::GreaterThan(gt) => {
            collect_free_variables(&gt.left, bound, free);
            collect_free_variables(&gt.right, bound, free);
        }
        Expression::GreaterThanOrEqual(ge) => {
            collect_free_variables(&ge.left, bound, free);
            collect_free_variables(&ge.right, bound, free);
        }
        Expression::Equal(eq) => {
            collect_free_variables(&eq.left, bound, free);
            collect_free_variables(&eq.right, bound, free);
        }
        Expression::NotEqual(ne) => {
            collect_free_variables(&ne.left, bound, free);
            collect_free_variables(&ne.right, bound, free);
        }
        Expression::Not(n) => {
            collect_free_variables(&n.value, bound, free);
        }
        Expression::And(a) => {
            collect_free_variables(&a.left, bound, free);
            collect_free_variables(&a.right, bound, free);
        }
        Expression::Or(o) => {
            collect_free_variables(&o.left, bound, free);
            collect_free_variables(&o.right, bound, free);
        }
        Expression::StringConcat(sc) => {
            collect_free_variables(&sc.left, bound, free);
            collect_free_variables(&sc.right, bound, free);
        }
        Expression::StringLength(sl) => {
            collect_free_variables(&sl.value, bound, free);
        }
        Expression::StringSlice(ss) => {
            collect_free_variables(&ss.value, bound, free);
            collect_free_variables(&ss.start, bound, free);
            collect_free_variables(&ss.end, bound, free);
        }
        Expression::ListLength(ll) => {
            collect_free_variables(&ll.value, bound, free);
        }
        Expression::ListConcat(lc) => {
            collect_free_variables(&lc.left, bound, free);
            collect_free_variables(&lc.right, bound, free);
        }
        Expression::ListGet(lg) => {
            collect_free_variables(&lg.list, bound, free);
            collect_free_variables(&lg.index, bound, free);
        }
        Expression::ListAppend(la) => {
            collect_free_variables(&la.list, bound, free);
            collect_free_variables(&la.item, bound, free);
        }
        Expression::If(i) => {
            collect_free_variables(&i.condition, bound, free);
            collect_free_variables(&i.then_expr, bound, free);
            collect_free_variables(&i.else_expr, bound, free);
        }
        Expression::ListLiteral(ll) => {
            for item in &ll.items {
                collect_free_variables(item, bound, free);
            }
        }
        Expression::TypeLiteral(tl) => {
            for item in &tl.items {
                collect_free_variables(&item.value, bound, free);
            }
        }
        Expression::Constructor(c) => {
            collect_free_variables(&c.value, bound, free);
        }
        _ => {}
    }
}

pub(crate) fn emit_function(
    f: &FunctionExpression,
    out: &mut Vec<u8>,
    env: &HashMap<i64, u32>,
    next_local_idx: &mut u32,
    ctx: &mut CompileContext,
) -> Result<(), String> {
    let mut bound = std::collections::HashSet::new();
    let mut free = std::collections::HashSet::new();
    collect_free_variables(&f.body, &mut bound, &mut free);
    free.remove(&f.parameter_id);

    // Capture only variables that are in current env
    let mut captured: Vec<i64> = free
        .into_iter()
        .filter(|var| env.contains_key(var))
        .collect();
    captured.sort_unstable();

    let table_idx = ctx.pending_functions.len() as u32;
    ctx.pending_functions.push(PendingFunction {
        captured_vars: captured.clone(),
        parameter_id: f.parameter_id,
        body: (*f.body).clone(),
    });

    // Allocate env on heap if captured.len() > 0
    let env_ptr_local = *next_local_idx;
    *next_local_idx += 1;
    if !captured.is_empty() {
        out.push(GLOBAL_GET);
        out.push(0);
        out.push(LOCAL_SET);
        encode_u32_leb128(out, env_ptr_local);

        let env_size = ((captured.len() * 4 + 7) / 8) * 8;
        out.push(GLOBAL_GET);
        out.push(0);
        out.push(I32_CONST);
        encode_i32_sleb128(out, env_size as i32);
        out.push(I32_ADD);
        out.push(GLOBAL_SET);
        out.push(0);

        for (i, var_id) in captured.iter().enumerate() {
            let local_idx = env[var_id];
            out.push(LOCAL_GET);
            encode_u32_leb128(out, env_ptr_local);
            out.push(LOCAL_GET);
            encode_u32_leb128(out, local_idx);
            out.push(I32_STORE);
            encode_mem_arg(out, 2, (i * 4) as u32);
        }
    } else {
        out.push(I32_CONST);
        encode_i32_sleb128(out, 0);
        out.push(LOCAL_SET);
        encode_u32_leb128(out, env_ptr_local);
    }

    // Allocate closure on heap: Tag 5 (u8), table_idx (u32 at +4), env_ptr (u32 at +8)
    let closure_ptr_local = *next_local_idx;
    *next_local_idx += 1;

    out.push(GLOBAL_GET);
    out.push(0);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, closure_ptr_local);

    out.push(GLOBAL_GET);
    out.push(0);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 16);
    out.push(I32_ADD);
    out.push(GLOBAL_SET);
    out.push(0);

    // Store Tag 5
    out.push(LOCAL_GET);
    encode_u32_leb128(out, closure_ptr_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 5);
    out.push(I32_STORE8);
    encode_mem_arg(out, 0, 0);

    // Store table_idx at +4
    out.push(LOCAL_GET);
    encode_u32_leb128(out, closure_ptr_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, table_idx as i32);
    out.push(I32_STORE);
    encode_mem_arg(out, 2, 4);

    // Store env_ptr at +8
    out.push(LOCAL_GET);
    encode_u32_leb128(out, closure_ptr_local);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, env_ptr_local);
    out.push(I32_STORE);
    encode_mem_arg(out, 2, 8);

    // Return closure_ptr
    out.push(LOCAL_GET);
    encode_u32_leb128(out, closure_ptr_local);

    Ok(())
}

pub(crate) fn emit_call(
    c: &CallExpression,
    out: &mut Vec<u8>,
    env: &HashMap<i64, u32>,
    next_local_idx: &mut u32,
    ctx: &mut CompileContext,
) -> Result<(), String> {
    emit_expression(&c.function, out, env, next_local_idx, ctx)?;
    let closure_ptr_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(LOCAL_SET);
    encode_u32_leb128(out, closure_ptr_local);

    emit_expression(&c.argument, out, env, next_local_idx, ctx)?;
    let arg_ptr_local = *next_local_idx;
    *next_local_idx += 1;
    out.push(LOCAL_SET);
    encode_u32_leb128(out, arg_ptr_local);

    // Stack for call_indirect:
    // 1. env_ptr (param 0)
    out.push(LOCAL_GET);
    encode_u32_leb128(out, closure_ptr_local);
    out.push(I32_LOAD);
    encode_mem_arg(out, 2, 8);

    // 2. arg_ptr (param 1)
    out.push(LOCAL_GET);
    encode_u32_leb128(out, arg_ptr_local);

    // 3. table_idx (target func index in table)
    out.push(LOCAL_GET);
    encode_u32_leb128(out, closure_ptr_local);
    out.push(I32_LOAD);
    encode_mem_arg(out, 2, 4);

    // call_indirect (type 1: (i32, i32) -> i32, table 0)
    out.push(CALL_INDIRECT);
    encode_u32_leb128(out, 1);
    encode_u32_leb128(out, 0);

    Ok(())
}

pub(crate) fn compile_pending_function(
    pending: &PendingFunction,
    ctx: &mut CompileContext,
) -> Result<Vec<u8>, String> {
    // Function type 1: (param i32 i32) (result i32)
    // Param 0 = env_ptr, Param 1 = arg_ptr
    let mut func_code = Vec::new();
    let mut f_env = HashMap::new();
    f_env.insert(pending.parameter_id, 1); // arg_ptr is local 1

    let mut f_local_idx = 3; // local 0,1 are params, local 2 is i64 scratch
    for (i, var_id) in pending.captured_vars.iter().enumerate() {
        let var_local = f_local_idx;
        f_local_idx += 1;
        f_env.insert(*var_id, var_local);

        func_code.push(LOCAL_GET);
        encode_u32_leb128(&mut func_code, 0); // env_ptr
        func_code.push(I32_LOAD);
        encode_mem_arg(&mut func_code, 2, (i * 4) as u32);
        func_code.push(LOCAL_SET);
        encode_u32_leb128(&mut func_code, var_local);
    }

    emit_expression(&pending.body, &mut func_code, &f_env, &mut f_local_idx, ctx)?;
    func_code.push(END);

    let locals_count = count_locals(&pending.body) + f_local_idx + 64;
    let mut func_body = Vec::new();
    func_body.push(2); // 2 local declaration groups
    encode_u32_leb128(&mut func_body, 1);
    func_body.push(I64); // local 2: i64 scratch
    encode_u32_leb128(&mut func_body, locals_count);
    func_body.push(I32); // locals 3..: i32
    func_body.extend_from_slice(&func_code);

    Ok(func_body)
}

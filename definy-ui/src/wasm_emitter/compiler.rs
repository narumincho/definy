use std::collections::HashMap;

use definy_event::event::*;

use super::bytecode::*;

pub(crate) struct CompileContext<'a> {
    events: &'a [crate::app_state::EventWithHash],
    static_data: Vec<u8>,
    current_static_offset: u32,
    visited_parts: Vec<definy_event::EventHashId>,
}

impl<'a> CompileContext<'a> {
    fn new(events: &'a [crate::app_state::EventWithHash]) -> Self {
        Self {
            events,
            static_data: Vec::new(),
            current_static_offset: 1024,
            visited_parts: Vec::new(),
        }
    }

    fn alloc_static_bytes(&mut self, bytes: &[u8]) -> u32 {
        let offset = self.current_static_offset;
        self.static_data.extend_from_slice(bytes);
        self.current_static_offset += bytes.len() as u32;
        // Align to 8 bytes
        while self.current_static_offset % 8 != 0 {
            self.static_data.push(0);
            self.current_static_offset += 1;
        }
        offset
    }

    pub(crate) fn alloc_static_string(&mut self, s: &str) -> u32 {
        let mut buf = Vec::new();
        buf.push(2); // Tag 2: String
        buf.extend_from_slice(&[0, 0, 0]); // 3 bytes padding
        buf.extend_from_slice(&(s.len() as u32).to_le_bytes()); // len
        buf.extend_from_slice(s.as_bytes()); // bytes
        self.alloc_static_bytes(&buf)
    }

    pub(crate) fn alloc_static_number(&mut self, n: i64) -> u32 {
        let mut buf = Vec::new();
        buf.push(0); // Tag 0: Number
        buf.extend_from_slice(&[0; 7]); // 7 bytes padding
        buf.extend_from_slice(&n.to_le_bytes()); // 8 bytes i64
        self.alloc_static_bytes(&buf)
    }

    pub(crate) fn alloc_static_bool(&mut self, b: bool) -> u32 {
        let mut buf = Vec::new();
        buf.push(1); // Tag 1: Bool
        buf.extend_from_slice(&[0; 7]); // 7 bytes padding
        buf.push(if b { 1 } else { 0 }); // 1 byte value
        self.alloc_static_bytes(&buf)
    }
}

pub fn compile_expression_to_wasm(
    expression: &Expression,
    events: &[crate::app_state::EventWithHash],
) -> Result<Vec<u8>, String> {
    let mut ctx = CompileContext::new(events);
    let mut code_bytes = Vec::new();
    // Local 0 is reserved as an i64 scratch local for number arithmetic.
    // Locals starting at index 1 are i32 (used for pointers, temps, variables).
    let mut next_local_idx = 1;
    let env = HashMap::new();

    emit_expression(
        expression,
        &mut code_bytes,
        &env,
        &mut next_local_idx,
        &mut ctx,
    )?;

    // Append function end
    code_bytes.push(END);

    // Assemble full Wasm binary module
    let mut module = Vec::new();
    module.extend_from_slice(&WASM_MAGIC);
    module.extend_from_slice(&WASM_VERSION);

    // 1. Type Section:
    // Type 0: () -> i32 (returns pointer to Value in memory)
    let type_section = vec![1, 0x60, 0, 1, I32];
    emit_section(&mut module, TYPE_SECTION, &type_section);

    // 2. Function Section: 1 function of type 0
    let function_section = vec![1, 0];
    emit_section(&mut module, FUNCTION_SECTION, &function_section);

    // 3. Memory Section: 1 memory, min 2 pages (128KB)
    let memory_section = vec![1, 0x00, 2];
    emit_section(&mut module, MEMORY_SECTION, &memory_section);

    // 4. Global Section:
    // Global 0: mut i32 = HEAP_START_OFFSET (bump heap pointer)
    let mut global_section = Vec::new();
    global_section.push(1); // 1 global
    global_section.push(I32); // type i32
    global_section.push(1); // mutability: 1 (mutable)
    global_section.push(I32_CONST);
    encode_i32_sleb128(&mut global_section, HEAP_START_OFFSET as i32);
    global_section.push(END);
    emit_section(&mut module, GLOBAL_SECTION, &global_section);

    // 5. Export Section:
    // Export "evaluate" (function 0)
    // Export "memory" (memory 0)
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

    // 6. Code Section:
    let mut code_section = Vec::new();
    code_section.push(1); // 1 function body

    let mut func_body = Vec::new();
    let locals_count = count_locals(expression) + 64; // allocate ample i32 locals for temps & variables
    func_body.push(2); // 2 local declaration groups
    encode_u32_leb128(&mut func_body, 1);
    func_body.push(I64); // local 0 is i64 (temp for number arithmetic)
    encode_u32_leb128(&mut func_body, locals_count);
    func_body.push(I32); // locals 1 .. 1 + locals_count are i32 (pointers / temp values)

    func_body.extend_from_slice(&code_bytes);

    encode_u32_leb128(&mut code_section, func_body.len() as u32);
    code_section.extend_from_slice(&func_body);

    emit_section(&mut module, CODE_SECTION, &code_section);

    // 7. Data Section:
    if !ctx.static_data.is_empty() {
        let mut data_section = Vec::new();
        data_section.push(1); // 1 segment
        data_section.push(0); // memory 0
        data_section.push(I32_CONST);
        encode_i32_sleb128(&mut data_section, 1024);
        data_section.push(END);
        encode_u32_leb128(&mut data_section, ctx.static_data.len() as u32);
        data_section.extend_from_slice(&ctx.static_data);
        emit_section(&mut module, DATA_SECTION, &data_section);
    }

    Ok(module)
}

pub(crate) fn emit_expression(
    expression: &Expression,
    out: &mut Vec<u8>,
    env: &HashMap<i64, u32>,
    next_local_idx: &mut u32,
    ctx: &mut CompileContext,
) -> Result<(), String> {
    match expression {
        Expression::Number(NumberExpression { value }) => {
            let ptr = ctx.alloc_static_number(*value);
            out.push(I32_CONST);
            encode_i32_sleb128(out, ptr as i32);
        }
        Expression::Boolean(BooleanExpression { value }) => {
            let ptr = ctx.alloc_static_bool(*value);
            out.push(I32_CONST);
            encode_i32_sleb128(out, ptr as i32);
        }
        Expression::String(StringExpression { value }) => {
            let ptr = ctx.alloc_static_string(value);
            out.push(I32_CONST);
            encode_i32_sleb128(out, ptr as i32);
        }
        Expression::ListLiteral(ListLiteralExpression { items }) => {
            // Allocate list in heap at runtime
            let count = items.len() as u32;
            let list_ptr_local = *next_local_idx;
            *next_local_idx += 1;

            // Get heap ptr
            out.push(GLOBAL_GET);
            out.push(0);
            out.push(LOCAL_SET);
            encode_u32_leb128(out, list_ptr_local);

            // Store tag 3 at list_ptr
            out.push(LOCAL_GET);
            encode_u32_leb128(out, list_ptr_local);
            out.push(I32_CONST);
            encode_i32_sleb128(out, 3);
            out.push(I32_STORE8);
            encode_mem_arg(out, 0, 0);

            // Store length at list_ptr + 4
            out.push(LOCAL_GET);
            encode_u32_leb128(out, list_ptr_local);
            out.push(I32_CONST);
            encode_i32_sleb128(out, count as i32);
            out.push(I32_STORE);
            encode_mem_arg(out, 2, 4);

            // Update heap ptr: list_ptr + 8 + count * 4 (aligned to 8)
            let total_size = ((8 + count * 4 + 7) / 8) * 8;
            out.push(GLOBAL_GET);
            out.push(0);
            out.push(I32_CONST);
            encode_i32_sleb128(out, total_size as i32);
            out.push(I32_ADD);
            out.push(GLOBAL_SET);
            out.push(0);

            // Emit items and store their pointers
            for (idx, item) in items.iter().enumerate() {
                emit_expression(item, out, env, next_local_idx, ctx)?;
                let elem_ptr_local = *next_local_idx;
                *next_local_idx += 1;
                out.push(LOCAL_SET);
                encode_u32_leb128(out, elem_ptr_local);

                out.push(LOCAL_GET);
                encode_u32_leb128(out, list_ptr_local);
                out.push(LOCAL_GET);
                encode_u32_leb128(out, elem_ptr_local);
                out.push(I32_STORE);
                encode_mem_arg(out, 2, 8 + (idx as u32) * 4);
            }

            out.push(LOCAL_GET);
            encode_u32_leb128(out, list_ptr_local);
        }
        Expression::TypeLiteral(TypeLiteralExpression { items }) => {
            // Allocate record in heap
            let count = items.len() as u32;
            let record_ptr_local = *next_local_idx;
            *next_local_idx += 1;

            out.push(GLOBAL_GET);
            out.push(0);
            out.push(LOCAL_SET);
            encode_u32_leb128(out, record_ptr_local);

            // Store tag 4
            out.push(LOCAL_GET);
            encode_u32_leb128(out, record_ptr_local);
            out.push(I32_CONST);
            encode_i32_sleb128(out, 4);
            out.push(I32_STORE8);
            encode_mem_arg(out, 0, 0);

            // Store count at record_ptr + 4
            out.push(LOCAL_GET);
            encode_u32_leb128(out, record_ptr_local);
            out.push(I32_CONST);
            encode_i32_sleb128(out, count as i32);
            out.push(I32_STORE);
            encode_mem_arg(out, 2, 4);

            let total_size = ((8 + count * 8 + 7) / 8) * 8;
            out.push(GLOBAL_GET);
            out.push(0);
            out.push(I32_CONST);
            encode_i32_sleb128(out, total_size as i32);
            out.push(I32_ADD);
            out.push(GLOBAL_SET);
            out.push(0);

            for (idx, item) in items.iter().enumerate() {
                let key_ptr = ctx.alloc_static_string(&item.key);
                emit_expression(&item.value, out, env, next_local_idx, ctx)?;
                let val_ptr_local = *next_local_idx;
                *next_local_idx += 1;
                out.push(LOCAL_SET);
                encode_u32_leb128(out, val_ptr_local);

                // Store key ptr at record_ptr + 8 + idx * 8
                out.push(LOCAL_GET);
                encode_u32_leb128(out, record_ptr_local);
                out.push(I32_CONST);
                encode_i32_sleb128(out, key_ptr as i32);
                out.push(I32_STORE);
                encode_mem_arg(out, 2, 8 + (idx as u32) * 8);

                // Store val ptr at record_ptr + 12 + idx * 8
                out.push(LOCAL_GET);
                encode_u32_leb128(out, record_ptr_local);
                out.push(LOCAL_GET);
                encode_u32_leb128(out, val_ptr_local);
                out.push(I32_STORE);
                encode_mem_arg(out, 2, 12 + (idx as u32) * 8);
            }

            out.push(LOCAL_GET);
            encode_u32_leb128(out, record_ptr_local);
        }
        Expression::Constructor(ConstructorExpression { value, .. }) => {
            emit_expression(value, out, env, next_local_idx, ctx)?;
        }
        Expression::Add(AddExpression { left, right }) => {
            emit_binary_arithmetic(
                left,
                right,
                I64_ADD,
                out,
                env,
                next_local_idx,
                ctx,
                "overflow in addition",
            )?;
        }
        Expression::Subtract(SubtractExpression { left, right }) => {
            emit_binary_arithmetic(
                left,
                right,
                I64_SUB,
                out,
                env,
                next_local_idx,
                ctx,
                "overflow in subtraction",
            )?;
        }
        Expression::Multiply(MultiplyExpression { left, right }) => {
            emit_binary_arithmetic(
                left,
                right,
                I64_MUL,
                out,
                env,
                next_local_idx,
                ctx,
                "overflow in multiplication",
            )?;
        }
        Expression::Divide(DivideExpression { left, right }) => {
            emit_binary_arithmetic(
                left,
                right,
                I64_DIV_S,
                out,
                env,
                next_local_idx,
                ctx,
                "division by zero",
            )?;
        }
        Expression::Remainder(RemainderExpression { left, right }) => {
            emit_binary_arithmetic(
                left,
                right,
                I64_REM_S,
                out,
                env,
                next_local_idx,
                ctx,
                "remainder by zero",
            )?;
        }
        Expression::Equal(EqualExpression { left, right }) => {
            emit_binary_comparison(left, right, I64_EQ, out, env, next_local_idx, ctx)?;
        }
        Expression::NotEqual(NotEqualExpression { left, right }) => {
            emit_binary_comparison(left, right, I64_NE, out, env, next_local_idx, ctx)?;
        }
        Expression::LessThan(LessThanExpression { left, right }) => {
            emit_binary_comparison(left, right, I64_LT_S, out, env, next_local_idx, ctx)?;
        }
        Expression::LessThanOrEqual(LessThanOrEqualExpression { left, right }) => {
            emit_binary_comparison(left, right, I64_LE_S, out, env, next_local_idx, ctx)?;
        }
        Expression::GreaterThan(GreaterThanExpression { left, right }) => {
            emit_binary_comparison(left, right, I64_GT_S, out, env, next_local_idx, ctx)?;
        }
        Expression::GreaterThanOrEqual(GreaterThanOrEqualExpression { left, right }) => {
            emit_binary_comparison(left, right, I64_GE_S, out, env, next_local_idx, ctx)?;
        }
        Expression::Not(NotExpression { value }) => {
            emit_expression(value, out, env, next_local_idx, ctx)?;
            // Load boolean byte from ptr + 8
            out.push(I32_LOAD8_U);
            encode_mem_arg(out, 0, 8);
            out.push(I32_EQZ);
            emit_alloc_bool_from_stack(out, next_local_idx);
        }
        Expression::And(AndExpression { left, right }) => {
            emit_expression(left, out, env, next_local_idx, ctx)?;
            out.push(I32_LOAD8_U);
            encode_mem_arg(out, 0, 8);
            out.push(IF);
            out.push(BLOCK_TYPE_I32);
            emit_expression(right, out, env, next_local_idx, ctx)?;
            out.push(ELSE);
            let false_ptr = ctx.alloc_static_bool(false);
            out.push(I32_CONST);
            encode_i32_sleb128(out, false_ptr as i32);
            out.push(END);
        }
        Expression::Or(OrExpression { left, right }) => {
            emit_expression(left, out, env, next_local_idx, ctx)?;
            let left_local = *next_local_idx;
            *next_local_idx += 1;
            out.push(LOCAL_TEE);
            encode_u32_leb128(out, left_local);
            out.push(I32_LOAD8_U);
            encode_mem_arg(out, 0, 8);
            out.push(IF);
            out.push(BLOCK_TYPE_I32);
            out.push(LOCAL_GET);
            encode_u32_leb128(out, left_local);
            out.push(ELSE);
            emit_expression(right, out, env, next_local_idx, ctx)?;
            out.push(END);
        }
        Expression::StringLength(StringLengthExpression { value }) => {
            super::string_ops::emit_string_length(value, out, env, next_local_idx, ctx)?;
        }
        Expression::StringConcat(StringConcatExpression { left, right }) => {
            super::string_ops::emit_string_concat(left, right, out, env, next_local_idx, ctx)?;
        }
        Expression::StringSlice(StringSliceExpression { value, start, end }) => {
            super::string_ops::emit_string_slice(value, start, end, out, env, next_local_idx, ctx)?;
        }
        Expression::ListLength(ListLengthExpression { value }) => {
            super::list_ops::emit_list_length(value, out, env, next_local_idx, ctx)?;
        }
        Expression::ListConcat(ListConcatExpression { left, right }) => {
            super::list_ops::emit_list_concat(left, right, out, env, next_local_idx, ctx)?;
        }
        Expression::ListGet(ListGetExpression { list, index }) => {
            super::list_ops::emit_list_get(list, index, out, env, next_local_idx, ctx)?;
        }
        Expression::ListAppend(ListAppendExpression { list, item }) => {
            super::list_ops::emit_list_append(list, item, out, env, next_local_idx, ctx)?;
        }
        Expression::If(IfExpression {
            condition,
            then_expr,
            else_expr,
        }) => {
            emit_expression(condition, out, env, next_local_idx, ctx)?;
            // Load bool from cond_ptr + 8
            out.push(I32_LOAD8_U);
            encode_mem_arg(out, 0, 8);

            out.push(IF);
            out.push(BLOCK_TYPE_I32);

            emit_expression(then_expr, out, env, next_local_idx, ctx)?;

            out.push(ELSE);

            emit_expression(else_expr, out, env, next_local_idx, ctx)?;

            out.push(END);
        }
        Expression::Let(LetExpression {
            variable_id,
            value,
            body,
            ..
        }) => {
            emit_expression(value, out, env, next_local_idx, ctx)?;
            let current_idx = *next_local_idx;
            *next_local_idx += 1;

            out.push(LOCAL_SET);
            encode_u32_leb128(out, current_idx);

            let mut new_env = env.clone();
            new_env.insert(*variable_id, current_idx);

            emit_expression(body, out, &new_env, next_local_idx, ctx)?;
        }
        Expression::Variable(VariableExpression { variable_id }) => {
            let idx = env
                .get(variable_id)
                .ok_or_else(|| format!("Variable not found: {}", variable_id))?;
            out.push(LOCAL_GET);
            encode_u32_leb128(out, *idx);
        }
        Expression::PartReference(PartReferenceExpression {
            part_definition_event_hash,
        }) => {
            if ctx.visited_parts.contains(part_definition_event_hash) {
                return Err(
                    "Circular reference detected while compiling PartReference to Wasm".into(),
                );
            }
            if ctx.visited_parts.len() > 100 {
                return Err("Maximum part reference recursion depth exceeded".into());
            }

            let mut latest_expression = None;
            for (event_hash, event_result) in ctx.events.iter().rev() {
                if let Ok((_, event)) = event_result {
                    match &event.content {
                        definy_event::event::EventContent::PartDefinition(part_definition)
                            if part_definition_event_hash == event_hash =>
                        {
                            latest_expression = part_definition.expression.as_ref();
                            break;
                        }
                        definy_event::event::EventContent::PartUpdate(part_update)
                            if part_update.part_definition_event_hash
                                == *part_definition_event_hash =>
                        {
                            latest_expression = part_update.expression.as_ref();
                            break;
                        }
                        _ => {}
                    }
                }
            }

            if let Some(target_expr) = latest_expression {
                ctx.visited_parts.push(part_definition_event_hash.clone());
                let empty_env = HashMap::new();
                let res = emit_expression(target_expr, out, &empty_env, next_local_idx, ctx);
                ctx.visited_parts.pop();
                res?;
            } else {
                return Err(format!(
                    "Part not found or has no expression: {}",
                    part_definition_event_hash
                ));
            }
        }
        Expression::TypeNumber
        | Expression::TypeString
        | Expression::TypeBoolean
        | Expression::TypeList(_) => {
            return Err("Type expressions cannot be evaluated at runtime".into());
        }
        Expression::Compiler(_) => {
            return Err("Compiler built-in cannot be evaluated directly as value".into());
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
    ctx: &mut CompileContext,
    _err_msg: &str,
) -> Result<(), String> {
    emit_expression(left, out, env, next_local_idx, ctx)?;
    out.push(I64_LOAD);
    encode_mem_arg(out, 3, 8); // load i64 at offset 8

    emit_expression(right, out, env, next_local_idx, ctx)?;
    out.push(I64_LOAD);
    encode_mem_arg(out, 3, 8); // load i64 at offset 8

    out.push(opcode); // execute opcode (add, sub, mul, div_s, rem_s)

    emit_alloc_number_from_stack(out, next_local_idx);
    Ok(())
}

fn emit_binary_comparison(
    left: &Expression,
    right: &Expression,
    opcode: u8,
    out: &mut Vec<u8>,
    env: &HashMap<i64, u32>,
    next_local_idx: &mut u32,
    ctx: &mut CompileContext,
) -> Result<(), String> {
    emit_expression(left, out, env, next_local_idx, ctx)?;
    out.push(I64_LOAD);
    encode_mem_arg(out, 3, 8);

    emit_expression(right, out, env, next_local_idx, ctx)?;
    out.push(I64_LOAD);
    encode_mem_arg(out, 3, 8);

    out.push(opcode); // comparison returns i32

    emit_alloc_bool_from_stack(out, next_local_idx);
    Ok(())
}

pub(crate) fn emit_alloc_number_from_stack(out: &mut Vec<u8>, next_local_idx: &mut u32) {
    const TEMP_I64_LOCAL: u32 = 0;

    out.push(LOCAL_SET);
    encode_u32_leb128(out, TEMP_I64_LOCAL);

    let res_ptr_local = *next_local_idx;
    *next_local_idx += 1;

    out.push(GLOBAL_GET);
    out.push(0);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, res_ptr_local);

    // Bump global heap by 16
    out.push(GLOBAL_GET);
    out.push(0);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 16);
    out.push(I32_ADD);
    out.push(GLOBAL_SET);
    out.push(0);

    // Store tag 0
    out.push(LOCAL_GET);
    encode_u32_leb128(out, res_ptr_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 0);
    out.push(I32_STORE8);
    encode_mem_arg(out, 0, 0);

    // Store i64 value at res_ptr + 8
    out.push(LOCAL_GET);
    encode_u32_leb128(out, res_ptr_local);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, TEMP_I64_LOCAL);
    out.push(I64_STORE);
    encode_mem_arg(out, 3, 8);

    out.push(LOCAL_GET);
    encode_u32_leb128(out, res_ptr_local);
}

fn emit_alloc_bool_from_stack(out: &mut Vec<u8>, next_local_idx: &mut u32) {
    let bool_local = *next_local_idx;
    *next_local_idx += 1;
    let res_ptr_local = *next_local_idx;
    *next_local_idx += 1;

    out.push(LOCAL_SET);
    encode_u32_leb128(out, bool_local);

    out.push(GLOBAL_GET);
    out.push(0);
    out.push(LOCAL_SET);
    encode_u32_leb128(out, res_ptr_local);

    out.push(GLOBAL_GET);
    out.push(0);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 16);
    out.push(I32_ADD);
    out.push(GLOBAL_SET);
    out.push(0);

    // Store tag 1
    out.push(LOCAL_GET);
    encode_u32_leb128(out, res_ptr_local);
    out.push(I32_CONST);
    encode_i32_sleb128(out, 1);
    out.push(I32_STORE8);
    encode_mem_arg(out, 0, 0);

    // Store bool byte at res_ptr + 8
    out.push(LOCAL_GET);
    encode_u32_leb128(out, res_ptr_local);
    out.push(LOCAL_GET);
    encode_u32_leb128(out, bool_local);
    out.push(I32_STORE8);
    encode_mem_arg(out, 0, 8);

    out.push(LOCAL_GET);
    encode_u32_leb128(out, res_ptr_local);
}

fn encode_mem_arg(out: &mut Vec<u8>, align: u32, offset: u32) {
    encode_u32_leb128(out, align);
    encode_u32_leb128(out, offset);
}

fn count_locals(expr: &Expression) -> u32 {
    match expr {
        Expression::Let(LetExpression { value, body, .. }) => {
            8 + count_locals(value) + count_locals(body)
        }
        Expression::Add(a) => 4 + count_locals(&a.left) + count_locals(&a.right),
        Expression::Subtract(s) => 4 + count_locals(&s.left) + count_locals(&s.right),
        Expression::Multiply(m) => 4 + count_locals(&m.left) + count_locals(&m.right),
        Expression::Divide(d) => 4 + count_locals(&d.left) + count_locals(&d.right),
        Expression::Remainder(r) => 4 + count_locals(&r.left) + count_locals(&r.right),
        Expression::Equal(e) => 4 + count_locals(&e.left) + count_locals(&e.right),
        Expression::NotEqual(e) => 4 + count_locals(&e.left) + count_locals(&e.right),
        Expression::LessThan(e) => 4 + count_locals(&e.left) + count_locals(&e.right),
        Expression::LessThanOrEqual(e) => 4 + count_locals(&e.left) + count_locals(&e.right),
        Expression::GreaterThan(e) => 4 + count_locals(&e.left) + count_locals(&e.right),
        Expression::GreaterThanOrEqual(e) => 4 + count_locals(&e.left) + count_locals(&e.right),
        Expression::Not(n) => 4 + count_locals(&n.value),
        Expression::And(a) => 4 + count_locals(&a.left) + count_locals(&a.right),
        Expression::Or(o) => 4 + count_locals(&o.left) + count_locals(&o.right),
        Expression::StringLength(s) => 4 + count_locals(&s.value),
        Expression::StringConcat(s) => 8 + count_locals(&s.left) + count_locals(&s.right),
        Expression::StringSlice(s) => {
            10 + count_locals(&s.value) + count_locals(&s.start) + count_locals(&s.end)
        }
        Expression::ListLength(l) => 4 + count_locals(&l.value),
        Expression::ListConcat(l) => 8 + count_locals(&l.left) + count_locals(&l.right),
        Expression::ListGet(l) => 6 + count_locals(&l.list) + count_locals(&l.index),
        Expression::ListAppend(l) => 8 + count_locals(&l.list) + count_locals(&l.item),
        Expression::If(i) => {
            4 + count_locals(&i.condition) + count_locals(&i.then_expr) + count_locals(&i.else_expr)
        }
        Expression::ListLiteral(list) => 4 + list.items.iter().map(count_locals).sum::<u32>(),
        Expression::TypeLiteral(record) => {
            4 + record
                .items
                .iter()
                .map(|item| count_locals(item.value.as_ref()))
                .sum::<u32>()
        }
        Expression::Constructor(c) => count_locals(c.value.as_ref()),
        _ => 2,
    }
}

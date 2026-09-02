use definy_event::event::{
    AddExpression, AndExpression, BooleanExpression, ConstructorExpression, DivideExpression,
    EqualExpression, Expression, GreaterThanExpression, GreaterThanOrEqualExpression, IfExpression,
    LessThanExpression, LessThanOrEqualExpression, LetExpression, ListLiteralExpression,
    MultiplyExpression, NotEqualExpression, NotExpression, NumberExpression, OrExpression,
    PartReferenceExpression, RemainderExpression, StringExpression, SubtractExpression,
    TypeLiteralExpression, VariableExpression,
};
use std::collections::HashMap;

use crate::expression_eval::Value;

// Minimal Wasm Module builder
const WASM_MAGIC: [u8; 4] = [0x00, 0x61, 0x73, 0x6d];
const WASM_VERSION: [u8; 4] = [0x01, 0x00, 0x00, 0x00];

// Section IDs
const TYPE_SECTION: u8 = 1;
const FUNCTION_SECTION: u8 = 3;
const MEMORY_SECTION: u8 = 5;
const GLOBAL_SECTION: u8 = 6;
const EXPORT_SECTION: u8 = 7;
const CODE_SECTION: u8 = 10;
const DATA_SECTION: u8 = 11;

// ValTypes
const I32: u8 = 0x7F;

// Opcodes
const IF: u8 = 0x04;
const ELSE: u8 = 0x05;
const END: u8 = 0x0B;
const LOCAL_GET: u8 = 0x20;
const LOCAL_SET: u8 = 0x21;
const LOCAL_TEE: u8 = 0x22;
const GLOBAL_GET: u8 = 0x23;
const GLOBAL_SET: u8 = 0x24;
const I32_LOAD: u8 = 0x28;
const I64_LOAD: u8 = 0x29;
const I32_LOAD8_U: u8 = 0x2D;
const I32_STORE: u8 = 0x36;
const I64_STORE: u8 = 0x37;
const I32_STORE8: u8 = 0x3A;
const I32_CONST: u8 = 0x41;
const I64_CONST: u8 = 0x42;
const I32_EQZ: u8 = 0x45;
const I64_EQZ: u8 = 0x50;
const I64_EQ: u8 = 0x51;
const I64_NE: u8 = 0x52;
const I64_LT_S: u8 = 0x53;
const I64_GT_S: u8 = 0x55;
const I64_LE_S: u8 = 0x54;
const I64_GE_S: u8 = 0x56;
const I32_ADD: u8 = 0x6A;
const I32_SUB: u8 = 0x6B;
const I64_ADD: u8 = 0x7C;
const I64_SUB: u8 = 0x7D;
const I64_MUL: u8 = 0x7E;
const I64_DIV_S: u8 = 0x7F;
const I64_REM_S: u8 = 0x81;

const BLOCK_TYPE_I32: u8 = 0x7F;

// Value tag definitions in Wasm memory:
// Tag 0 = Number:  [tag: u8, padding: 7 bytes, val: i64 (8 bytes)] => total 16 bytes
// Tag 1 = Bool:    [tag: u8, padding: 7 bytes, val: u8 (1 byte)]   => total 16 bytes
// Tag 2 = String:  [tag: u8, padding: 3 bytes, len: u32 (4 bytes), utf8_bytes...]
// Tag 3 = List:    [tag: u8, padding: 3 bytes, len: u32 (4 bytes), elem_ptrs: [i32; len]]
// Tag 4 = Record:  [tag: u8, padding: 3 bytes, len: u32 (4 bytes), items: [(key_len: u32, key_bytes, val_ptr: i32)]]

const HEAP_START_OFFSET: u32 = 65536; // 64KB static data area, dynamic heap starts above

struct CompileContext<'a> {
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

    fn alloc_static_string(&mut self, s: &str) -> u32 {
        let mut buf = Vec::new();
        buf.push(2); // Tag 2: String
        buf.extend_from_slice(&[0, 0, 0]); // 3 bytes padding
        buf.extend_from_slice(&(s.len() as u32).to_le_bytes()); // len
        buf.extend_from_slice(s.as_bytes()); // bytes
        self.alloc_static_bytes(&buf)
    }

    fn alloc_static_number(&mut self, n: i64) -> u32 {
        let mut buf = Vec::new();
        buf.push(0); // Tag 0: Number
        buf.extend_from_slice(&[0; 7]); // 7 bytes padding
        buf.extend_from_slice(&n.to_le_bytes()); // 8 bytes i64
        self.alloc_static_bytes(&buf)
    }

    fn alloc_static_bool(&mut self, b: bool) -> u32 {
        let mut buf = Vec::new();
        buf.push(1); // Tag 1: Bool
        buf.extend_from_slice(&[0; 7]); // 7 bytes padding
        buf.push(if b { 1 } else { 0 }); // 1 byte bool
        buf.extend_from_slice(&[0; 7]);
        self.alloc_static_bytes(&buf)
    }
}

pub fn compile_expression_to_wasm(
    expression: &Expression,
    events: &[crate::app_state::EventWithHash],
) -> Result<Vec<u8>, String> {
    let mut ctx = CompileContext::new(events);
    let mut code_bytes = Vec::new();
    let env = HashMap::new();
    let mut next_local_idx = 0;

    emit_expression(
        expression,
        &mut code_bytes,
        &env,
        &mut next_local_idx,
        &mut ctx,
    )?;
    code_bytes.push(END);

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
    let locals_count = count_locals(expression) + 8; // allocate ample i32 locals for temps & variables
    func_body.push(1); // 1 local declaration group
    encode_u32_leb128(&mut func_body, locals_count);
    func_body.push(I32); // all locals are i32 (pointers / temp values)

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

fn emit_section(module: &mut Vec<u8>, section_id: u8, data: &[u8]) {
    module.push(section_id);
    encode_u32_leb128(module, data.len() as u32);
    module.extend_from_slice(data);
}

fn emit_expression(
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

fn emit_alloc_number_from_stack(out: &mut Vec<u8>, next_local_idx: &mut u32) {
    let val_local = *next_local_idx;
    *next_local_idx += 1;
    let res_ptr_local = *next_local_idx;
    *next_local_idx += 1;

    out.push(LOCAL_SET);
    encode_u32_leb128(out, val_local);

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
    encode_u32_leb128(out, val_local);
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
            4 + count_locals(value) + count_locals(body)
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

pub fn encode_u32_leb128(out: &mut Vec<u8>, mut value: u32) {
    loop {
        let mut byte = (value & 0x7F) as u8;
        value >>= 7;
        if value != 0 {
            byte |= 0x80;
        }
        out.push(byte);
        if value == 0 {
            break;
        }
    }
}

pub fn encode_i32_sleb128(out: &mut Vec<u8>, mut value: i32) {
    let mut more = true;
    while more {
        let mut byte = (value & 0x7F) as u8;
        value >>= 7;
        let sign_bit = (byte & 0x40) != 0;

        if (value == 0 && !sign_bit) || (value == -1 && sign_bit) {
            more = false;
        } else {
            byte |= 0x80;
        }
        out.push(byte);
    }
}

pub fn encode_i64_sleb128(out: &mut Vec<u8>, mut value: i64) {
    let mut more = true;
    while more {
        let mut byte = (value & 0x7F) as u8;
        value >>= 7;
        let sign_bit = (byte & 0x40) != 0;

        if (value == 0 && !sign_bit) || (value == -1 && sign_bit) {
            more = false;
        } else {
            byte |= 0x80;
        }
        out.push(byte);
    }
}

// Memory reader to deserialize Value from Wasm memory buffer
pub fn read_value_from_memory(mem: &[u8], ptr: usize) -> Result<Value, &'static str> {
    if ptr >= mem.len() {
        return Err("Memory pointer out of bounds");
    }
    let tag = mem[ptr];
    match tag {
        0 => {
            // Number: 8 bytes i64 at ptr + 8
            if ptr + 16 > mem.len() {
                return Err("Number data truncated");
            }
            let bytes: [u8; 8] = mem[ptr + 8..ptr + 16].try_into().unwrap();
            let num = i64::from_le_bytes(bytes);
            Ok(Value::Number(num))
        }
        1 => {
            // Bool: 1 byte at ptr + 8
            if ptr + 9 > mem.len() {
                return Err("Bool data truncated");
            }
            let b = mem[ptr + 8] != 0;
            Ok(Value::Bool(b))
        }
        2 => {
            // String: 4 bytes len at ptr + 4, followed by bytes
            if ptr + 8 > mem.len() {
                return Err("String header truncated");
            }
            let len_bytes: [u8; 4] = mem[ptr + 4..ptr + 8].try_into().unwrap();
            let len = u32::from_le_bytes(len_bytes) as usize;
            if ptr + 8 + len > mem.len() {
                return Err("String data truncated");
            }
            let s = std::str::from_utf8(&mem[ptr + 8..ptr + 8 + len])
                .map_err(|_| "Invalid UTF-8 in String value")?;
            Ok(Value::String(s.to_string()))
        }
        3 => {
            // List: 4 bytes len at ptr + 4, followed by elem pointers [i32; len]
            if ptr + 8 > mem.len() {
                return Err("List header truncated");
            }
            let len_bytes: [u8; 4] = mem[ptr + 4..ptr + 8].try_into().unwrap();
            let len = u32::from_le_bytes(len_bytes) as usize;
            if ptr + 8 + len * 4 > mem.len() {
                return Err("List items truncated");
            }
            let mut items = Vec::with_capacity(len);
            for i in 0..len {
                let elem_ptr_bytes: [u8; 4] =
                    mem[ptr + 8 + i * 4..ptr + 12 + i * 4].try_into().unwrap();
                let elem_ptr = u32::from_le_bytes(elem_ptr_bytes) as usize;
                items.push(read_value_from_memory(mem, elem_ptr)?);
            }
            Ok(Value::List(items))
        }
        4 => {
            // Record: 4 bytes len at ptr + 4, followed by (key_ptr: i32, val_ptr: i32) pairs
            if ptr + 8 > mem.len() {
                return Err("Record header truncated");
            }
            let len_bytes: [u8; 4] = mem[ptr + 4..ptr + 8].try_into().unwrap();
            let len = u32::from_le_bytes(len_bytes) as usize;
            if ptr + 8 + len * 8 > mem.len() {
                return Err("Record items truncated");
            }
            let mut items = Vec::with_capacity(len);
            for i in 0..len {
                let key_ptr_bytes: [u8; 4] =
                    mem[ptr + 8 + i * 8..ptr + 12 + i * 8].try_into().unwrap();
                let key_ptr = u32::from_le_bytes(key_ptr_bytes) as usize;
                let val_ptr_bytes: [u8; 4] =
                    mem[ptr + 12 + i * 8..ptr + 16 + i * 8].try_into().unwrap();
                let val_ptr = u32::from_le_bytes(val_ptr_bytes) as usize;

                let key_val = read_value_from_memory(mem, key_ptr)?;
                let key_str = match key_val {
                    Value::String(s) => s,
                    _ => return Err("Record key is not a string"),
                };
                let val = read_value_from_memory(mem, val_ptr)?;
                items.push((key_str, val));
            }
            Ok(Value::Record(items))
        }
        _ => Err("Unknown value tag in Wasm memory"),
    }
}

// Universal WebAssembly Execution:
// On wasm32: calls js_sys::WebAssembly
// On native/tests: executes using built-in Wasm VM
pub fn execute_wasm(wasm_bytes: &[u8]) -> Result<Value, &'static str> {
    #[cfg(target_arch = "wasm32")]
    {
        let uint8_array = js_sys::Uint8Array::from(wasm_bytes);
        let module_result = js_sys::WebAssembly::Module::new(&uint8_array)
            .map_err(|_| "Wasm module compile failed")?;
        let imports = js_sys::Object::new();
        let instance = js_sys::WebAssembly::Instance::new(&module_result, &imports)
            .map_err(|_| "Wasm instantiation failed")?;
        let exports = instance.exports();
        let evaluate_func =
            js_sys::Reflect::get(&exports, &wasm_bindgen::JsValue::from_str("evaluate"))
                .map_err(|_| "evaluate function not found")?;
        let memory_val = js_sys::Reflect::get(&exports, &wasm_bindgen::JsValue::from_str("memory"))
            .map_err(|_| "memory not found")?;

        if !evaluate_func.is_function() {
            return Err("evaluate export is not a function");
        }

        let func_obj: &js_sys::Function = wasm_bindgen::JsCast::unchecked_ref(&evaluate_func);
        let call_result = func_obj
            .call0(&wasm_bindgen::JsValue::NULL)
            .map_err(|_| "Exception executing Wasm evaluate()")?;

        let ptr = call_result
            .as_f64()
            .ok_or("Invalid pointer returned from Wasm")? as usize;

        let memory: js_sys::WebAssembly::Memory = wasm_bindgen::JsCast::unchecked_into(memory_val);
        let buffer = memory.buffer();
        let mem_array = js_sys::Uint8Array::new(&buffer);
        let mut mem_vec = vec![0u8; mem_array.length() as usize];
        mem_array.copy_to(&mut mem_vec);

        read_value_from_memory(&mem_vec, ptr)
    }

    #[cfg(not(target_arch = "wasm32"))]
    {
        execute_wasm_in_vm(wasm_bytes)
    }
}

// Pure Rust WebAssembly VM implementation to execute the compiled Wasm bytecode on native/test targets
#[derive(Debug, Clone)]
enum StackVal {
    I32(i32),
    I64(i64),
}

pub fn execute_wasm_in_vm(wasm_bytes: &[u8]) -> Result<Value, &'static str> {
    // Parse Wasm sections
    if !wasm_bytes.starts_with(&WASM_MAGIC) {
        return Err("Invalid Wasm magic");
    }

    let mut pos = 8;
    let mut code_bytes = Vec::new();
    let mut initial_data = Vec::new();
    let mut data_offset = 1024;
    let memory_pages = 2;

    while pos < wasm_bytes.len() {
        let section_id = wasm_bytes[pos];
        pos += 1;
        let (section_len, len_bytes) = read_u32_leb128(&wasm_bytes[pos..])?;
        pos += len_bytes;
        let section_end = pos + section_len as usize;

        if section_id == DATA_SECTION {
            // Read 1st data segment
            let mut d_pos = pos;
            let (_count, c_bytes) = read_u32_leb128(&wasm_bytes[d_pos..])?;
            d_pos += c_bytes;
            d_pos += 1; // mem idx 0
            if wasm_bytes[d_pos] == I32_CONST {
                d_pos += 1;
                let (offset, o_bytes) = read_i32_sleb128(&wasm_bytes[d_pos..])?;
                d_pos += o_bytes;
                data_offset = offset as usize;
                d_pos += 1; // END
                let (data_len, dl_bytes) = read_u32_leb128(&wasm_bytes[d_pos..])?;
                d_pos += dl_bytes;
                initial_data = wasm_bytes[d_pos..d_pos + data_len as usize].to_vec();
            }
        } else if section_id == CODE_SECTION {
            let mut c_pos = pos;
            let (_count, count_bytes) = read_u32_leb128(&wasm_bytes[c_pos..])?;
            c_pos += count_bytes;
            let (_body_size, b_bytes) = read_u32_leb128(&wasm_bytes[c_pos..])?;
            c_pos += b_bytes;
            code_bytes = wasm_bytes[c_pos..section_end].to_vec();
        }

        pos = section_end;
    }

    let mut memory = vec![0u8; memory_pages * 65536];
    if !initial_data.is_empty() {
        memory[data_offset..data_offset + initial_data.len()].copy_from_slice(&initial_data);
    }

    let mut globals = vec![HEAP_START_OFFSET as i32];

    // Parse locals in function body
    let mut c_pos = 0;
    let (num_local_groups, g_bytes) = read_u32_leb128(&code_bytes[c_pos..])?;
    c_pos += g_bytes;
    let mut total_locals = 0;
    for _ in 0..num_local_groups {
        let (count, count_bytes) = read_u32_leb128(&code_bytes[c_pos..])?;
        c_pos += count_bytes;
        c_pos += 1; // type
        total_locals += count as usize;
    }

    let instructions = &code_bytes[c_pos..];
    let mut locals = vec![StackVal::I32(0); total_locals];
    let mut stack: Vec<StackVal> = Vec::new();

    let mut ip = 0;
    while ip < instructions.len() {
        let op = instructions[ip];
        ip += 1;

        match op {
            I32_CONST => {
                let (val, bytes) = read_i32_sleb128(&instructions[ip..])?;
                ip += bytes;
                stack.push(StackVal::I32(val));
            }
            I64_CONST => {
                let (val, bytes) = read_i64_sleb128(&instructions[ip..])?;
                ip += bytes;
                stack.push(StackVal::I64(val));
            }
            LOCAL_GET => {
                let (idx, bytes) = read_u32_leb128(&instructions[ip..])?;
                ip += bytes;
                stack.push(locals[idx as usize].clone());
            }
            LOCAL_SET => {
                let (idx, bytes) = read_u32_leb128(&instructions[ip..])?;
                ip += bytes;
                let val = stack.pop().ok_or("Stack underflow in local.set")?;
                locals[idx as usize] = val;
            }
            LOCAL_TEE => {
                let (idx, bytes) = read_u32_leb128(&instructions[ip..])?;
                ip += bytes;
                let val = stack.last().ok_or("Stack underflow in local.tee")?.clone();
                locals[idx as usize] = val;
            }
            GLOBAL_GET => {
                let (idx, bytes) = read_u32_leb128(&instructions[ip..])?;
                ip += bytes;
                stack.push(StackVal::I32(globals[idx as usize]));
            }
            GLOBAL_SET => {
                let (idx, bytes) = read_u32_leb128(&instructions[ip..])?;
                ip += bytes;
                if let Some(StackVal::I32(v)) = stack.pop() {
                    globals[idx as usize] = v;
                }
            }
            I32_ADD => {
                let b = pop_i32(&mut stack)?;
                let a = pop_i32(&mut stack)?;
                stack.push(StackVal::I32(a.wrapping_add(b)));
            }
            I32_SUB => {
                let b = pop_i32(&mut stack)?;
                let a = pop_i32(&mut stack)?;
                stack.push(StackVal::I32(a.wrapping_sub(b)));
            }
            I64_ADD => {
                let b = pop_i64(&mut stack)?;
                let a = pop_i64(&mut stack)?;
                stack.push(StackVal::I64(a.wrapping_add(b)));
            }
            I64_SUB => {
                let b = pop_i64(&mut stack)?;
                let a = pop_i64(&mut stack)?;
                stack.push(StackVal::I64(a.wrapping_sub(b)));
            }
            I64_MUL => {
                let b = pop_i64(&mut stack)?;
                let a = pop_i64(&mut stack)?;
                stack.push(StackVal::I64(a.wrapping_mul(b)));
            }
            I64_DIV_S => {
                let b = pop_i64(&mut stack)?;
                let a = pop_i64(&mut stack)?;
                if b == 0 {
                    return Err("Division by zero in Wasm");
                }
                stack.push(StackVal::I64(a.wrapping_div(b)));
            }
            I64_REM_S => {
                let b = pop_i64(&mut stack)?;
                let a = pop_i64(&mut stack)?;
                if b == 0 {
                    return Err("Remainder by zero in Wasm");
                }
                stack.push(StackVal::I64(a.wrapping_rem(b)));
            }
            I64_EQ => {
                let b = pop_i64(&mut stack)?;
                let a = pop_i64(&mut stack)?;
                stack.push(StackVal::I32(if a == b { 1 } else { 0 }));
            }
            I64_NE => {
                let b = pop_i64(&mut stack)?;
                let a = pop_i64(&mut stack)?;
                stack.push(StackVal::I32(if a != b { 1 } else { 0 }));
            }
            I64_LT_S => {
                let b = pop_i64(&mut stack)?;
                let a = pop_i64(&mut stack)?;
                stack.push(StackVal::I32(if a < b { 1 } else { 0 }));
            }
            I64_LE_S => {
                let b = pop_i64(&mut stack)?;
                let a = pop_i64(&mut stack)?;
                stack.push(StackVal::I32(if a <= b { 1 } else { 0 }));
            }
            I64_GT_S => {
                let b = pop_i64(&mut stack)?;
                let a = pop_i64(&mut stack)?;
                stack.push(StackVal::I32(if a > b { 1 } else { 0 }));
            }
            I64_GE_S => {
                let b = pop_i64(&mut stack)?;
                let a = pop_i64(&mut stack)?;
                stack.push(StackVal::I32(if a >= b { 1 } else { 0 }));
            }
            I32_EQZ => {
                let a = pop_i32(&mut stack)?;
                stack.push(StackVal::I32(if a == 0 { 1 } else { 0 }));
            }
            I64_EQZ => {
                let a = pop_i64(&mut stack)?;
                stack.push(StackVal::I32(if a == 0 { 1 } else { 0 }));
            }
            I32_LOAD8_U => {
                let (_align, a_bytes) = read_u32_leb128(&instructions[ip..])?;
                ip += a_bytes;
                let (offset, o_bytes) = read_u32_leb128(&instructions[ip..])?;
                ip += o_bytes;
                let base = pop_i32(&mut stack)? as usize;
                let addr = base + offset as usize;
                let byte = memory[addr];
                stack.push(StackVal::I32(byte as i32));
            }
            I32_LOAD => {
                let (_align, a_bytes) = read_u32_leb128(&instructions[ip..])?;
                ip += a_bytes;
                let (offset, o_bytes) = read_u32_leb128(&instructions[ip..])?;
                ip += o_bytes;
                let base = pop_i32(&mut stack)? as usize;
                let addr = base + offset as usize;
                let bytes: [u8; 4] = memory[addr..addr + 4].try_into().unwrap();
                stack.push(StackVal::I32(i32::from_le_bytes(bytes)));
            }
            I64_LOAD => {
                let (_align, a_bytes) = read_u32_leb128(&instructions[ip..])?;
                ip += a_bytes;
                let (offset, o_bytes) = read_u32_leb128(&instructions[ip..])?;
                ip += o_bytes;
                let base = pop_i32(&mut stack)? as usize;
                let addr = base + offset as usize;
                let bytes: [u8; 8] = memory[addr..addr + 8].try_into().unwrap();
                stack.push(StackVal::I64(i64::from_le_bytes(bytes)));
            }
            I32_STORE8 => {
                let (_align, a_bytes) = read_u32_leb128(&instructions[ip..])?;
                ip += a_bytes;
                let (offset, o_bytes) = read_u32_leb128(&instructions[ip..])?;
                ip += o_bytes;
                let val = pop_i32(&mut stack)? as u8;
                let base = pop_i32(&mut stack)? as usize;
                let addr = base + offset as usize;
                memory[addr] = val;
            }
            I32_STORE => {
                let (_align, a_bytes) = read_u32_leb128(&instructions[ip..])?;
                ip += a_bytes;
                let (offset, o_bytes) = read_u32_leb128(&instructions[ip..])?;
                ip += o_bytes;
                let val = pop_i32(&mut stack)?;
                let base = pop_i32(&mut stack)? as usize;
                let addr = base + offset as usize;
                memory[addr..addr + 4].copy_from_slice(&val.to_le_bytes());
            }
            I64_STORE => {
                let (_align, a_bytes) = read_u32_leb128(&instructions[ip..])?;
                ip += a_bytes;
                let (offset, o_bytes) = read_u32_leb128(&instructions[ip..])?;
                ip += o_bytes;
                let val = pop_i64(&mut stack)?;
                let base = pop_i32(&mut stack)? as usize;
                let addr = base + offset as usize;
                memory[addr..addr + 8].copy_from_slice(&val.to_le_bytes());
            }
            IF => {
                ip += 1; // block type (e.g. 0x7F)
                let cond = pop_i32(&mut stack)?;
                if cond != 0 {
                    // Execute then block until ELSE or matching END
                    continue;
                } else {
                    // Skip to matching ELSE or END at depth 1
                    let mut depth = 1;
                    while ip < instructions.len() && depth > 0 {
                        let inner_op = instructions[ip];
                        ip += 1;
                        if inner_op == IF {
                            ip += 1; // skip type
                            depth += 1;
                        } else if inner_op == ELSE && depth == 1 {
                            break;
                        } else if inner_op == END {
                            depth -= 1;
                        } else {
                            skip_op_payload(inner_op, instructions, &mut ip)?;
                        }
                    }
                }
            }
            ELSE => {
                // If we hit ELSE during then execution, skip to matching END
                let mut depth = 1;
                while ip < instructions.len() && depth > 0 {
                    let inner_op = instructions[ip];
                    ip += 1;
                    if inner_op == IF {
                        ip += 1;
                        depth += 1;
                    } else if inner_op == END {
                        depth -= 1;
                    } else {
                        skip_op_payload(inner_op, instructions, &mut ip)?;
                    }
                }
            }
            END => {
                if ip >= instructions.len() {
                    break;
                }
            }
            _ => {
                return Err("Unsupported Wasm instruction in VM");
            }
        }
    }

    let ret_ptr = pop_i32(&mut stack)? as usize;
    read_value_from_memory(&memory, ret_ptr)
}

fn pop_i32(stack: &mut Vec<StackVal>) -> Result<i32, &'static str> {
    match stack.pop() {
        Some(StackVal::I32(val)) => Ok(val),
        _ => Err("Expected i32 on stack"),
    }
}

fn pop_i64(stack: &mut Vec<StackVal>) -> Result<i64, &'static str> {
    match stack.pop() {
        Some(StackVal::I64(val)) => Ok(val),
        _ => Err("Expected i64 on stack"),
    }
}

fn skip_op_payload(op: u8, instructions: &[u8], ip: &mut usize) -> Result<(), &'static str> {
    match op {
        I32_CONST => {
            let (_, bytes) = read_i32_sleb128(&instructions[*ip..])?;
            *ip += bytes;
        }
        I64_CONST => {
            let (_, bytes) = read_i64_sleb128(&instructions[*ip..])?;
            *ip += bytes;
        }
        LOCAL_GET | LOCAL_SET | LOCAL_TEE | GLOBAL_GET | GLOBAL_SET => {
            let (_, bytes) = read_u32_leb128(&instructions[*ip..])?;
            *ip += bytes;
        }
        I32_LOAD8_U | I32_LOAD | I64_LOAD | I32_STORE8 | I32_STORE | I64_STORE => {
            let (_, b1) = read_u32_leb128(&instructions[*ip..])?;
            *ip += b1;
            let (_, b2) = read_u32_leb128(&instructions[*ip..])?;
            *ip += b2;
        }
        _ => {}
    }
    Ok(())
}

fn read_u32_leb128(bytes: &[u8]) -> Result<(u32, usize), &'static str> {
    let mut result = 0u32;
    let mut shift = 0;
    let mut count = 0;
    for &byte in bytes {
        count += 1;
        result |= ((byte & 0x7F) as u32) << shift;
        if (byte & 0x80) == 0 {
            return Ok((result, count));
        }
        shift += 7;
        if shift > 35 {
            return Err("LEB128 overflow");
        }
    }
    Err("Unexpected EOF in LEB128")
}

fn read_i32_sleb128(bytes: &[u8]) -> Result<(i32, usize), &'static str> {
    let mut result = 0i32;
    let mut shift = 0;
    let mut count = 0;
    for &byte in bytes {
        count += 1;
        result |= ((byte & 0x7F) as i32) << shift;
        shift += 7;
        if (byte & 0x80) == 0 {
            if shift < 32 && (byte & 0x40) != 0 {
                result |= !0 << shift;
            }
            return Ok((result, count));
        }
        if shift > 35 {
            return Err("SLEB128 overflow");
        }
    }
    Err("Unexpected EOF in SLEB128")
}

fn read_i64_sleb128(bytes: &[u8]) -> Result<(i64, usize), &'static str> {
    let mut result = 0i64;
    let mut shift = 0;
    let mut count = 0;
    for &byte in bytes {
        count += 1;
        result |= ((byte & 0x7F) as i64) << shift;
        shift += 7;
        if (byte & 0x80) == 0 {
            if shift < 64 && (byte & 0x40) != 0 {
                result |= !0 << shift;
            }
            return Ok((result, count));
        }
        if shift > 70 {
            return Err("SLEB128 overflow");
        }
    }
    Err("Unexpected EOF in SLEB128")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compile_and_execute_arithmetic() {
        let expr = Expression::Add(AddExpression {
            left: Box::new(Expression::Number(NumberExpression { value: 10 })),
            right: Box::new(Expression::Multiply(MultiplyExpression {
                left: Box::new(Expression::Number(NumberExpression { value: 3 })),
                right: Box::new(Expression::Number(NumberExpression { value: 4 })),
            })),
        });
        let wasm = compile_expression_to_wasm(&expr, &[]).unwrap();
        let val = execute_wasm(&wasm).unwrap();
        assert_eq!(val, Value::Number(22));
    }

    #[test]
    fn test_compile_and_execute_comparisons_and_if() {
        let expr = Expression::If(IfExpression {
            condition: Box::new(Expression::LessThan(LessThanExpression {
                left: Box::new(Expression::Number(NumberExpression { value: 5 })),
                right: Box::new(Expression::Number(NumberExpression { value: 10 })),
            })),
            then_expr: Box::new(Expression::Subtract(SubtractExpression {
                left: Box::new(Expression::Number(NumberExpression { value: 50 })),
                right: Box::new(Expression::Number(NumberExpression { value: 8 })),
            })),
            else_expr: Box::new(Expression::Number(NumberExpression { value: 0 })),
        });
        let wasm = compile_expression_to_wasm(&expr, &[]).unwrap();
        let val = execute_wasm(&wasm).unwrap();
        assert_eq!(val, Value::Number(42));
    }

    #[test]
    fn test_compile_and_execute_strings_and_lists() {
        let list_expr = Expression::ListLiteral(ListLiteralExpression {
            items: vec![
                Expression::String(StringExpression {
                    value: "hello".into(),
                }),
                Expression::String(StringExpression {
                    value: "world".into(),
                }),
            ],
        });
        let wasm = compile_expression_to_wasm(&list_expr, &[]).unwrap();
        let val = execute_wasm(&wasm).unwrap();
        assert_eq!(
            val,
            Value::List(vec![
                Value::String("hello".into()),
                Value::String("world".into())
            ])
        );
    }
}

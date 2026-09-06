use crate::expression_eval::Value;

use super::bytecode::*;
use super::memory::read_value_from_memory;

pub fn execute_wasm(wasm_bytes: &[u8]) -> Result<Value, String> {
    #[cfg(target_arch = "wasm32")]
    {
        let uint8_array = js_sys::Uint8Array::from(wasm_bytes);
        let module_result = js_sys::WebAssembly::Module::new(&uint8_array)
            .map_err(|e| format_js_error("Wasm module compile failed", e))?;
        let imports = js_sys::Object::new();
        let instance = js_sys::WebAssembly::Instance::new(&module_result, &imports)
            .map_err(|e| format_js_error("Wasm instantiation failed", e))?;
        let exports = js_sys::Reflect::get(&instance, &wasm_bindgen::JsValue::from_str("exports"))
            .map_err(|e| format_js_error("exports not found", e))?;

        let evaluate_func =
            js_sys::Reflect::get(&exports, &wasm_bindgen::JsValue::from_str("evaluate"))
                .map_err(|e| format_js_error("evaluate function not found", e))?;
        let memory_val = js_sys::Reflect::get(&exports, &wasm_bindgen::JsValue::from_str("memory"))
            .map_err(|e| format_js_error("memory not found", e))?;

        if !evaluate_func.is_function() {
            return Err("evaluate export is not a function".into());
        }
        let func = js_sys::Function::from(evaluate_func);
        let ret_val = func
            .call0(&wasm_bindgen::JsValue::NULL)
            .map_err(|e| format_js_error("evaluate call failed", e))?;

        let ret_ptr = ret_val
            .as_f64()
            .ok_or_else(|| "Invalid return pointer".to_string())? as usize;

        let wasm_mem: js_sys::WebAssembly::Memory = memory_val.into();
        let buffer = wasm_mem.buffer();
        let array = js_sys::Uint8Array::new(&buffer);
        let mut rust_mem = vec![0u8; array.length() as usize];
        array.copy_to(&mut rust_mem);

        read_value_from_memory(&rust_mem, ret_ptr).map_err(|e| e.to_string())
    }

    #[cfg(not(target_arch = "wasm32"))]
    {
        execute_wasm_in_vm(wasm_bytes).map_err(|e| e.to_string())
    }
}

#[cfg(target_arch = "wasm32")]
fn format_js_error(context: &str, err: wasm_bindgen::JsValue) -> String {
    if let Ok(msg) = js_sys::Reflect::get(&err, &wasm_bindgen::JsValue::from_str("message")) {
        if let Some(msg_str) = msg.as_string() {
            return format!("{}: {}", context, msg_str);
        }
    }
    format!("{}: {:?}", context, err)
}

// Pure Rust WebAssembly VM implementation to execute the compiled Wasm bytecode on native/test targets
#[derive(Debug, Clone)]
enum StackVal {
    I32(i32),
    I64(i64),
}

#[derive(Debug, Clone)]
enum ControlFrame {
    Block { end_ip: usize },
    Loop { loop_ip: usize },
    If { end_ip: usize },
}

pub fn execute_wasm_in_vm(wasm_bytes: &[u8]) -> Result<Value, &'static str> {
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
            let (_count, count_bytes) = read_u32_leb128(&code_bytes_slice(wasm_bytes, c_pos)?)?;
            c_pos += count_bytes;
            let (_body_size, b_bytes) = read_u32_leb128(&code_bytes_slice(wasm_bytes, c_pos)?)?;
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
    let mut control_stack: Vec<ControlFrame> = Vec::new();

    let mut ip = 0;
    while ip < instructions.len() {
        let op = instructions[ip];
        ip += 1;

        match op {
            BLOCK => {
                ip += 1; // block type
                let end_ip = find_matching_end(instructions, ip)?;
                control_stack.push(ControlFrame::Block { end_ip });
            }
            LOOP => {
                ip += 1; // block type
                let loop_ip = ip;
                control_stack.push(ControlFrame::Loop { loop_ip });
            }
            BR => {
                let (label_idx, _) = read_u32_leb128(&instructions[ip..])?;
                let target_pos = control_stack.len() - 1 - label_idx as usize;
                let frame = control_stack[target_pos].clone();
                match frame {
                    ControlFrame::Block { end_ip } | ControlFrame::If { end_ip } => {
                        ip = end_ip;
                        control_stack.truncate(target_pos);
                    }
                    ControlFrame::Loop { loop_ip } => {
                        ip = loop_ip;
                        control_stack.truncate(target_pos + 1);
                    }
                }
            }
            BR_IF => {
                let (label_idx, bytes) = read_u32_leb128(&instructions[ip..])?;
                ip += bytes;
                let cond = pop_i32(&mut stack)?;
                if cond != 0 {
                    let target_pos = control_stack.len() - 1 - label_idx as usize;
                    let frame = control_stack[target_pos].clone();
                    match frame {
                        ControlFrame::Block { end_ip } | ControlFrame::If { end_ip } => {
                            ip = end_ip;
                            control_stack.truncate(target_pos);
                        }
                        ControlFrame::Loop { loop_ip } => {
                            ip = loop_ip;
                            control_stack.truncate(target_pos + 1);
                        }
                    }
                }
            }
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
            I32_MUL => {
                let b = pop_i32(&mut stack)?;
                let a = pop_i32(&mut stack)?;
                stack.push(StackVal::I32(a.wrapping_mul(b)));
            }
            I32_AND => {
                let b = pop_i32(&mut stack)?;
                let a = pop_i32(&mut stack)?;
                stack.push(StackVal::I32(a & b));
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
            I32_EQ => {
                let b = pop_i32(&mut stack)?;
                let a = pop_i32(&mut stack)?;
                stack.push(StackVal::I32(if a == b { 1 } else { 0 }));
            }
            I32_NE => {
                let b = pop_i32(&mut stack)?;
                let a = pop_i32(&mut stack)?;
                stack.push(StackVal::I32(if a != b { 1 } else { 0 }));
            }
            I32_LT_S => {
                let b = pop_i32(&mut stack)?;
                let a = pop_i32(&mut stack)?;
                stack.push(StackVal::I32(if a < b { 1 } else { 0 }));
            }
            I32_LE_S => {
                let b = pop_i32(&mut stack)?;
                let a = pop_i32(&mut stack)?;
                stack.push(StackVal::I32(if a <= b { 1 } else { 0 }));
            }
            I32_GT_S => {
                let b = pop_i32(&mut stack)?;
                let a = pop_i32(&mut stack)?;
                stack.push(StackVal::I32(if a > b { 1 } else { 0 }));
            }
            I32_GE_S => {
                let b = pop_i32(&mut stack)?;
                let a = pop_i32(&mut stack)?;
                stack.push(StackVal::I32(if a >= b { 1 } else { 0 }));
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
            I32_WRAP_I64 => {
                let a = pop_i64(&mut stack)?;
                stack.push(StackVal::I32(a as i32));
            }
            I64_EXTEND_I32_U => {
                let a = pop_i32(&mut stack)?;
                stack.push(StackVal::I64(a as u32 as i64));
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
                    let end_ip = find_matching_end(instructions, ip)?;
                    control_stack.push(ControlFrame::If { end_ip });
                } else {
                    // Skip to matching ELSE or END at depth 1
                    let mut depth = 1;
                    while ip < instructions.len() && depth > 0 {
                        let inner_op = instructions[ip];
                        ip += 1;
                        if inner_op == BLOCK || inner_op == LOOP || inner_op == IF {
                            ip += 1; // skip type
                            depth += 1;
                        } else if inner_op == ELSE && depth == 1 {
                            let end_ip = find_matching_end(instructions, ip)?;
                            control_stack.push(ControlFrame::If { end_ip });
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
                if let Some(ControlFrame::If { end_ip }) = control_stack.pop() {
                    ip = end_ip;
                }
            }
            END => {
                control_stack.pop();
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

fn code_bytes_slice(bytes: &[u8], pos: usize) -> Result<&[u8], &'static str> {
    if pos < bytes.len() {
        Ok(&bytes[pos..])
    } else {
        Err("Unexpected EOF")
    }
}

fn find_matching_end(instructions: &[u8], mut ip: usize) -> Result<usize, &'static str> {
    let mut depth = 1;
    while ip < instructions.len() && depth > 0 {
        let op = instructions[ip];
        ip += 1;
        if op == BLOCK || op == LOOP || op == IF {
            ip += 1; // block type
            depth += 1;
        } else if op == END {
            depth -= 1;
            if depth == 0 {
                return Ok(ip - 1);
            }
        } else {
            skip_op_payload(op, instructions, &mut ip)?;
        }
    }
    Err("Unmatched block/loop/if END")
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
        LOCAL_GET | LOCAL_SET | LOCAL_TEE | GLOBAL_GET | GLOBAL_SET | BR | BR_IF => {
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

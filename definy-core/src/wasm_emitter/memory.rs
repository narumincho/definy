use crate::expression_eval::Value;

pub fn read_value_from_memory(memory: &[u8], ptr: usize) -> Result<Value, &'static str> {
    if ptr >= memory.len() {
        return Err("Memory pointer out of bounds");
    }

    let tag = memory[ptr];
    match tag {
        0 => {
            // Number (i64 at ptr + 8)
            let bytes: [u8; 8] = memory[ptr + 8..ptr + 16]
                .try_into()
                .map_err(|_| "Failed to read number bytes")?;
            let val = i64::from_le_bytes(bytes);
            Ok(Value::Number(val))
        }
        1 => {
            // Bool (u8 at ptr + 8)
            let b = memory[ptr + 8];
            Ok(Value::Bool(b != 0))
        }
        2 => {
            // String (len at ptr + 4, bytes at ptr + 8)
            let len_bytes: [u8; 4] = memory[ptr + 4..ptr + 8]
                .try_into()
                .map_err(|_| "Failed to read string len")?;
            let len = u32::from_le_bytes(len_bytes) as usize;
            let str_bytes = &memory[ptr + 8..ptr + 8 + len];
            let s = std::str::from_utf8(str_bytes).map_err(|_| "Invalid UTF-8 string")?;
            Ok(Value::String(s.to_string()))
        }
        3 => {
            // List (count at ptr + 4, elem_ptrs at ptr + 8)
            let count_bytes: [u8; 4] = memory[ptr + 4..ptr + 8]
                .try_into()
                .map_err(|_| "Failed to read list count")?;
            let count = u32::from_le_bytes(count_bytes) as usize;
            let mut items = Vec::with_capacity(count);
            for i in 0..count {
                let elem_ptr_bytes: [u8; 4] = memory[ptr + 8 + i * 4..ptr + 8 + i * 4 + 4]
                    .try_into()
                    .map_err(|_| "Failed to read elem ptr")?;
                let elem_ptr = u32::from_le_bytes(elem_ptr_bytes) as usize;
                items.push(read_value_from_memory(memory, elem_ptr)?);
            }
            Ok(Value::List(items))
        }
        4 => {
            // Record (count at ptr + 4, items at ptr + 8)
            let count_bytes: [u8; 4] = memory[ptr + 4..ptr + 8]
                .try_into()
                .map_err(|_| "Failed to read record count")?;
            let count = u32::from_le_bytes(count_bytes) as usize;
            let mut items = Vec::with_capacity(count);
            for i in 0..count {
                let key_ptr_bytes: [u8; 4] = memory[ptr + 8 + i * 8..ptr + 8 + i * 8 + 4]
                    .try_into()
                    .map_err(|_| "Failed to read key ptr")?;
                let key_ptr = u32::from_le_bytes(key_ptr_bytes) as usize;
                let val_ptr_bytes: [u8; 4] = memory[ptr + 8 + i * 8 + 4..ptr + 8 + i * 8 + 8]
                    .try_into()
                    .map_err(|_| "Failed to read val ptr")?;
                let val_ptr = u32::from_le_bytes(val_ptr_bytes) as usize;

                let key_val = read_value_from_memory(memory, key_ptr)?;
                let key_str = match key_val {
                    Value::String(s) => s,
                    _ => return Err("Record key is not a string"),
                };
                let val = read_value_from_memory(memory, val_ptr)?;
                items.push((key_str, val));
            }
            Ok(Value::Record(items))
        }
        5 => {
            // Function / Closure (table_idx at ptr + 4, env_ptr at ptr + 8)
            Ok(Value::Function)
        }
        6 => {
            // Variant (tag_ptr at ptr + 4, payload_ptr at ptr + 8)
            let tag_ptr_bytes: [u8; 4] = memory[ptr + 4..ptr + 8]
                .try_into()
                .map_err(|_| "Failed to read variant tag ptr")?;
            let tag_ptr = u32::from_le_bytes(tag_ptr_bytes) as usize;
            let tag_val = read_value_from_memory(memory, tag_ptr)?;
            let tag_str = match tag_val {
                Value::String(s) => s,
                _ => return Err("Variant tag is not a string"),
            };

            let payload_ptr_bytes: [u8; 4] = memory[ptr + 8..ptr + 12]
                .try_into()
                .map_err(|_| "Failed to read variant payload ptr")?;
            let payload_ptr = u32::from_le_bytes(payload_ptr_bytes) as usize;
            let payload = if payload_ptr != 0 {
                Some(Box::new(read_value_from_memory(memory, payload_ptr)?))
            } else {
                None
            };
            Ok(Value::Variant {
                tag: tag_str,
                payload,
            })
        }
        _ => Err("Unknown value tag in Wasm memory"),
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RawWasmHttpResponse {
    pub status: u16,
    pub headers: Vec<(String, String)>,
    pub initial_state_ptr: u32,
    pub next_table_idx: u32,
    pub next_env_ptr: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RawWasmStreamStep {
    Yield { chunk: Vec<u8>, next_state_ptr: u32 },
    Done,
}

fn read_record_field_ptrs(memory: &[u8], ptr: usize) -> Result<Vec<(String, u32)>, String> {
    if ptr >= memory.len() || memory[ptr] != 4 {
        return Err("Expected Record (tag 4) in Wasm memory".to_string());
    }
    let count_bytes: [u8; 4] = memory
        .get(ptr + 4..ptr + 8)
        .and_then(|s| s.try_into().ok())
        .ok_or_else(|| "Failed to read record count".to_string())?;
    let count = u32::from_le_bytes(count_bytes) as usize;
    let mut fields = Vec::with_capacity(count);
    for i in 0..count {
        let key_ptr_bytes: [u8; 4] = memory
            .get(ptr + 8 + i * 8..ptr + 8 + i * 8 + 4)
            .and_then(|s| s.try_into().ok())
            .ok_or_else(|| "Failed to read record key ptr".to_string())?;
        let key_ptr = u32::from_le_bytes(key_ptr_bytes) as usize;
        let val_ptr_bytes: [u8; 4] = memory
            .get(ptr + 8 + i * 8 + 4..ptr + 8 + i * 8 + 8)
            .and_then(|s| s.try_into().ok())
            .ok_or_else(|| "Failed to read record val ptr".to_string())?;
        let val_ptr = u32::from_le_bytes(val_ptr_bytes);
        let key_val = read_value_from_memory(memory, key_ptr).map_err(|e| e.to_string())?;
        let Value::String(key_str) = key_val else {
            return Err("Record key is not a string".to_string());
        };
        fields.push((key_str, val_ptr));
    }
    Ok(fields)
}

pub fn read_http_response_and_stream_ptrs(
    memory: &[u8],
    ptr: usize,
) -> Result<RawWasmHttpResponse, String> {
    let fields = read_record_field_ptrs(memory, ptr)?;
    let mut status: Option<u16> = None;
    let mut headers: Option<Vec<(String, String)>> = None;
    let mut body_ptr: Option<usize> = None;

    for (key, val_ptr) in fields {
        match key.as_str() {
            "status" => {
                let val =
                    read_value_from_memory(memory, val_ptr as usize).map_err(|e| e.to_string())?;
                let Value::Number(n) = val else {
                    return Err("HTTP response 'status' must be Number".to_string());
                };
                let code = u16::try_from(n)
                    .map_err(|_| format!("Invalid HTTP status code number: {n}"))?;
                status = Some(code);
            }
            "headers" => {
                let val =
                    read_value_from_memory(memory, val_ptr as usize).map_err(|e| e.to_string())?;
                let Value::List(items) = val else {
                    return Err(
                        "HTTP response 'headers' must be List<{ name: String, value: String }>"
                            .to_string(),
                    );
                };
                let mut parsed_headers = Vec::with_capacity(items.len());
                for item in items {
                    let Value::Record(h_fields) = item else {
                        return Err(
                            "Each item in HTTP response 'headers' must be a Record".to_string()
                        );
                    };
                    let mut h_name: Option<String> = None;
                    let mut h_value: Option<String> = None;
                    for (hk, hv) in h_fields {
                        if hk == "name"
                            && let Value::String(s) = hv
                        {
                            h_name = Some(s);
                        } else if hk == "value"
                            && let Value::String(s) = hv
                        {
                            h_value = Some(s);
                        }
                    }
                    let (Some(name), Some(value)) = (h_name, h_value) else {
                        return Err(
                            "Header record must contain 'name: String' and 'value: String'"
                                .to_string(),
                        );
                    };
                    parsed_headers.push((name, value));
                }
                headers = Some(parsed_headers);
            }
            "body" => {
                body_ptr = Some(val_ptr as usize);
            }
            _ => {}
        }
    }

    let status = status.ok_or_else(|| "HTTP response is missing 'status' field".to_string())?;
    let headers = headers.ok_or_else(|| "HTTP response is missing 'headers' field".to_string())?;
    let body_ptr = body_ptr.ok_or_else(|| "HTTP response is missing 'body' field".to_string())?;

    let body_fields = read_record_field_ptrs(memory, body_ptr)?;
    let mut initial_state_ptr: Option<u32> = None;
    let mut next_closure_ptr: Option<usize> = None;
    for (b_key, b_val_ptr) in body_fields {
        match b_key.as_str() {
            "initialState" => initial_state_ptr = Some(b_val_ptr),
            "next" => next_closure_ptr = Some(b_val_ptr as usize),
            _ => {}
        }
    }

    let initial_state_ptr = initial_state_ptr
        .ok_or_else(|| "HTTP response 'body' is missing 'initialState' field".to_string())?;
    let next_closure_ptr = next_closure_ptr
        .ok_or_else(|| "HTTP response 'body' is missing 'next' function field".to_string())?;

    if next_closure_ptr + 12 > memory.len() || memory[next_closure_ptr] != 5 {
        return Err("HTTP response 'body.next' is not a closure function (tag 5)".to_string());
    }
    let table_idx_bytes: [u8; 4] = memory[next_closure_ptr + 4..next_closure_ptr + 8]
        .try_into()
        .map_err(|_| "Failed to read closure table_idx".to_string())?;
    let env_ptr_bytes: [u8; 4] = memory[next_closure_ptr + 8..next_closure_ptr + 12]
        .try_into()
        .map_err(|_| "Failed to read closure env_ptr".to_string())?;

    Ok(RawWasmHttpResponse {
        status,
        headers,
        initial_state_ptr,
        next_table_idx: u32::from_le_bytes(table_idx_bytes),
        next_env_ptr: i32::from_le_bytes(env_ptr_bytes),
    })
}

pub fn read_stream_step_from_memory(
    memory: &[u8],
    step_ptr: usize,
) -> Result<RawWasmStreamStep, String> {
    if step_ptr + 12 > memory.len() || memory[step_ptr] != 6 {
        return Err("Stream step must be a Variant (tag 6)".to_string());
    }
    let tag_ptr_bytes: [u8; 4] = memory[step_ptr + 4..step_ptr + 8]
        .try_into()
        .map_err(|_| "Failed to read step variant tag ptr".to_string())?;
    let tag_ptr = u32::from_le_bytes(tag_ptr_bytes) as usize;
    let tag_val = read_value_from_memory(memory, tag_ptr).map_err(|e| e.to_string())?;
    let Value::String(tag_str) = tag_val else {
        return Err("Stream step variant tag is not a string".to_string());
    };

    match tag_str.as_str() {
        "done" => Ok(RawWasmStreamStep::Done),
        "yield" => {
            let payload_ptr_bytes: [u8; 4] = memory[step_ptr + 8..step_ptr + 12]
                .try_into()
                .map_err(|_| "Failed to read step variant payload ptr".to_string())?;
            let payload_ptr = u32::from_le_bytes(payload_ptr_bytes) as usize;
            if payload_ptr == 0 {
                return Err("Stream step 'yield' variant requires a payload record".to_string());
            }
            let payload_fields = read_record_field_ptrs(memory, payload_ptr)?;
            let mut chunk_bytes: Option<Vec<u8>> = None;
            let mut next_state_ptr: Option<u32> = None;

            for (k, v_ptr) in payload_fields {
                match k.as_str() {
                    "chunk" => {
                        let chunk_val = read_value_from_memory(memory, v_ptr as usize)
                            .map_err(|e| e.to_string())?;
                        let Value::List(items) = chunk_val else {
                            return Err("Stream 'yield.chunk' must be List<Number>".to_string());
                        };
                        let mut bytes = Vec::with_capacity(items.len());
                        for item in items {
                            let Value::Number(b) = item else {
                                return Err(
                                    "Stream 'yield.chunk' element must be Number (0..=255)"
                                        .to_string(),
                                );
                            };
                            let byte = u8::try_from(b).map_err(|_| {
                                format!("Stream 'yield.chunk' byte out of range (0..=255): {b}")
                            })?;
                            bytes.push(byte);
                        }
                        chunk_bytes = Some(bytes);
                    }
                    "nextState" => {
                        next_state_ptr = Some(v_ptr);
                    }
                    _ => {}
                }
            }

            let chunk = chunk_bytes
                .ok_or_else(|| "Stream 'yield' payload is missing 'chunk'".to_string())?;
            let next_state_ptr = next_state_ptr
                .ok_or_else(|| "Stream 'yield' payload is missing 'nextState'".to_string())?;
            Ok(RawWasmStreamStep::Yield {
                chunk,
                next_state_ptr,
            })
        }
        other => Err(format!(
            "Unexpected stream step variant tag '{other}': expected 'yield' or 'done'"
        )),
    }
}

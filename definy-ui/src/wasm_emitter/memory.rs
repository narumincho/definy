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
        _ => Err("Unknown value tag in Wasm memory"),
    }
}

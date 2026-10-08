use super::memory::read_value_from_memory;
use crate::expression_eval::Value;

#[cfg(target_arch = "wasm32")]
pub fn execute_wasm(wasm_bytes: &[u8]) -> Result<Value, String> {
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

#[cfg(target_arch = "wasm32")]
fn format_js_error(context: &str, err: wasm_bindgen::JsValue) -> String {
    if let Ok(msg) = js_sys::Reflect::get(&err, &wasm_bindgen::JsValue::from_str("message")) {
        if let Some(msg_str) = msg.as_string() {
            return format!("{context}: {msg_str}");
        }
    }
    format!("{context}: {err:?}")
}

#[cfg(not(target_arch = "wasm32"))]
pub fn execute_wasm(wasm_bytes: &[u8]) -> Result<Value, String> {
    let mut config = wasmtime::Config::new();
    config.wasm_gc(true);

    let engine = wasmtime::Engine::new(&config).map_err(|e| format!("{e:?}"))?;
    let module = wasmtime::Module::new(&engine, wasm_bytes).map_err(|e| format!("{e:?}"))?;
    let mut store = wasmtime::Store::new(&engine, ());
    let instance =
        wasmtime::Instance::new(&mut store, &module, &[]).map_err(|e| format!("{e:?}"))?;

    // 1. evaluate() と memory エクスポートがある場合 (線形メモリモード)
    if let Some(eval_func) = instance.get_func(&mut store, "evaluate")
        && let Some(memory) = instance.get_memory(&mut store, "memory")
    {
        let mut results = [wasmtime::Val::I32(0)];
        eval_func
            .call(&mut store, &[], &mut results)
            .map_err(|e| e.to_string())?;
        let ret_ptr = match results[0] {
            wasmtime::Val::I32(ptr) => ptr as usize,
            _ => return Err("evaluate returned non-i32 pointer".into()),
        };
        let mem_data = memory.data(&store);
        return read_value_from_memory(mem_data, ret_ptr).map_err(|e| e.to_string());
    }

    // 2. evaluate() があり、memory がない場合 (WASM GC モード)
    if let Some(eval_func) = instance.get_func(&mut store, "evaluate") {
        let mut results = [wasmtime::Val::I32(0)];
        eval_func
            .call(&mut store, &[], &mut results)
            .map_err(|e| e.to_string())?;
        return read_value_from_gc(&mut store, &results[0]);
    }

    // 3. evaluate_gc() エクスポートがある場合
    if let Some(eval_gc_func) = instance.get_func(&mut store, "evaluate_gc") {
        let mut results = [wasmtime::Val::I32(0)];
        eval_gc_func
            .call(&mut store, &[], &mut results)
            .map_err(|e| e.to_string())?;
        return read_value_from_gc(&mut store, &results[0]);
    }

    // 4. main() エクスポートがある場合
    if let Some(main_func) = instance.get_func(&mut store, "main") {
        let mut results = [wasmtime::Val::I64(0)];
        main_func
            .call(&mut store, &[], &mut results)
            .map_err(|e| e.to_string())?;
        match &results[0] {
            wasmtime::Val::I64(n) => return Ok(Value::Number(*n)),
            wasmtime::Val::I32(n) => return Ok(Value::Number(*n as i64)),
            wasmtime::Val::AnyRef(_) => return read_value_from_gc(&mut store, &results[0]),
            _ => return Err("Unexpected return value from main()".into()),
        }
    }

    Err("Neither evaluate(), evaluate_gc() nor main() found in exports".into())
}

#[cfg(not(target_arch = "wasm32"))]
pub fn read_value_from_gc(
    store: &mut wasmtime::Store<()>,
    val: &wasmtime::Val,
) -> Result<Value, String> {
    match val {
        wasmtime::Val::I64(n) => Ok(Value::Number(*n)),
        wasmtime::Val::I32(n) => Ok(Value::Number(*n as i64)),
        wasmtime::Val::AnyRef(Some(anyref)) => {
            if let Ok(Some(s)) = anyref.as_struct(&*store) {
                // field 0: tag (i32)
                let tag_val = s.field(&mut *store, 0).map_err(|e| e.to_string())?;
                let tag = tag_val.i32().ok_or_else(|| "Tag must be i32".to_string())?;
                match tag {
                    0 => {
                        // Tag 0: Number (field 1: i64)
                        let num_val = s.field(&mut *store, 1).map_err(|e| e.to_string())?;
                        let n = num_val
                            .i64()
                            .ok_or_else(|| "Field 1 must be i64 for Number".to_string())?;
                        Ok(Value::Number(n))
                    }
                    1 => {
                        // Tag 1: Bool (field 1: i32)
                        let bool_val = s.field(&mut *store, 1).map_err(|e| e.to_string())?;
                        let b = bool_val
                            .i32()
                            .ok_or_else(|| "Field 1 must be i32 for Bool".to_string())?;
                        Ok(Value::Bool(b != 0))
                    }
                    2 => {
                        // Tag 2: String (field 1: ref array of i8/i32 bytes)
                        let byte_arr_val = s.field(&mut *store, 1).map_err(|e| e.to_string())?;
                        let byte_arr = match byte_arr_val {
                            wasmtime::Val::AnyRef(Some(ar)) => ar
                                .as_array(&*store)
                                .map_err(|e| e.to_string())?
                                .ok_or_else(|| "Expected array for String bytes".to_string())?,
                            _ => return Err("Expected AnyRef for String bytes".into()),
                        };
                        let len = byte_arr.len(&*store).map_err(|e| e.to_string())? as usize;
                        let mut bytes = Vec::with_capacity(len);
                        for i in 0..len {
                            let elem = byte_arr
                                .get(&mut *store, i as u32)
                                .map_err(|e| e.to_string())?;
                            bytes.push(
                                elem.i32().ok_or_else(|| "Byte must be i32".to_string())? as u8
                            );
                        }
                        let str_val = String::from_utf8(bytes).map_err(|e| e.to_string())?;
                        Ok(Value::String(str_val))
                    }
                    3 => {
                        // Tag 3: List (field 1: ref array of anyref values)
                        let list_arr_val = s.field(&mut *store, 1).map_err(|e| e.to_string())?;
                        let list_arr = match list_arr_val {
                            wasmtime::Val::AnyRef(Some(ar)) => ar
                                .as_array(&*store)
                                .map_err(|e| e.to_string())?
                                .ok_or_else(|| "Expected array for List".to_string())?,
                            _ => return Err("Expected AnyRef for List".into()),
                        };
                        let len = list_arr.len(&*store).map_err(|e| e.to_string())? as usize;
                        let mut items = Vec::with_capacity(len);
                        for i in 0..len {
                            let elem = list_arr
                                .get(&mut *store, i as u32)
                                .map_err(|e| e.to_string())?;
                            items.push(read_value_from_gc(store, &elem)?);
                        }
                        Ok(Value::List(items))
                    }
                    4 => {
                        // Tag 4: Record (field 1: ref array of RecordField structs)
                        let field_arr_val = s.field(&mut *store, 1).map_err(|e| e.to_string())?;
                        let field_arr = match field_arr_val {
                            wasmtime::Val::AnyRef(Some(ar)) => ar
                                .as_array(&*store)
                                .map_err(|e| e.to_string())?
                                .ok_or_else(|| "Expected array for Record fields".to_string())?,
                            _ => return Err("Expected AnyRef for Record fields".into()),
                        };
                        let len = field_arr.len(&*store).map_err(|e| e.to_string())? as usize;
                        let mut record_fields = Vec::with_capacity(len);
                        for i in 0..len {
                            let f_val = field_arr
                                .get(&mut *store, i as u32)
                                .map_err(|e| e.to_string())?;
                            let f_struct = match f_val {
                                wasmtime::Val::AnyRef(Some(ar)) => ar
                                    .as_struct(&*store)
                                    .map_err(|e| e.to_string())?
                                    .ok_or_else(|| "Expected struct for RecordField".to_string())?,
                                _ => return Err("Expected AnyRef for RecordField".into()),
                            };
                            let key_val =
                                f_struct.field(&mut *store, 0).map_err(|e| e.to_string())?;
                            let key = match read_value_from_gc(store, &key_val)? {
                                Value::String(str_k) => str_k,
                                _ => return Err("Record key must be String".into()),
                            };
                            let val_val =
                                f_struct.field(&mut *store, 1).map_err(|e| e.to_string())?;
                            let value = read_value_from_gc(store, &val_val)?;
                            record_fields.push((key, value));
                        }
                        Ok(Value::Record(record_fields))
                    }
                    5 => Ok(Value::Function),
                    6 => {
                        // Tag 6: Variant (field 1: String, field 2: anyref payload or null)
                        let tag_str_val = s.field(&mut *store, 1).map_err(|e| e.to_string())?;
                        let tag_name = match read_value_from_gc(store, &tag_str_val)? {
                            Value::String(str_t) => str_t,
                            _ => return Err("Variant tag must be String".into()),
                        };
                        let payload_val = s.field(&mut *store, 2).map_err(|e| e.to_string())?;
                        let payload = match payload_val {
                            wasmtime::Val::AnyRef(None) => None,
                            val => Some(Box::new(read_value_from_gc(store, &val)?)),
                        };
                        Ok(Value::Variant {
                            tag: tag_name,
                            payload,
                        })
                    }
                    other => Err(format!("Unknown GC value tag: {other}")),
                }
            } else if let Ok(Some(arr)) = anyref.as_array(&*store) {
                let len = arr.len(&*store).map_err(|e| e.to_string())? as usize;
                let mut items = Vec::with_capacity(len);
                for i in 0..len {
                    let elem = arr.get(&mut *store, i as u32).map_err(|e| e.to_string())?;
                    items.push(read_value_from_gc(store, &elem)?);
                }
                Ok(Value::List(items))
            } else {
                Err("AnyRef is neither struct nor array".into())
            }
        }
        wasmtime::Val::AnyRef(None) => Err("Null reference encountered".into()),
        other => Err(format!("Unsupported Val: {other:?}")),
    }
}

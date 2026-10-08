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

    // 2. main() エクスポートがある場合 (直接 i64 / i32 を返す場合)
    if let Some(main_func) = instance.get_func(&mut store, "main") {
        let mut results = [wasmtime::Val::I64(0)];
        main_func
            .call(&mut store, &[], &mut results)
            .map_err(|e| e.to_string())?;
        match results[0] {
            wasmtime::Val::I64(n) => return Ok(Value::Number(n)),
            wasmtime::Val::I32(n) => return Ok(Value::Number(n as i64)),
            _ => return Err("Unexpected return value from main()".into()),
        }
    }

    Err("Neither evaluate() with memory nor main() found in exports".into())
}

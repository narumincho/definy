//! Wasm にした definy 製コンパイラ (`core.compile-to-wasm` をコンパイルしたモジュール) を wasmtime で直接動かす.
//!
//! definy 製コンパイラが `core.compile-to-wasm` への参照をコンパイルすると, `evaluate` がその関数のクロージャを返す
//! モジュールになる. 入力 (コンパイルする式の `core.expression` と, 参照するパーツ) をモジュールのメモリに
//! 値の箱として書き, 関数表からクロージャを呼ぶと, 出力の Wasm のバイト列 (`list<number>`) が返る.
//! Rust 製の評価器で definy 製コンパイラを毎回コンパイルして動かすより速い.

use definy_event::event::Expression;

use crate::expression_eval::Value;

/// コンパイル済みの definy 製コンパイラ
pub struct CompilerModule {
    engine: wasmtime::Engine,
    module: wasmtime::Module,
}

impl CompilerModule {
    pub fn new(wasm: &[u8]) -> Result<Self, String> {
        let engine = wasmtime::Engine::default();
        let module = wasmtime::Module::new(&engine, wasm).map_err(|e| e.to_string())?;
        Ok(Self { engine, module })
    }

    /// `core.compile-to-wasm(expr, parts)` を実行する.
    /// `expr` は `core.expression` の値を表すリテラルの式 (`expression_to_self_hosted_ast` の結果),
    /// `parts` は `{ id, expression }` のリストのリテラルの式
    pub fn compile(&self, expr: &Expression, parts: &Expression) -> Result<Vec<u8>, String> {
        let mut store = wasmtime::Store::new(&self.engine, ());
        let instance =
            wasmtime::Instance::new(&mut store, &self.module, &[]).map_err(|e| e.to_string())?;
        let evaluate = instance
            .get_typed_func::<(), i32>(&mut store, "evaluate")
            .map_err(|e| e.to_string())?;
        let alloc = instance
            .get_typed_func::<i32, i32>(&mut store, "alloc")
            .map_err(|e| e.to_string())?;
        let memory = instance
            .get_memory(&mut store, "memory")
            .ok_or("memory is not exported")?;
        let table = instance
            .get_table(&mut store, "table")
            .ok_or("table is not exported")?;

        let closure = evaluate.call(&mut store, ()).map_err(|e| e.to_string())? as usize;
        let (table_index, env) = {
            let data = memory.data(&store);
            if data.get(closure) != Some(&5) {
                return Err("evaluate did not return a function".into());
            }
            (read_u32(data, closure + 4)?, read_u32(data, closure + 8)?)
        };

        let expr_ptr = write_literal(&mut store, &memory, &alloc, expr)?;
        let parts_ptr = write_literal(&mut store, &memory, &alloc, parts)?;
        let args = alloc.call(&mut store, 8).map_err(|e| e.to_string())?;
        let mut args_bytes = expr_ptr.to_le_bytes().to_vec();
        args_bytes.extend_from_slice(&parts_ptr.to_le_bytes());
        memory
            .write(&mut store, args as usize, &args_bytes)
            .map_err(|e| e.to_string())?;

        let function = table
            .get(&mut store, u64::from(table_index))
            .and_then(|item| item.as_func().flatten().cloned())
            .ok_or("function is not in the table")?
            .typed::<(i32, i32), i32>(&store)
            .map_err(|e| e.to_string())?;
        let result = function
            .call(&mut store, (env as i32, args))
            .map_err(|e| e.to_string())?;

        match crate::wasm_emitter::read_value_from_memory(memory.data(&store), result as usize)
            .map_err(|e| e.to_string())?
        {
            Value::List(items) => items
                .into_iter()
                .map(|item| match item {
                    Value::Number(n) => u8::try_from(n).map_err(|_| format!("invalid byte {n}")),
                    other => Err(format!("expected byte, got {other:?}")),
                })
                .collect(),
            other => Err(format!("expected list of bytes, got {other:?}")),
        }
    }
}

fn read_u32(data: &[u8], at: usize) -> Result<u32, String> {
    data.get(at..at + 4)
        .and_then(|bytes| bytes.try_into().ok())
        .map(u32::from_le_bytes)
        .ok_or_else(|| "out of bounds".to_string())
}

/// リテラルの式を, Rust 製コンパイラと同じ形の値の箱としてメモリに書き, そのポインタを返す.
/// 先に大きさを測ってから 1 回で確保する
fn write_literal(
    store: &mut wasmtime::Store<()>,
    memory: &wasmtime::Memory,
    alloc: &wasmtime::TypedFunc<i32, i32>,
    expression: &Expression,
) -> Result<i32, String> {
    let mut sizing = Vec::new();
    layout(expression, 0, &mut sizing)?;
    let base = alloc
        .call(&mut *store, sizing.len() as i32)
        .map_err(|e| e.to_string())? as u32;
    let mut bytes = Vec::new();
    let ptr = layout(expression, base, &mut bytes)?;
    memory
        .write(store, base as usize, &bytes)
        .map_err(|e| e.to_string())?;
    Ok(ptr as i32)
}

/// 箱を `buffer` の後ろに 8 バイト境界で足し, そのアドレス (`base` からの位置) を返す.
/// 子の箱を先に書き, 親の箱に子のアドレスを入れる
fn layout(expression: &Expression, base: u32, buffer: &mut Vec<u8>) -> Result<u32, String> {
    fn push(buffer: &mut Vec<u8>, base: u32, bytes: &[u8]) -> u32 {
        let ptr = base + buffer.len() as u32;
        buffer.extend_from_slice(bytes);
        buffer.resize(buffer.len().next_multiple_of(8), 0);
        ptr
    }
    fn string(buffer: &mut Vec<u8>, base: u32, value: &str) -> u32 {
        let mut bytes = vec![2, 0, 0, 0];
        bytes.extend_from_slice(&(value.len() as u32).to_le_bytes());
        bytes.extend_from_slice(value.as_bytes());
        push(buffer, base, &bytes)
    }
    Ok(match expression {
        Expression::Number(number) => {
            let mut bytes = vec![0; 8];
            bytes.extend_from_slice(&number.value.to_le_bytes());
            push(buffer, base, &bytes)
        }
        Expression::Boolean(boolean) => push(
            buffer,
            base,
            &[1, 0, 0, 0, 0, 0, 0, 0, u8::from(boolean.value)],
        ),
        Expression::String(value) => string(buffer, base, &value.value),
        Expression::ListLiteral(list) => {
            let items = list
                .items
                .iter()
                .map(|item| layout(item, base, buffer))
                .collect::<Result<Vec<_>, _>>()?;
            let mut bytes = vec![3, 0, 0, 0];
            bytes.extend_from_slice(&(items.len() as u32).to_le_bytes());
            for item in items {
                bytes.extend_from_slice(&item.to_le_bytes());
            }
            push(buffer, base, &bytes)
        }
        Expression::TypeLiteral(record) => {
            let fields = record
                .items
                .iter()
                .map(|item| {
                    Ok((
                        string(buffer, base, &item.key),
                        layout(&item.value, base, buffer)?,
                    ))
                })
                .collect::<Result<Vec<_>, String>>()?;
            let mut bytes = vec![4, 0, 0, 0];
            bytes.extend_from_slice(&(fields.len() as u32).to_le_bytes());
            for (key, value) in fields {
                bytes.extend_from_slice(&key.to_le_bytes());
                bytes.extend_from_slice(&value.to_le_bytes());
            }
            push(buffer, base, &bytes)
        }
        Expression::Variant(variant) => {
            let tag = string(buffer, base, &variant.tag);
            let payload = match &variant.payload {
                Some(payload) => layout(payload, base, buffer)?,
                None => 0,
            };
            let mut bytes = vec![6, 0, 0, 0];
            bytes.extend_from_slice(&tag.to_le_bytes());
            bytes.extend_from_slice(&payload.to_le_bytes());
            push(buffer, base, &bytes)
        }
        other => return Err(format!("not a literal value: {other:?}")),
    })
}

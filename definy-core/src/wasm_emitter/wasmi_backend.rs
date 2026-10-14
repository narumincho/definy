//! Rust 製 Wasm インタプリタ [wasmi](https://github.com/wasmi-labs/wasmi) による実行バックエンド。
//!
//! Cloudflare Workers は実行時に生成した Wasm バイト列をコンパイルできない（事前に
//! アップロードしたモジュールしか実行できない）ため、`compile_expression_to_wasm` が生成した
//! Wasm を Worker 内で動かすにはインタプリタが必要になる。このモジュールは wasmtime 版
//! （`executor.rs`）と同じ線形メモリ ABI を wasmi で実行する。
//!
//! ネイティブでもビルドできるので、適合テストで wasmtime 版と結果を突き合わせられる。

use super::memory::{
    RawWasmStreamStep, read_http_response_and_stream_ptrs, read_stream_step_from_memory,
    read_value_from_memory,
};
use crate::expression_eval::Value;

/// ストリームの `next(state)` を呼ぶ回数の上限
const MAX_STREAM_STEPS: usize = 10_000;

/// クロージャ呼び出しの引数を置く線形メモリ上の位置（wasmtime 版と同じ）
const ARGS_SCRATCH_OFFSET: usize = 512;

fn instantiate(wasm_bytes: &[u8]) -> Result<(wasmi::Store<()>, wasmi::Instance), String> {
    let engine = wasmi::Engine::default();
    let module = wasmi::Module::new(&engine, wasm_bytes).map_err(|e| e.to_string())?;
    let mut store = wasmi::Store::new(&engine, ());
    let linker = <wasmi::Linker<()>>::new(&engine);
    let instance = linker
        .instantiate_and_start(&mut store, &module)
        .map_err(|e| e.to_string())?;
    Ok((store, instance))
}

/// 線形メモリモードの Wasm（`evaluate` と `memory` をエクスポート）を実行して値を返します。
pub fn execute_wasm(wasm_bytes: &[u8]) -> Result<Value, String> {
    let (mut store, instance) = instantiate(wasm_bytes)?;

    if let Some(eval_func) = instance.get_func(&store, "evaluate")
        && let Some(memory) = instance.get_memory(&store, "memory")
    {
        let mut results = [wasmi::Val::I32(0)];
        eval_func
            .call(&mut store, &[], &mut results)
            .map_err(|e| e.to_string())?;
        let ret_ptr = results[0]
            .i32()
            .ok_or_else(|| "evaluate returned non-i32 pointer".to_string())?
            as u32 as usize;
        return read_value_from_memory(memory.data(&store), ret_ptr).map_err(|e| e.to_string());
    }

    if let Some(main_func) = instance.get_func(&store, "main") {
        let mut results = [wasmi::Val::I64(0)];
        main_func
            .call(&mut store, &[], &mut results)
            .map_err(|e| e.to_string())?;
        return match results[0] {
            wasmi::Val::I64(n) => Ok(Value::Number(n)),
            wasmi::Val::I32(n) => Ok(Value::Number(i64::from(n))),
            _ => Err("Unexpected return value from main()".into()),
        };
    }

    Err("Neither evaluate() with memory nor main() found in exports (Wasm GC is not supported by the wasmi backend)".into())
}

/// wasmi で実行中の HTTP レスポンス。
pub struct WasmiHttpResponse {
    pub status: u16,
    pub headers: Vec<(String, String)>,
    pub body_stream: WasmiPullStream,
}

/// レスポンス本文の Pull 型ストリーム（`body.next(state)` を必要なときに呼ぶ）。
pub struct WasmiPullStream {
    store: wasmi::Store<()>,
    memory: wasmi::Memory,
    next_func: wasmi::Func,
    env_ptr: i32,
    state_ptr: u32,
    done: bool,
    remaining_steps: usize,
}

impl WasmiPullStream {
    /// `body.next(state)` を呼び、空でない次のチャンクを返します。終わりなら `None`。
    pub fn pull_next_chunk(&mut self) -> Result<Option<Vec<u8>>, String> {
        while !self.done {
            if self.remaining_steps == 0 {
                return Err(format!(
                    "Stream exceeded maximum allowed pull steps ({MAX_STREAM_STEPS})"
                ));
            }
            self.remaining_steps -= 1;

            {
                let mem_mut = self.memory.data_mut(&mut self.store);
                if ARGS_SCRATCH_OFFSET + 8 > mem_mut.len() {
                    return Err("Wasm memory too small for closure call scratch".to_string());
                }
                mem_mut[ARGS_SCRATCH_OFFSET..ARGS_SCRATCH_OFFSET + 4]
                    .copy_from_slice(&self.state_ptr.to_le_bytes());
            }

            let mut results = [wasmi::Val::I32(0)];
            self.next_func
                .call(
                    &mut self.store,
                    &[
                        wasmi::Val::I32(self.env_ptr),
                        wasmi::Val::I32(ARGS_SCRATCH_OFFSET as i32),
                    ],
                    &mut results,
                )
                .map_err(|e| format!("Failed to invoke stream next(state) closure: {e}"))?;
            let step_ptr = results[0]
                .i32()
                .ok_or_else(|| "Stream next(state) closure returned non-i32 pointer".to_string())?
                as u32 as usize;

            match read_stream_step_from_memory(self.memory.data(&self.store), step_ptr)? {
                RawWasmStreamStep::Done => {
                    self.done = true;
                    return Ok(None);
                }
                RawWasmStreamStep::Yield {
                    chunk,
                    next_state_ptr,
                } => {
                    self.state_ptr = next_state_ptr;
                    if !chunk.is_empty() {
                        return Ok(Some(chunk));
                    }
                }
            }
        }
        Ok(None)
    }

    /// 残りのチャンクをすべて読み、1 つのバイト列にまとめます。
    pub fn collect_all_bytes(&mut self) -> Result<Vec<u8>, String> {
        let mut all = Vec::new();
        while let Some(chunk) = self.pull_next_chunk()? {
            all.extend_from_slice(&chunk);
        }
        Ok(all)
    }
}

/// HTTP レスポンス値を返す Wasm を実行し、ステータス・ヘッダーと本文ストリームを返します。
pub fn execute_wasm_http_response(wasm_bytes: &[u8]) -> Result<WasmiHttpResponse, String> {
    let (mut store, instance) = instantiate(wasm_bytes)?;

    let eval_func = instance
        .get_func(&store, "evaluate")
        .ok_or_else(|| "Wasm module is missing 'evaluate' export".to_string())?;
    let memory = instance
        .get_memory(&store, "memory")
        .ok_or_else(|| "Wasm module is missing 'memory' export".to_string())?;
    let table = instance
        .get_table(&store, "table")
        .ok_or_else(|| "Wasm module is missing 'table' export".to_string())?;

    let mut results = [wasmi::Val::I32(0)];
    eval_func
        .call(&mut store, &[], &mut results)
        .map_err(|e| e.to_string())?;
    let ret_ptr = results[0]
        .i32()
        .ok_or_else(|| "evaluate returned non-i32 pointer".to_string())? as u32
        as usize;

    let raw_http = read_http_response_and_stream_ptrs(memory.data(&store), ret_ptr)?;

    let table_elem = table
        .get(&store, u64::from(raw_http.next_table_idx))
        .ok_or_else(|| {
            format!(
                "Closure table index {} out of bounds in Wasm table",
                raw_http.next_table_idx
            )
        })?;
    let next_func = table_elem
        .funcref()
        .and_then(|func_ref| func_ref.val().map(|func| **func))
        .ok_or_else(|| "Closure table entry is null".to_string())?;

    Ok(WasmiHttpResponse {
        status: raw_http.status,
        headers: raw_http.headers,
        body_stream: WasmiPullStream {
            store,
            memory,
            next_func,
            env_ptr: raw_http.next_env_ptr,
            state_ptr: raw_http.initial_state_ptr,
            done: false,
            remaining_steps: MAX_STREAM_STEPS,
        },
    })
}

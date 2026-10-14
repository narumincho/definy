pub mod adt_ops;
pub mod bytecode;
pub mod compiler;
pub mod executor;
pub mod function_ops;
pub mod gc_compiler;
pub mod gc_ops;
pub mod gc_runtime;
pub mod list_ops;
pub mod memory;
pub mod module_builder;
pub mod record_ops;
pub mod string_ops;

#[cfg(test)]
mod gc_compiler_tests;
#[cfg(test)]
mod tests;

pub use bytecode::{encode_i32_sleb128, encode_u32_leb128};
pub use compiler::compile_expression_to_wasm;
pub use executor::execute_wasm;
#[cfg(not(target_arch = "wasm32"))]
pub use executor::{EvaluatedHttpResponse, WasmPullStream, execute_wasm_http_response};
pub use memory::{
    RawWasmHttpResponse, RawWasmStreamStep, read_http_response_and_stream_ptrs,
    read_stream_step_from_memory, read_value_from_memory,
};

pub mod bytecode;
pub mod compiler;
pub mod function_ops;
pub mod list_ops;
pub mod memory;
pub mod string_ops;
pub mod vm;

#[cfg(test)]
mod tests;

pub use bytecode::{encode_i32_sleb128, encode_u32_leb128};
pub use compiler::compile_expression_to_wasm;
pub use memory::read_value_from_memory;
pub use vm::{execute_wasm, execute_wasm_in_vm};

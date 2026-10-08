pub mod adt_ops;
pub mod bytecode;
pub mod compiler;
pub mod executor;
pub mod function_ops;
pub mod gc_compiler;
pub mod gc_ops;
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
pub use memory::read_value_from_memory;

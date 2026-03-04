use definy_event::event::{
    AddExpression, BooleanExpression, EqualExpression, Expression, IfExpression, NumberExpression,
};

// Minimal Wasm Module builder
// A Wasm module is constructed of parts called sections.
// Here we support Type, Function, Export, and Code sections.

const WASM_MAGIC: [u8; 4] = [0x00, 0x61, 0x73, 0x6d];
const WASM_VERSION: [u8; 4] = [0x01, 0x00, 0x00, 0x00];

// Section IDs
const TYPE_SECTION: u8 = 1;
const FUNCTION_SECTION: u8 = 3;
const EXPORT_SECTION: u8 = 7;
const CODE_SECTION: u8 = 10;

// ValTypes
const I64: u8 = 0x7E;

// Opcodes
const I64_CONST: u8 = 0x42;
const I64_ADD: u8 = 0x7C;
const I64_EQ: u8 = 0x51;

const I32_WRAP_I64: u8 = 0xA7;
const IF: u8 = 0x04;
const ELSE: u8 = 0x05;
const END: u8 = 0x0B;
const BLOCK_TYPE_I64: u8 = 0x7E;

pub fn compile_expression_to_wasm(expression: &Expression) -> Result<Vec<u8>, String> {
    let mut code_bytes = Vec::new();
    emit_expression(expression, &mut code_bytes)?;
    code_bytes.push(END);

    let mut module = Vec::new();
    module.extend_from_slice(&WASM_MAGIC);
    module.extend_from_slice(&WASM_VERSION);

    // Type Section (1 type: () -> i64)
    let mut type_section = Vec::new();
    type_section.push(1); // 1 type
    type_section.push(0x60); // func type
    type_section.push(0); // 0 params
    type_section.push(1); // 1 result
    type_section.push(I64); // result: i64
    emit_section(&mut module, TYPE_SECTION, &type_section);

    // Function Section (1 function of type index 0)
    let mut function_section = Vec::new();
    function_section.push(1); // 1 function
    function_section.push(0); // type index 0
    emit_section(&mut module, FUNCTION_SECTION, &function_section);

    // Export Section (Export function 0 as "evaluate")
    let mut export_section = Vec::new();
    export_section.push(1); // 1 export
    let export_name = "evaluate".as_bytes();
    export_section.push(export_name.len() as u8);
    export_section.extend_from_slice(export_name);
    export_section.push(0x00); // export kind: function
    export_section.push(0); // function index 0
    emit_section(&mut module, EXPORT_SECTION, &export_section);

    // Code Section
    let mut code_section = Vec::new();
    code_section.push(1); // 1 function body

    // Function body size and locals
    let mut func_body = Vec::new();
    func_body.push(0); // 0 local declarations

    // Append instructions
    func_body.extend_from_slice(&code_bytes);

    // Write function body size as LEB128 followed by function body
    encode_u32_leb128(&mut code_section, func_body.len() as u32);
    code_section.extend_from_slice(&func_body);

    emit_section(&mut module, CODE_SECTION, &code_section);

    Ok(module)
}

fn emit_section(module: &mut Vec<u8>, section_id: u8, data: &[u8]) {
    module.push(section_id);
    encode_u32_leb128(module, data.len() as u32);
    module.extend_from_slice(data);
}

fn emit_expression(expression: &Expression, out: &mut Vec<u8>) -> Result<(), String> {
    match expression {
        Expression::Number(NumberExpression { value }) => {
            out.push(I64_CONST);
            encode_i64_sleb128(out, *value);
        }
        Expression::Boolean(BooleanExpression { value }) => {
            out.push(I64_CONST);
            encode_i64_sleb128(out, if *value { 1 } else { 0 });
        }
        Expression::Add(AddExpression { left, right }) => {
            emit_expression(left, out)?;
            emit_expression(right, out)?;
            out.push(I64_ADD);
        }
        Expression::Equal(EqualExpression { left, right }) => {
            emit_expression(left, out)?;
            emit_expression(right, out)?;
            out.push(I64_EQ);
            // I64_EQ returns i32, but our types use i64 everywhere, so we need to extend the i32 back to i64
            // Wasm 1.0 doesn't have i64.extend_i32_s/u natively unless we do it directly: we can do i64.extend_i32_u
            // Actually i64.extend_i32_u opcode is 0xAD
            out.push(0xAD);
        }
        Expression::If(IfExpression {
            condition,
            then_expr,
            else_expr,
        }) => {
            // Evaluate condition
            emit_expression(condition, out)?;
            // condition must be i32 for `if`, so we wrap i64 to i32
            out.push(I32_WRAP_I64);

            out.push(IF);
            out.push(BLOCK_TYPE_I64); // result type of the if block

            emit_expression(then_expr, out)?;

            out.push(ELSE);

            emit_expression(else_expr, out)?;

            out.push(END);
        }
        Expression::PartReference(_) => {
            return Err(
                "Wasm compilation of Part References not yet supported without context/imports."
                    .into(),
            );
        }
    }
    Ok(())
}

fn encode_u32_leb128(out: &mut Vec<u8>, mut value: u32) {
    loop {
        let mut byte = (value & 0x7F) as u8;
        value >>= 7;
        if value != 0 {
            byte |= 0x80;
        }
        out.push(byte);
        if value == 0 {
            break;
        }
    }
}

fn encode_i64_sleb128(out: &mut Vec<u8>, mut value: i64) {
    let mut more = true;
    while more {
        let mut byte = (value & 0x7F) as u8;
        value >>= 7;
        let sign_bit = (byte & 0x40) != 0;

        if (value == 0 && !sign_bit) || (value == -1 && sign_bit) {
            more = false;
        } else {
            byte |= 0x80;
        }
        out.push(byte);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_leb128() {
        let mut out = Vec::new();
        encode_u32_leb128(&mut out, 624485);
        assert_eq!(out, vec![0xE5, 0x8E, 0x26]);

        let mut out = Vec::new();
        encode_i64_sleb128(&mut out, -123456);
        assert_eq!(out, vec![0xC0, 0xBB, 0x78]);
    }

    #[test]
    fn test_compile_basic() {
        let expr = Expression::Number(NumberExpression { value: 42 });
        let bytes = compile_expression_to_wasm(&expr).unwrap();
        assert!(bytes.starts_with(&[0x00, 0x61, 0x73, 0x6d]));
    }
}

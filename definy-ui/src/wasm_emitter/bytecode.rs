// Minimal Wasm Module builder
pub const WASM_MAGIC: [u8; 4] = [0x00, 0x61, 0x73, 0x6d];
pub const WASM_VERSION: [u8; 4] = [0x01, 0x00, 0x00, 0x00];

// Section IDs
pub const TYPE_SECTION: u8 = 1;
pub const FUNCTION_SECTION: u8 = 3;
pub const MEMORY_SECTION: u8 = 5;
pub const GLOBAL_SECTION: u8 = 6;
pub const EXPORT_SECTION: u8 = 7;
pub const CODE_SECTION: u8 = 10;
pub const DATA_SECTION: u8 = 11;

// ValTypes
pub const I32: u8 = 0x7F;

// Opcodes
pub const BLOCK: u8 = 0x02;
pub const LOOP: u8 = 0x03;
pub const IF: u8 = 0x04;
pub const ELSE: u8 = 0x05;
pub const END: u8 = 0x0B;
pub const BR: u8 = 0x0C;
pub const BR_IF: u8 = 0x0D;
pub const LOCAL_GET: u8 = 0x20;
pub const LOCAL_SET: u8 = 0x21;
pub const LOCAL_TEE: u8 = 0x22;
pub const GLOBAL_GET: u8 = 0x23;
pub const GLOBAL_SET: u8 = 0x24;
pub const I32_LOAD: u8 = 0x28;
pub const I64_LOAD: u8 = 0x29;
pub const I32_LOAD8_U: u8 = 0x2D;
pub const I32_STORE: u8 = 0x36;
pub const I64_STORE: u8 = 0x37;
pub const I32_STORE8: u8 = 0x3A;
pub const I32_CONST: u8 = 0x41;
pub const I64_CONST: u8 = 0x42;
pub const I32_EQZ: u8 = 0x45;
pub const I32_EQ: u8 = 0x46;
pub const I32_NE: u8 = 0x47;
pub const I32_LT_S: u8 = 0x48;
pub const I32_GT_S: u8 = 0x4A;
pub const I32_LE_S: u8 = 0x4C;
pub const I32_GE_S: u8 = 0x4E;
pub const I64_EQZ: u8 = 0x50;
pub const I64_EQ: u8 = 0x51;
pub const I64_NE: u8 = 0x52;
pub const I64_LT_S: u8 = 0x53;
pub const I64_GT_S: u8 = 0x55;
pub const I64_LE_S: u8 = 0x54;
pub const I64_GE_S: u8 = 0x56;
pub const I32_ADD: u8 = 0x6A;
pub const I32_SUB: u8 = 0x6B;
pub const I32_MUL: u8 = 0x6C;
pub const I32_AND: u8 = 0x71;
pub const I64_ADD: u8 = 0x7C;
pub const I64_SUB: u8 = 0x7D;
pub const I64_MUL: u8 = 0x7E;
pub const I64_DIV_S: u8 = 0x7F;
pub const I64_REM_S: u8 = 0x81;
pub const I32_WRAP_I64: u8 = 0xA7;
pub const I64_EXTEND_I32_U: u8 = 0xAD;

pub const BLOCK_TYPE_EMPTY: u8 = 0x40;
pub const BLOCK_TYPE_I32: u8 = 0x7F;

// Value tag definitions in Wasm memory:
// Tag 0 = Number:  [tag: u8, padding: 7 bytes, val: i64 (8 bytes)] => total 16 bytes
// Tag 1 = Bool:    [tag: u8, padding: 7 bytes, val: u8 (1 byte)]   => total 16 bytes
// Tag 2 = String:  [tag: u8, padding: 3 bytes, len: u32 (4 bytes), utf8_bytes...]
// Tag 3 = List:    [tag: u8, padding: 3 bytes, len: u32 (4 bytes), elem_ptrs: [i32; len]]
// Tag 4 = Record:  [tag: u8, padding: 3 bytes, len: u32 (4 bytes), items: [(key_len: u32, key_bytes, val_ptr: i32)]]

pub const HEAP_START_OFFSET: u32 = 65536; // 64KB static data area, dynamic heap starts above

pub fn emit_section(module: &mut Vec<u8>, section_id: u8, data: &[u8]) {
    module.push(section_id);
    encode_u32_leb128(module, data.len() as u32);
    module.extend_from_slice(data);
}

pub fn encode_mem_arg(out: &mut Vec<u8>, align: u32, offset: u32) {
    encode_u32_leb128(out, align);
    encode_u32_leb128(out, offset);
}

pub fn encode_u32_leb128(out: &mut Vec<u8>, mut value: u32) {
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

pub fn encode_i32_sleb128(out: &mut Vec<u8>, mut value: i32) {
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

pub fn read_u32_leb128(bytes: &[u8]) -> Result<(u32, usize), &'static str> {
    let mut result = 0u32;
    let mut shift = 0;
    let mut count = 0;
    for &byte in bytes {
        count += 1;
        result |= ((byte & 0x7F) as u32) << shift;
        if (byte & 0x80) == 0 {
            return Ok((result, count));
        }
        shift += 7;
        if shift > 35 {
            return Err("LEB128 overflow");
        }
    }
    Err("Unexpected EOF in LEB128")
}

pub fn read_i32_sleb128(bytes: &[u8]) -> Result<(i32, usize), &'static str> {
    let mut result = 0i32;
    let mut shift = 0;
    let mut count = 0;
    for &byte in bytes {
        count += 1;
        result |= ((byte & 0x7F) as i32) << shift;
        shift += 7;
        if (byte & 0x80) == 0 {
            if shift < 32 && (byte & 0x40) != 0 {
                result |= !0 << shift;
            }
            return Ok((result, count));
        }
        if shift > 35 {
            return Err("SLEB128 overflow");
        }
    }
    Err("Unexpected EOF in SLEB128")
}

pub fn read_i64_sleb128(bytes: &[u8]) -> Result<(i64, usize), &'static str> {
    let mut result = 0i64;
    let mut shift = 0;
    let mut count = 0;
    for &byte in bytes {
        count += 1;
        result |= ((byte & 0x7F) as i64) << shift;
        shift += 7;
        if (byte & 0x80) == 0 {
            if shift < 64 && (byte & 0x40) != 0 {
                result |= !0 << shift;
            }
            return Ok((result, count));
        }
        if shift > 70 {
            return Err("SLEB128 overflow");
        }
    }
    Err("Unexpected EOF in SLEB128")
}

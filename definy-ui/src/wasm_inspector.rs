use base64::Engine;
use dioxus::prelude::*;

#[derive(Debug, Clone, PartialEq)]
pub struct WasmInspection {
    pub total_bytes: usize,
    pub version: u32,
    pub sections: Vec<WasmSectionInfo>,
    pub hex_dump: String,
    pub download_data_url: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct WasmSectionInfo {
    pub id: u8,
    pub name: &'static str,
    pub offset: usize,
    pub size: usize,
    pub item_count: Option<usize>,
    pub summary: String,
}

pub fn inspect_wasm_binary(wasm_bytes: &[u8]) -> Result<WasmInspection, String> {
    if wasm_bytes.len() < 8 {
        return Err("Binary too small for WebAssembly (less than 8 bytes)".into());
    }
    if &wasm_bytes[0..4] != b"\0asm" {
        return Err("Invalid WebAssembly magic number (expected \\0asm)".into());
    }
    let version = u32::from_le_bytes(wasm_bytes[4..8].try_into().unwrap());

    let mut sections = Vec::new();
    let mut pos = 8;

    while pos < wasm_bytes.len() {
        let section_id = wasm_bytes[pos];
        let section_offset = pos;
        pos += 1;

        let (section_len, len_bytes) = read_u32_leb128(&wasm_bytes[pos..])
            .ok_or_else(|| "Failed to read section length LEB128".to_string())?;
        pos += len_bytes;

        let section_name = match section_id {
            0 => "Custom",
            1 => "Type",
            2 => "Import",
            3 => "Function",
            4 => "Table",
            5 => "Memory",
            6 => "Global",
            7 => "Export",
            8 => "Start",
            9 => "Element",
            10 => "Code",
            11 => "Data",
            12 => "DataCount",
            _ => "Unknown",
        };

        let section_data_start = pos;
        let section_data_end = (section_data_start + section_len as usize).min(wasm_bytes.len());
        let section_data = &wasm_bytes[section_data_start..section_data_end];

        let (item_count, summary) = parse_section_summary(section_id, section_data);

        sections.push(WasmSectionInfo {
            id: section_id,
            name: section_name,
            offset: section_offset,
            size: (pos - section_offset) + section_len as usize,
            item_count,
            summary,
        });

        pos = section_data_end;
    }

    let hex_dump = generate_hex_dump(wasm_bytes, 1024);
    let base64_encoded = base64::engine::general_purpose::STANDARD.encode(wasm_bytes);
    let download_data_url = format!("data:application/wasm;base64,{}", base64_encoded);

    Ok(WasmInspection {
        total_bytes: wasm_bytes.len(),
        version,
        sections,
        hex_dump,
        download_data_url,
    })
}

fn read_u32_leb128(bytes: &[u8]) -> Option<(u32, usize)> {
    let mut result = 0u32;
    let mut shift = 0;
    for (i, &byte) in bytes.iter().enumerate() {
        result |= ((byte & 0x7f) as u32) << shift;
        if (byte & 0x80) == 0 {
            return Some((result, i + 1));
        }
        shift += 7;
        if shift >= 35 {
            return None;
        }
    }
    None
}

fn parse_section_summary(id: u8, data: &[u8]) -> (Option<usize>, String) {
    if data.is_empty() {
        return (None, "Empty section".into());
    }
    match id {
        1 => {
            // Type section: vector of function types
            if let Some((count, _offset)) = read_u32_leb128(data) {
                (
                    Some(count as usize),
                    format!("{} function type signature(s)", count),
                )
            } else {
                (None, "Function types".into())
            }
        }
        3 => {
            // Function section: vector of type indices
            if let Some((count, _)) = read_u32_leb128(data) {
                (
                    Some(count as usize),
                    format!("{} function declaration(s)", count),
                )
            } else {
                (None, "Functions".into())
            }
        }
        4 => {
            // Table section
            if let Some((count, _)) = read_u32_leb128(data) {
                (
                    Some(count as usize),
                    format!("{} table definition(s)", count),
                )
            } else {
                (None, "Table".into())
            }
        }
        5 => {
            // Memory section
            if let Some((count, _)) = read_u32_leb128(data) {
                (Some(count as usize), format!("{} linear memory(s)", count))
            } else {
                (None, "Linear memory".into())
            }
        }
        6 => {
            // Global section
            if let Some((count, _)) = read_u32_leb128(data) {
                (
                    Some(count as usize),
                    format!("{} global variable(s)", count),
                )
            } else {
                (None, "Globals".into())
            }
        }
        7 => {
            // Export section
            if let Some((count, mut offset)) = read_u32_leb128(data) {
                let mut export_names = Vec::new();
                for _ in 0..count {
                    if offset >= data.len() {
                        break;
                    }
                    if let Some((name_len, len_bytes)) = read_u32_leb128(&data[offset..]) {
                        offset += len_bytes;
                        let end = (offset + name_len as usize).min(data.len());
                        if let Ok(name) = std::str::from_utf8(&data[offset..end]) {
                            export_names.push(format!("\"{}\"", name));
                        }
                        offset = end + 1; // skip export kind
                        if let Some((_, idx_bytes)) = read_u32_leb128(&data[offset..]) {
                            offset += idx_bytes;
                        }
                    }
                }
                let summary = if export_names.is_empty() {
                    format!("{} export(s)", count)
                } else {
                    format!("{} export(s): {}", count, export_names.join(", "))
                };
                (Some(count as usize), summary)
            } else {
                (None, "Exports".into())
            }
        }
        9 => {
            // Element section (table initializers)
            if let Some((count, _)) = read_u32_leb128(data) {
                (
                    Some(count as usize),
                    format!("{} element segment(s) initializing table", count),
                )
            } else {
                (None, "Elements".into())
            }
        }
        10 => {
            // Code section (function bodies)
            if let Some((count, _)) = read_u32_leb128(data) {
                (
                    Some(count as usize),
                    format!("{} compiled function body(ies)", count),
                )
            } else {
                (None, "Function bodies".into())
            }
        }
        11 => {
            // Data section
            if let Some((count, _)) = read_u32_leb128(data) {
                (
                    Some(count as usize),
                    format!("{} static data segment(s)", count),
                )
            } else {
                (None, "Static data".into())
            }
        }
        _ => (None, format!("{} bytes payload", data.len())),
    }
}

fn generate_hex_dump(bytes: &[u8], max_bytes: usize) -> String {
    let display_len = bytes.len().min(max_bytes);
    let mut lines = Vec::new();

    for chunk_offset in (0..display_len).step_by(16) {
        let chunk_end = (chunk_offset + 16).min(display_len);
        let chunk = &bytes[chunk_offset..chunk_end];

        let hex_parts: Vec<String> = chunk.iter().map(|b| format!("{:02x}", b)).collect();
        let hex_str = hex_parts.join(" ");

        let ascii_str: String = chunk
            .iter()
            .map(|&b| {
                if b.is_ascii_graphic() || b == b' ' {
                    b as char
                } else {
                    '.'
                }
            })
            .collect();

        lines.push(format!(
            "{:08x}: {:<48} |{}|",
            chunk_offset, hex_str, ascii_str
        ));
    }

    if bytes.len() > max_bytes {
        lines.push(format!(
            "... ({} more bytes truncated)",
            bytes.len() - max_bytes
        ));
    }

    lines.join("\n")
}

#[component]
pub fn WasmInspectorCard(
    language: crate::language::Language,
    part_name: String,
    wasm_bytes: Vec<u8>,
) -> Element {
    let mut view_mode = use_signal(|| 0); // 0: Sections, 1: Hex Dump
    let inspection = match inspect_wasm_binary(&wasm_bytes) {
        Ok(ins) => ins,
        Err(err) => {
            return rsx! {
                div { style: "padding: 0.8rem; background: rgb(239 68 68 / 0.1); border: 1px solid var(--border); border-radius: var(--radius-sm); color: #fca5a5; font-size: 0.85rem;",
                    "Failed to parse WebAssembly binary: {err}"
                }
            };
        }
    };

    let download_filename = format!(
        "{}.wasm",
        if part_name.is_empty() {
            "part"
        } else {
            &part_name
        }
    );

    rsx! {
        div {
            class: "wasm-inspector-card",
            style: "display: grid; gap: 0.75rem; padding: 1rem 1.2rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); box-shadow: var(--shadow-sm);",
            div { style: "display: flex; justify-content: space-between; align-items: center; gap: 0.8rem; flex-wrap: wrap;",
                div { style: "display: flex; align-items: baseline; gap: 0.6rem;",
                    span { style: "font-size: 0.95rem; font-weight: 600; color: var(--text);",
                        "{language.label(\"WebAssembly Binary Structure\", \"WebAssembly バイナリ構造\", \"Strukturo de WebAssembly-binaro\")}"
                    }
                    span {
                        class: "badge mono",
                        style: "font-size: 0.72rem; color: var(--primary); background: rgb(124 192 216 / 0.12); padding: 0.15rem 0.45rem; border-radius: var(--radius-full);",
                        "{inspection.total_bytes} bytes (v{inspection.version})"
                    }
                }
                div { style: "display: flex; align-items: center; gap: 0.5rem;",
                    a {
                        href: "{inspection.download_data_url}",
                        download: "{download_filename}",
                        style: "display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.38rem 0.8rem; font-size: 0.8rem; font-weight: 600; background: var(--primary); color: #0e1720; text-decoration: none; border-radius: var(--radius-sm); box-shadow: var(--shadow-sm); transition: opacity 0.15s ease;",
                        span { "⬇" }
                        span {
                            "{language.label(\"Download .wasm\", \".wasm をダウンロード\", \"Elŝuti .wasm\")}"
                        }
                    }
                }
            }

            // View toggle (Sections / Hex Dump)
            div { style: "display: flex; gap: 0.35rem; border-bottom: 1px solid var(--border); padding-bottom: 0.4rem;",
                button {
                    r#type: "button",
                    style: if view_mode() == 0 { "padding: 0.25rem 0.65rem; font-size: 0.78rem; font-weight: 600; background: rgb(124 192 216 / 0.15); color: var(--primary); border: 1px solid var(--primary); border-radius: var(--radius-xs); cursor: pointer;" } else { "padding: 0.25rem 0.65rem; font-size: 0.78rem; background: transparent; color: var(--text-secondary); border: 1px solid transparent; border-radius: var(--radius-xs); cursor: pointer;" },
                    onclick: move |_| view_mode.set(0),
                    "{language.label(\"Sections\", \"セクション一覧\", \"Sekcioj\")}"
                }
                button {
                    r#type: "button",
                    style: if view_mode() == 1 { "padding: 0.25rem 0.65rem; font-size: 0.78rem; font-weight: 600; background: rgb(124 192 216 / 0.15); color: var(--primary); border: 1px solid var(--primary); border-radius: var(--radius-xs); cursor: pointer;" } else { "padding: 0.25rem 0.65rem; font-size: 0.78rem; background: transparent; color: var(--text-secondary); border: 1px solid transparent; border-radius: var(--radius-xs); cursor: pointer;" },
                    onclick: move |_| view_mode.set(1),
                    "{language.label(\"Hex Dump\", \"16進ダンプ\", \"Deksesuma rubejo\")}"
                }
            }

            if view_mode() == 0 {
                // Sections view
                div { style: "display: grid; gap: 0.35rem; font-size: 0.8rem;",
                    for sec in &inspection.sections {
                        div {
                            key: "{sec.offset}",
                            style: "display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; padding: 0.4rem 0.65rem; background: rgb(0 0 0 / 0.18); border: 1px solid var(--border); border-radius: var(--radius-xs); flex-wrap: wrap;",
                            div { style: "display: flex; align-items: center; gap: 0.5rem;",
                                span {
                                    class: "mono",
                                    style: "font-weight: 700; color: #38bdf8; min-width: 4.8rem;",
                                    "[{sec.name}]"
                                }
                                span { style: "color: var(--text);", "{sec.summary}" }
                            }
                            div {
                                class: "mono",
                                style: "font-size: 0.74rem; color: var(--text-secondary); margin-left: auto;",
                                "{sec.size} B (offset: 0x{sec.offset:02x})"
                            }
                        }
                    }
                }
            } else {
                // Hex dump view
                pre {
                    class: "mono",
                    style: "margin: 0; padding: 0.6rem 0.8rem; background: rgb(0 0 0 / 0.35); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.75rem; color: #a5f3fc; overflow-x: auto; line-height: 1.45;",
                    "{inspection.hex_dump}"
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use definy_event::event::*;

    #[test]
    fn test_inspect_compiled_wasm() {
        let expr = Expression::Add(AddExpression {
            left: Box::new(Expression::Number(NumberExpression { value: 10 })),
            right: Box::new(Expression::Number(NumberExpression { value: 25 })),
        });
        let wasm_bytes = crate::wasm_emitter::compile_expression_to_wasm(&expr, &[]).unwrap();

        let inspection = inspect_wasm_binary(&wasm_bytes).unwrap();
        assert_eq!(inspection.version, 1);
        assert!(inspection.total_bytes > 30);
        assert!(
            inspection
                .download_data_url
                .starts_with("data:application/wasm;base64,")
        );
        assert!(inspection.hex_dump.contains("00000000:"));
        assert!(inspection.hex_dump.contains("asm"));

        let section_names: Vec<&str> = inspection.sections.iter().map(|s| s.name).collect();
        assert!(section_names.contains(&"Type"));
        assert!(section_names.contains(&"Function"));
        assert!(section_names.contains(&"Memory"));
        assert!(section_names.contains(&"Export"));
        assert!(section_names.contains(&"Code"));
    }
}

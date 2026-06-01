use std::fs::File;
use std::io::Write;
use std::path::Path;

#[derive(serde::Deserialize)]
struct Data {
    html: HtmlData,
}

#[derive(serde::Deserialize)]
struct HtmlData {
    elements: std::collections::HashMap<String, ElementData>,
    global_attributes: std::collections::HashMap<String, AttributeData>,
}

#[derive(serde::Deserialize)]
struct ElementData {
    __compat: Option<Compat>,
    #[serde(flatten)]
    attributes: std::collections::HashMap<String, AttributeData>,
}

#[derive(Debug, serde::Deserialize)]
pub struct Compat {
    mdn_url: Option<String>,
    spec_url: Option<serde_json::Value>,
}

#[derive(Debug, serde::Deserialize)]
pub struct AttributeData {
    __compat: Option<Compat>,
}

fn main() -> anyhow::Result<()> {
    let data_path = Path::new("./narumincho-vdom-build/data.json");
    let data = if data_path.exists() {
        serde_json::from_slice::<Data>(&std::fs::read(data_path)?)?
    } else {
        // https://github.com/mdn/browser-compat-data
        let response =
            reqwest::blocking::get("https://unpkg.com/@mdn/browser-compat-data/data.json")?
                .bytes()?;

        File::create(data_path)?.write_all(&response)?;

        serde_json::from_slice::<Data>(&response)?
    };

    output_elements_mod(&data.html)?;

    for (tag, element) in data.html.elements {
        let path = format!("./narumincho-vdom/src/elements/{}.rs", tag);
        let dest_path = Path::new(&path);
        let mut file = File::create(dest_path)?;

        writeln!(
            file,
            "// このファイルは narumincho-vdom-build によって自動生成されました。"
        )?;
        writeln!(file, "use crate::Element;")?;
        writeln!(file)?;
        writeln!(
            file,
            "/// {}
pub struct {} {{
",
            element
                .__compat
                .map(|e| e.mdn_url.unwrap_or_default())
                .unwrap_or_default(),
            capitalize(&tag)
        )?;
        for (attr, attribute_data) in data
            .html
            .global_attributes
            .iter()
            .chain(element.attributes.iter())
        {
            writeln!(
                file,
                "    /// {}",
                attribute_data
                    .__compat
                    .as_ref()
                    .and_then(|e| e.mdn_url.as_ref())
                    .unwrap_or(&"".to_string())
            )?;
            writeln!(
                file,
                "    pub {}: std::option::Option<String>,",
                escape_identifier(attr)
            )?;
        }
        writeln!(
            file,
            "}}
"
        )?;
        writeln!(file)?;
    }

    Ok(())
}

fn output_elements_mod(html_data: &HtmlData) -> anyhow::Result<()> {
    let mut file = File::create("./narumincho-vdom/src/elements.rs")?;
    writeln!(
        file,
        "// このファイルは narumincho-vdom-build によって自動生成されました。"
    )?;
    for tag in html_data.elements.keys() {
        writeln!(file, "pub mod {};", tag)?;
    }

    writeln!(file, "pub struct Element {{")?;
    for (attr, attribute_data) in &html_data.global_attributes {
        writeln!(
            file,
            "    /// {}",
            attribute_data
                .__compat
                .as_ref()
                .and_then(|e| e.mdn_url.as_ref())
                .unwrap_or(&"".to_string())
        )?;
        writeln!(
            file,
            "    pub {}: std::option::Option<String>,",
            escape_identifier(attr.as_str())
        )?;
    }
    writeln!(file, "}}")?;

    Ok(())
}

fn escape_identifier(s: &str) -> String {
    match s {
        "type" | "loop" | "for" | "as" => "r#type".to_string(),
        _ => s.replace('-', "_"),
    }
}

fn capitalize(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        None => String::new(),
        Some(f) => f.to_uppercase().collect::<String>() + chars.as_str(),
    }
}

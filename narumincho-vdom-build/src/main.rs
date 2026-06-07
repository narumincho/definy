use std::fs::File;
use std::io::Write;
use std::path::Path;

#[derive(serde::Deserialize)]
struct Data {
    html: HtmlData,
}

#[derive(serde::Deserialize)]
struct HtmlData {
    elements: std::collections::BTreeMap<String, ElementData>,
    global_attributes: std::collections::BTreeMap<String, AttributeData>,
}

#[derive(serde::Deserialize)]
struct ElementData {
    __compat: Option<Compat>,
    #[serde(flatten)]
    attributes: std::collections::BTreeMap<String, AttributeData>,
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
        output_element_mod(&tag, &element)?;
    }

    Ok(())
}

fn output_elements_mod(html_data: &HtmlData) -> anyhow::Result<()> {
    let mut file = File::create("./narumincho-vdom/src/elements.rs")?;
    writeln!(
        file,
        "// このファイルは narumincho-vdom-build によって自動生成されました。"
    )?;
    for name in html_data.elements.keys() {
        writeln!(file, "pub mod {};", name)?;
    }

    writeln!(file)?;

    writeln!(
        file,
        "pub enum Node {{
    Element(Element),
    Text(String),
}}
    
pub struct Element {{
    pub global_attributes: GlobalAttributes,
    pub element_content: ElementContent,
    pub children: Vec<Node>,
}}
"
    )?;

    writeln!(
        file,
        "#[derive(Default)]
pub struct GlobalAttributes {{"
    )?;
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
    writeln!(
        file,
        "}}
"
    )?;

    writeln!(file, "pub enum ElementContent {{")?;
    for (name, element_data) in &html_data.elements {
        writeln!(
            file,
            "    /// {}",
            element_data
                .__compat
                .as_ref()
                .and_then(|e| e.mdn_url.as_ref())
                .unwrap_or(&"".to_string())
        )?;
        let element_name = escape_identifier(name.as_str());
        let capitalized_element_name = capitalize(&escape_identifier(name.as_str()));
        writeln!(
            file,
            "    {}({}::{}),",
            capitalized_element_name, element_name, capitalized_element_name
        )?;
    }
    writeln!(file, "}}")?;

    writeln!(file, "impl Element {{")?;

    for attr in html_data.global_attributes.keys() {
        writeln!(
            file,
            "    /// {}",
            html_data
                .global_attributes
                .get(attr)
                .and_then(|a| a.__compat.as_ref())
                .and_then(|e| e.mdn_url.as_ref())
                .unwrap_or(&"".to_string())
        )?;
        writeln!(
            file,
            "    pub fn {}(mut self, value: impl Into<String>) -> Self {{",
            escape_identifier(attr.as_str())
        )?;
        writeln!(
            file,
            "        self.global_attributes.{} = Some(value.into());",
            escape_identifier(attr.as_str())
        )?;
        writeln!(file, "        self")?;
        writeln!(file, "    }}")?;
        writeln!(file)?;
    }

    writeln!(file, "}}")?;

    Ok(())
}

fn output_element_mod(name: &str, element_data: &ElementData) -> anyhow::Result<()> {
    let path = format!("./narumincho-vdom/src/elements/{}.rs", name);
    let dest_path = Path::new(&path);
    let mut file = File::create(dest_path)?;

    writeln!(
        file,
        "// このファイルは narumincho-vdom-build によって自動生成されました。"
    )?;
    writeln!(file)?;
    writeln!(
        file,
        "/// {}
pub struct {} {{
",
        element_data
            .__compat
            .as_ref()
            .and_then(|e| e.mdn_url.as_ref())
            .unwrap_or(&"".to_string()),
        capitalize(name)
    )?;
    for (attr, attribute_data) in &element_data.attributes {
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

    writeln!(
        file,
        "pub fn {}() -> {} {{
    {}{{",
        name,
        capitalize(name),
        capitalize(name)
    )?;
    for attr in element_data.attributes.keys() {
        writeln!(file, "        {}: None,", escape_identifier(attr))?;
    }
    writeln!(file, "    }}")?;
    writeln!(file, "}}")?;

    writeln!(file, "impl {} {{", capitalize(name))?;
    for (attr, attribute_data) in &element_data.attributes {
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
            "    pub fn {}(mut self, value: impl Into<String>) -> Self {{",
            escape_identifier(attr)
        )?;
        writeln!(
            file,
            "        self.{} = Some(value.into());",
            escape_identifier(attr)
        )?;
        writeln!(file, "        self")?;
        writeln!(file, "    }}")?;
        writeln!(file)?;
    }
    writeln!(
        file,
        "    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {{"
    )?;
    writeln!(file, "        super::Element {{")?;
    writeln!(
        file,
        "            global_attributes: super::GlobalAttributes::default(),"
    )?;
    writeln!(
        file,
        "            element_content: super::ElementContent::{}(self),",
        capitalize(name)
    )?;
    writeln!(file, "            children,")?;
    writeln!(file, "        }}")?;

    writeln!(file, "    }}")?;

    writeln!(file, "}}")?;

    Ok(())
}

fn escape_identifier(s: &str) -> String {
    match s {
        "type" | "loop" | "for" | "as" | "async" => format!("r#{s}"),
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

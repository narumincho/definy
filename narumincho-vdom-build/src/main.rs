use std::collections::{BTreeMap, BTreeSet};
use std::fs::{self, File};
use std::io::Write;
use std::path::Path;

#[derive(serde::Deserialize)]
struct UnpkgMeta {
    files: Vec<UnpkgFile>,
}

#[derive(serde::Deserialize)]
struct UnpkgFile {
    path: String,
}

#[derive(serde::Deserialize)]
struct WebrefSpecData {
    spec: SpecInfo,
    elements: Vec<WebrefElement>,
}

#[derive(serde::Deserialize)]
struct SpecInfo {
    title: String,
    url: String,
}

#[derive(serde::Deserialize)]
struct WebrefElement {
    name: String,
    #[serde(default)]
    interface: String,
    #[serde(default)]
    href: String,
    #[serde(default)]
    obsolete: Option<bool>,
}

struct ElementInfo {
    name: String,
    interface: String,
    href: String,
    specs: BTreeSet<String>,
}

const GLOBAL_ATTRIBUTES: &[&str] = &[
    "accesskey",
    "autocapitalize",
    "autofocus",
    "class",
    "contenteditable",
    "dir",
    "draggable",
    "enterkeyhint",
    "hidden",
    "id",
    "inert",
    "inputmode",
    "is",
    "lang",
    "nonce",
    "part",
    "popover",
    "slot",
    "spellcheck",
    "style",
    "tabindex",
    "title",
    "translate",
];

const OVERLAPPING_TAGS: &[&str] = &["a", "script", "style", "title"];

fn main() -> anyhow::Result<()> {
    let cache_dir = Path::new("./narumincho-vdom-build/webref-elements");
    if !cache_dir.exists() {
        fs::create_dir_all(cache_dir)?;

        let meta_url = "https://unpkg.com/@webref/elements/?meta";
        let meta_response = reqwest::blocking::get(meta_url)?.json::<UnpkgMeta>()?;

        for file in meta_response.files {
            if file.path.ends_with(".json") && file.path != "/package.json" {
                let file_name = file.path.trim_start_matches('/');
                let file_url = format!("https://unpkg.com/@webref/elements{}", file.path);
                let content = reqwest::blocking::get(&file_url)?.bytes()?;
                fs::write(cache_dir.join(file_name), &content)?;
            }
        }
    }

    // Read cached files
    let mut elements_map: BTreeMap<String, ElementInfo> = BTreeMap::new();
    let mut svg_elements = BTreeSet::new();
    let mut mathml_elements = BTreeSet::new();

    for entry in fs::read_dir(cache_dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_file() && path.extension().map_or(false, |ext| ext == "json") {
            let file_name = path.file_name().unwrap().to_str().unwrap().to_string();
            let content = fs::read(&path)?;
            let spec_data: WebrefSpecData = serde_json::from_slice(&content)?;

            for el in spec_data.elements {
                if el.obsolete.unwrap_or(false) {
                    continue;
                }

                let is_svg = file_name.contains("svg")
                    || file_name.contains("masking")
                    || file_name.contains("filter")
                    || el.interface.starts_with("SVG");

                let is_mathml = file_name.contains("mathml") || el.interface.starts_with("Math");

                if is_svg {
                    svg_elements.insert(el.name.clone());
                }
                if is_mathml {
                    mathml_elements.insert(el.name.clone());
                }

                let entry = elements_map
                    .entry(el.name.clone())
                    .or_insert_with(|| ElementInfo {
                        name: el.name.clone(),
                        interface: el.interface.clone(),
                        href: el.href.clone(),
                        specs: BTreeSet::new(),
                    });
                entry.specs.insert(spec_data.spec.title.clone());
                if !el.interface.is_empty() && entry.interface.is_empty() {
                    entry.interface = el.interface.clone();
                }
                if !el.href.is_empty() && entry.href.is_empty() {
                    entry.href = el.href.clone();
                }
            }
        }
    }

    // Clean up target elements directory
    let target_elements_dir = Path::new("./narumincho-vdom/src/elements");
    if target_elements_dir.exists() {
        fs::remove_dir_all(target_elements_dir)?;
    }
    fs::create_dir_all(target_elements_dir)?;

    // Generate elements.rs
    output_elements_rs(&elements_map)?;

    // Generate individual element files
    for (name, info) in &elements_map {
        output_element_file(name, info)?;
    }

    // Generate element_creation.rs in client
    output_element_creation_rs(&svg_elements, &mathml_elements)?;

    Ok(())
}

fn output_elements_rs(elements_map: &BTreeMap<String, ElementInfo>) -> anyhow::Result<()> {
    let mut file = File::create("./narumincho-vdom/src/elements.rs")?;
    writeln!(
        file,
        "// このファイルは narumincho-vdom-build によって自動生成されました。"
    )?;
    writeln!(file, "#![allow(non_snake_case, dead_code)]")?;
    for name in elements_map.keys() {
        writeln!(file, "pub mod {};", escape_identifier(name))?;
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
    for attr in GLOBAL_ATTRIBUTES {
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

    writeln!(file, "pub enum ElementContent {{")?;
    for (name, info) in elements_map {
        writeln!(file, "    /// {}", info.href)?;
        let element_name = escape_identifier(name);
        let capitalized_element_name = capitalize(name);
        writeln!(
            file,
            "    {}({}::{}),",
            capitalized_element_name, element_name, capitalized_element_name
        )?;
    }
    writeln!(file, "}}")?;

    writeln!(file, "impl Element {{")?;
    for attr in GLOBAL_ATTRIBUTES {
        writeln!(
            file,
            "    pub fn {}(mut self, value: impl Into<String>) -> Self {{",
            escape_identifier(attr)
        )?;
        writeln!(
            file,
            "        self.global_attributes.{} = Some(value.into());",
            escape_identifier(attr)
        )?;
        writeln!(file, "        self")?;
        writeln!(file, "    }}")?;
        writeln!(file)?;
    }
    writeln!(file, "}}")?;

    Ok(())
}

fn output_element_file(name: &str, info: &ElementInfo) -> anyhow::Result<()> {
    let escaped_name = escape_identifier(name);
    let file_name = escaped_name.trim_start_matches("r#");
    let path = format!("./narumincho-vdom/src/elements/{}.rs", file_name);
    let mut file = File::create(path)?;

    let capitalized_name = capitalize(name);

    writeln!(
        file,
        "// このファイルは narumincho-vdom-build によって自動生成されました。"
    )?;
    writeln!(file, "#![allow(non_snake_case, dead_code)]")?;
    writeln!(file)?;
    writeln!(
        file,
        "/// {}
pub struct {} {{}}
",
        info.href, capitalized_name
    )?;

    writeln!(
        file,
        "pub fn {}() -> {} {{
    {} {{}}
}}
",
        escaped_name, capitalized_name, capitalized_name
    )?;

    writeln!(file, "impl {} {{", capitalized_name)?;
    writeln!(
        file,
        "    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {{
        super::Element {{
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::{}(self),
            children,
        }}
    }}
}}",
        capitalized_name
    )?;

    Ok(())
}

fn output_element_creation_rs(
    svg_elements: &BTreeSet<String>,
    mathml_elements: &BTreeSet<String>,
) -> anyhow::Result<()> {
    let mut file = File::create("./narumincho-vdom-client/src/element_creation.rs")?;
    writeln!(
        file,
        "// このファイルは narumincho-vdom-build によって自動生成されました。"
    )?;
    writeln!(file)?;
    writeln!(
        file,
        "pub fn create_element(name: &str, is_svg: bool) -> web_sys::Element {{"
    )?;
    writeln!(
        file,
        "    if is_svg || is_svg_element_only(name) {{
        crate::DOCUMENT
            .create_element_ns(Some(\"http://www.w3.org/2000/svg\"), name)
            .unwrap()
    }} else if is_mathml_element_only(name) {{
        crate::DOCUMENT
            .create_element_ns(Some(\"http://www.w3.org/1998/Math/MathML\"), name)
            .unwrap()
    }} else {{
        crate::DOCUMENT.create_element(name).unwrap()
    }}
}}"
    )?;
    writeln!(file)?;

    writeln!(file, "fn is_svg_element_only(name: &str) -> bool {{")?;
    writeln!(file, "    match name {{")?;
    for svg_el in svg_elements {
        if !OVERLAPPING_TAGS.contains(&svg_el.as_str()) {
            writeln!(file, "        \"{}\" => true,", svg_el)?;
        }
    }
    writeln!(file, "        _ => false,")?;
    writeln!(file, "    }}")?;
    writeln!(file, "}}")?;
    writeln!(file)?;

    writeln!(file, "fn is_mathml_element_only(name: &str) -> bool {{")?;
    writeln!(file, "    match name {{")?;
    for mathml_el in mathml_elements {
        if !OVERLAPPING_TAGS.contains(&mathml_el.as_str()) {
            writeln!(file, "        \"{}\" => true,", mathml_el)?;
        }
    }
    writeln!(file, "        _ => false,")?;
    writeln!(file, "    }}")?;
    writeln!(file, "}}")?;

    writeln!(
        file,
        "
#[cfg(test)]
mod tests {{
    use super::*;

    #[test]
    fn test_element_namespaces() {{
        // SVG only elements
        assert!(is_svg_element_only(\"path\"));
        assert!(is_svg_element_only(\"rect\"));
        assert!(is_svg_element_only(\"circle\"));
        assert!(is_svg_element_only(\"svg\"));

        // Overlapping tags (should NOT be SVG-only or MathML-only)
        assert!(!is_svg_element_only(\"a\"));
        assert!(!is_svg_element_only(\"script\"));
        assert!(!is_svg_element_only(\"style\"));
        assert!(!is_svg_element_only(\"title\"));

        // MathML elements
        assert!(is_mathml_element_only(\"math\"));
        assert!(is_mathml_element_only(\"mfrac\"));
        assert!(is_mathml_element_only(\"mi\"));

        // HTML elements (should not be SVG-only or MathML-only)
        assert!(!is_svg_element_only(\"div\"));
        assert!(!is_svg_element_only(\"span\"));
        assert!(!is_mathml_element_only(\"div\"));
        assert!(!is_mathml_element_only(\"span\"));
    }}
}}
"
    )?;

    Ok(())
}

fn escape_identifier(s: &str) -> String {
    match s {
        "type" | "loop" | "for" | "as" | "async" | "use" | "switch" => format!("r#{s}"),
        _ => s.replace('-', "_"),
    }
}

fn capitalize(s: &str) -> String {
    let replaced = s.replace('-', "_");
    let mut chars = replaced.chars();
    match chars.next() {
        None => String::new(),
        Some(f) => f.to_uppercase().collect::<String>() + chars.as_str(),
    }
}

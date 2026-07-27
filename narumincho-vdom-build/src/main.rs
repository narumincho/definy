use std::collections::{BTreeMap, BTreeSet};
use std::fs::{self, File};
use std::io::Write;
use std::path::Path;

mod fetch;
mod idl;

#[derive(serde::Deserialize)]
struct WebrefSpecData {
    #[serde(default)]
    spec: SpecInfo,
    elements: Vec<WebrefElement>,
}

#[derive(serde::Deserialize, Default)]
struct SpecInfo {
    #[serde(default)]
    title: String,
    #[serde(default)]
    url: String,
}

#[derive(serde::Deserialize, Clone)]
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

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    fetch::download().await?;

    println!("Parsing WebIDL files...");
    let mut db = idl::IdlDatabase::default();
    db.load_dir(Path::new("./narumincho-vdom-build/cache/webref-idl"))?;

    println!(
        "Parsed {} interfaces and {} enums.",
        db.interfaces.len(),
        db.enums.len()
    );

    let mut elements_map: BTreeMap<String, ElementInfo> = BTreeMap::new();
    let mut svg_elements: BTreeSet<String> = BTreeSet::new();
    let mut mathml_elements: BTreeSet<String> = BTreeSet::new();

    let elements_dir = Path::new("./narumincho-vdom-build/cache/webref-elements");
    if elements_dir.exists() {
        for entry in fs::read_dir(elements_dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("json") {
                let file_name = path.file_name().unwrap().to_str().unwrap();
                if file_name == "package.json" {
                    continue;
                }
                let content = fs::read_to_string(&path)?;
                if let Ok(spec_data) = serde_json::from_str::<WebrefSpecData>(&content) {
                    let is_svg = file_name.contains("svg") || file_name.contains("SVG");
                    let is_mathml = file_name.contains("mathml");

                    for elem in spec_data.elements {
                        if elem.obsolete.unwrap_or(false) || elem.interface.is_empty() {
                            continue;
                        }

                        if is_svg {
                            svg_elements.insert(elem.name.clone());
                        }
                        if is_mathml {
                            mathml_elements.insert(elem.name.clone());
                        }

                        let entry =
                            elements_map
                                .entry(elem.name.clone())
                                .or_insert_with(|| ElementInfo {
                                    name: elem.name.clone(),
                                    interface: elem.interface.clone(),
                                    href: elem.href.clone(),
                                    specs: BTreeSet::new(),
                                });
                        entry.specs.insert(file_name.to_string());
                    }
                }
            }
        }
    }

    println!("Generating code for {} elements...", elements_map.len());

    let output_dir = Path::new("./narumincho-vdom/src/elements");
    if !output_dir.exists() {
        fs::create_dir_all(output_dir)?;
    }

    for (name, info) in &elements_map {
        output_element_file(name, info, &db)?;
    }

    output_elements_rs(&elements_map)?;
    output_element_creation_rs(&svg_elements, &mathml_elements)?;

    println!("Code generation successfully completed!");

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

fn output_element_file(
    name: &str,
    info: &ElementInfo,
    db: &idl::IdlDatabase,
) -> anyhow::Result<()> {
    let escaped_module_name = escape_identifier(name);
    let file_name = escaped_module_name.trim_start_matches("r#");
    let path = format!("./narumincho-vdom/src/elements/{}.rs", file_name);
    let mut file = File::create(path)?;

    let capitalized_element_name = capitalize(name);

    writeln!(
        file,
        "// このファイルは narumincho-vdom-build によって自動生成されました。"
    )?;
    writeln!(file, "#![allow(non_snake_case, dead_code)]")?;
    writeln!(file)?;

    let resolved_attributes = db.resolve_interface_attributes(&info.interface);

    // HTML コンテンツ属性と JS / DOM プロパティを分離
    let mut html_attributes = Vec::new();
    let mut js_properties = Vec::new();

    for attr in resolved_attributes {
        let is_global = GLOBAL_ATTRIBUTES.contains(&attr.name.to_lowercase().as_str());
        let is_event = attr.name.starts_with("on");
        if !is_global && !is_event {
            if is_html_attribute(&attr) {
                html_attributes.push(attr);
            } else {
                js_properties.push(attr);
            }
        }
    }

    // Enum 型の生成情報 (HTML 属性用)
    struct GeneratedEnum {
        enum_type_name: String,
        variants: Vec<(String, String)>,
    }

    let mut generated_enums = Vec::new();

    for attr in &html_attributes {
        if let Some(enum_vals) = &attr.enum_values {
            let enum_type_name = format!("{}{}", capitalized_element_name, capitalize(&attr.name));
            let mut variants = Vec::new();

            for val in enum_vals {
                let variant_name = escape_variant_name(val);
                if !variant_name.is_empty() {
                    variants.push((variant_name, val.clone()));
                }
            }

            if !variants.is_empty() {
                generated_enums.push(GeneratedEnum {
                    enum_type_name,
                    variants,
                });
            }
        }
    }

    // 生成した Enum 定義をファイルに書き出し
    for gen_enum in &generated_enums {
        writeln!(
            file,
            "#[derive(Debug, Clone, Copy, PartialEq, Eq)]\npub enum {} {{",
            gen_enum.enum_type_name
        )?;
        for (variant_name, _) in &gen_enum.variants {
            writeln!(file, "    {},", variant_name)?;
        }
        writeln!(file, "}}\n")?;

        writeln!(file, "impl {} {{", gen_enum.enum_type_name)?;
        writeln!(file, "    pub fn as_str(&self) -> &'static str {{")?;
        writeln!(file, "        match self {{")?;
        for (variant_name, raw_val) in &gen_enum.variants {
            writeln!(
                file,
                "            Self::{} => \"{}\",",
                variant_name, raw_val
            )?;
        }
        writeln!(file, "        }}")?;
        writeln!(file, "    }}")?;
        writeln!(file, "}}\n")?;
    }

    // --- HTML コンテンツ属性用 構造体定義 ---
    writeln!(file, "/// HTML Content Attributes for {}", info.href)?;
    writeln!(file, "#[derive(Default, Debug, Clone, PartialEq, Eq)]")?;
    writeln!(file, "pub struct {} {{", capitalized_element_name)?;
    for attr in &html_attributes {
        let field_name = escape_attribute_field_name(&attr.name);
        if attr.enum_values.is_some() {
            let enum_type_name = format!("{}{}", capitalized_element_name, capitalize(&attr.name));
            writeln!(
                file,
                "    pub {}: std::option::Option<{}>,",
                field_name, enum_type_name
            )?;
        } else if attr.type_name == "boolean" {
            writeln!(file, "    pub {}: std::option::Option<bool>,", field_name)?;
        } else {
            writeln!(file, "    pub {}: std::option::Option<String>,", field_name)?;
        }
    }
    writeln!(file, "}}\n")?;

    // --- JS / DOM プロパティ用 構造体定義 ---
    if !js_properties.is_empty() {
        writeln!(file, "/// JavaScript / DOM Properties for {}", info.href)?;
        writeln!(file, "#[derive(Default, Debug, Clone, PartialEq, Eq)]")?;
        writeln!(
            file,
            "pub struct {}JsProperties {{",
            capitalized_element_name
        )?;
        for attr in &js_properties {
            let field_name = escape_attribute_field_name(&attr.name);
            if attr.type_name == "boolean" {
                writeln!(file, "    pub {}: std::option::Option<bool>,", field_name)?;
            } else {
                writeln!(file, "    pub {}: std::option::Option<String>,", field_name)?;
            }
        }
        writeln!(file, "}}\n")?;
    }

    // 要素生成関数
    writeln!(
        file,
        "pub fn {}() -> {} {{\n    {}::default()\n}}\n",
        escaped_module_name, capitalized_element_name, capitalized_element_name
    )?;

    // HTML 属性セッターのメソッド実装
    writeln!(file, "impl {} {{", capitalized_element_name)?;
    for attr in &html_attributes {
        let method_name = escape_method_name(&attr.name);
        let field_name = escape_attribute_field_name(&attr.name);

        if attr.enum_values.is_some() {
            let enum_type_name = format!("{}{}", capitalized_element_name, capitalize(&attr.name));
            writeln!(
                file,
                "    pub fn {}(mut self, value: {}) -> Self {{\n        self.{} = Some(value);\n        self\n    }}\n",
                method_name, enum_type_name, field_name
            )?;
        } else if attr.type_name == "boolean" {
            writeln!(
                file,
                "    pub fn {}(mut self, value: bool) -> Self {{\n        self.{} = Some(value);\n        self\n    }}\n",
                method_name, field_name
            )?;
        } else {
            writeln!(
                file,
                "    pub fn {}(mut self, value: impl Into<String>) -> Self {{\n        self.{} = Some(value.into());\n        self\n    }}\n",
                method_name, field_name
            )?;
        }
    }

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
        capitalized_element_name
    )?;

    Ok(())
}

/// 属性が HTML コンテンツ属性 (HTML Attribute) かどうかを判定します
fn is_html_attribute(attr: &idl::ResolvedAttribute) -> bool {
    let name = attr.name.as_str();

    // 確定的に JS/DOM プロパティ（非 HTML 属性）であるもの
    let js_property_names = [
        "outerHTML",
        "innerHTML",
        "outerText",
        "innerText",
        "attributes",
        "attributeStyleMap",
        "classList",
        "dataset",
        "childNodes",
        "children",
        "firstChild",
        "lastChild",
        "previousSibling",
        "nextSibling",
        "firstElementChild",
        "lastElementChild",
        "previousElementSibling",
        "nextElementSibling",
        "parentElement",
        "parentNode",
        "ownerDocument",
        "shadowRoot",
        "assignedSlot",
        "offsetParent",
        "offsetWidth",
        "offsetHeight",
        "offsetLeft",
        "offsetTop",
        "clientWidth",
        "clientHeight",
        "clientLeft",
        "clientTop",
        "scrollWidth",
        "scrollHeight",
        "scrollLeft",
        "scrollTop",
        "scrollParent",
        "currentCSSZoom",
        "regionOverset",
        "nodeName",
        "nodeValue",
        "localName",
        "tagName",
        "namespaceURI",
        "prefix",
        "baseURI",
        "accessKeyLabel",
        "isContentEditable",
        "isConnected",
        "validity",
        "validationMessage",
        "willValidate",
        "customElementRegistry",
        "editContext",
        "activeViewTransition",
        "containertimingIgnore",
        "headingReset",
        "labels",
        "double",
        "short",
        "long",
        "elementTiming",
        "containertiming",
        "commandForElement",
        "popoverTargetElement",
    ];

    if js_property_names.contains(&name) {
        return false;
    }

    // 確定的に HTML コンテンツ属性であるもの
    let html_attribute_names = [
        "type",
        "value",
        "name",
        "disabled",
        "checked",
        "selected",
        "readOnly",
        "required",
        "placeholder",
        "src",
        "href",
        "target",
        "alt",
        "title",
        "rel",
        "media",
        "action",
        "method",
        "enctype",
        "noValidate",
        "formAction",
        "formEnctype",
        "formMethod",
        "formNoValidate",
        "formTarget",
        "min",
        "max",
        "step",
        "pattern",
        "autocomplete",
        "autocorrect",
        "multiple",
        "accept",
        "cols",
        "rows",
        "wrap",
        "for",
        "maxLength",
        "minLength",
        "size",
        "height",
        "width",
        "span",
        "colSpan",
        "rowSpan",
        "headers",
        "scope",
        "async",
        "defer",
        "crossOrigin",
        "integrity",
        "download",
        "ping",
        "shape",
        "coords",
        "useMap",
        "isMap",
        "kind",
        "srcLang",
        "label",
        "default",
        "loop",
        "controls",
        "muted",
        "playsInline",
        "poster",
        "preload",
        "sandbox",
        "srcDoc",
        "allow",
        "allowFullscreen",
        "loading",
        "decoding",
        "referrerPolicy",
        "fetchPriority",
        "command",
        "commandFor",
        "popoverTargetAction",
        "ariaActiveDescendantElement",
        "ariaAtomic",
        "ariaAutoComplete",
        "ariaBrailleLabel",
        "ariaBrailleRoleDescription",
        "ariaBusy",
        "ariaChecked",
        "ariaColCount",
        "ariaColIndex",
        "ariaColIndexText",
        "ariaColSpan",
        "ariaCurrent",
        "ariaDescription",
        "ariaDisabled",
        "ariaExpanded",
        "ariaHasPopup",
        "ariaHidden",
        "ariaInvalid",
        "ariaKeyShortcuts",
        "ariaLabel",
        "ariaLevel",
        "ariaLive",
        "ariaModal",
        "ariaMultiLine",
        "ariaMultiSelectable",
        "ariaOrientation",
        "ariaPlaceholder",
        "ariaPosInSet",
        "ariaPressed",
        "ariaReadOnly",
        "ariaRelevant",
        "ariaRequired",
        "ariaRoleDescription",
        "ariaRowCount",
        "ariaRowIndex",
        "ariaRowIndexText",
        "ariaRowSpan",
        "ariaSelected",
        "ariaSetSize",
        "ariaSort",
        "ariaValueMax",
        "ariaValueMin",
        "ariaValueNow",
        "ariaValueText",
    ];

    if html_attribute_names.contains(&name) || name.starts_with("aria") || name.starts_with("data")
    {
        return true;
    }

    // enum 値を持つものや bool / string 属性で読み取り専用でないものを標準として扱う
    if attr.enum_values.is_some() || !attr.is_readonly {
        return true;
    }

    false
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
        "type" | "loop" | "for" | "as" | "async" | "use" | "switch" | "in" | "match" | "fn"
        | "struct" | "enum" | "trait" | "where" | "impl" | "ref" | "static" | "const"
        | "unsafe" | "mod" | "pub" | "crate" | "super" | "self" | "default" => format!("r#{s}"),
        _ => s.replace('-', "_"),
    }
}

fn escape_method_name(s: &str) -> String {
    let snake = to_snake_case(s);
    match snake.as_str() {
        "type" | "loop" | "for" | "as" | "async" | "use" | "switch" | "in" | "match" | "fn"
        | "struct" | "enum" | "trait" | "where" | "impl" | "ref" | "static" | "const"
        | "unsafe" | "mod" | "pub" | "crate" | "super" | "self" | "default" => format!("{snake}_"),
        _ => snake,
    }
}

fn escape_attribute_field_name(s: &str) -> String {
    let snake = to_snake_case(s);
    match snake.as_str() {
        "type" | "loop" | "for" | "as" | "async" | "use" | "switch" | "in" | "match" | "fn"
        | "struct" | "enum" | "trait" | "where" | "impl" | "ref" | "static" | "const"
        | "unsafe" | "mod" | "pub" | "crate" | "super" | "self" | "default" => format!("r#{snake}"),
        _ => snake,
    }
}

fn escape_variant_name(s: &str) -> String {
    let cap = capitalize(s);
    match cap.as_str() {
        "Self" | "Super" | "Crate" | "Type" | "Loop" | "For" | "As" | "Async" | "Use"
        | "Switch" | "In" | "Match" | "Fn" | "Struct" | "Enum" | "Trait" | "Where" | "Impl"
        | "Ref" | "Static" | "Const" | "Unsafe" | "Mod" | "Pub" | "Default" => format!("{cap}_"),
        _ => cap,
    }
}

fn to_snake_case(s: &str) -> String {
    let mut result = String::new();
    for (i, c) in s.chars().enumerate() {
        if c == '-' || c == '.' {
            result.push('_');
        } else if c.is_uppercase() {
            if i > 0 {
                result.push('_');
            }
            for lc in c.to_lowercase() {
                result.push(lc);
            }
        } else {
            result.push(c);
        }
    }
    result
}

fn capitalize(s: &str) -> String {
    let mut result = String::new();
    let parts: Vec<&str> = s
        .split(|c| c == '-' || c == '_' || c == '.' || c == '/')
        .collect();
    for part in parts {
        let mut chars = part.chars();
        if let Some(first) = chars.next() {
            result.push_val(first.to_ascii_uppercase());
            for rest in chars {
                result.push(rest);
            }
        }
    }
    if result.is_empty() {
        s.to_string()
    } else {
        result
    }
}

trait PushValExt {
    fn push_val(&mut self, c: char);
}

impl PushValExt for String {
    fn push_val(&mut self, c: char) {
        self.push(c);
    }
}

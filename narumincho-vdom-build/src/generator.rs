use std::collections::{BTreeMap, BTreeSet};
use std::fs::{self, File};
use std::io::Write;
use std::path::Path;

use crate::fetch;
use crate::idl;
use crate::model::{ElementInfo, GLOBAL_ATTRIBUTES, OVERLAPPING_TAGS, WebrefSpecData};
use crate::naming::{
    capitalize, escape_attribute_field_name, escape_identifier, escape_method_name,
    escape_variant_name,
};

pub async fn generate_code() -> anyhow::Result<()> {
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

    output_elements_rs(&elements_map, &db)?;
    output_element_creation_rs(&svg_elements, &mathml_elements)?;
    let old_elements_path = Path::new("./narumincho-vdom/src/old_elements.rs");
    if old_elements_path.exists() {
        fs::remove_file(old_elements_path)?;
    }

    println!("Code generation successfully completed!");
    Ok(())
}

fn old_element_type_name(name: &str) -> String {
    match name {
        "option" => "OptionElement".to_string(),
        "style" => "StyleElement".to_string(),
        "text" => "TextElement".to_string(),
        _ => capitalize(name),
    }
}

fn output_elements_rs(
    elements_map: &BTreeMap<String, ElementInfo>,
    db: &idl::IdlDatabase,
) -> anyhow::Result<()> {
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
        "#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Node {{
    Element(Element),
    Text(String),
}}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Element {{
    pub global_attributes: GlobalAttributes,
    pub element_content: ElementContent,
    pub children: Vec<Node>,
}}
"
    )?;

    writeln!(
        file,
        "#[derive(Default, Debug, Clone, PartialEq, Eq)]
pub struct GlobalAttributes {{"
    )?;
    for attr in GLOBAL_ATTRIBUTES {
        writeln!(
            file,
            "    pub {}: std::option::Option<String>,",
            escape_identifier(attr)
        )?;
    }
    writeln!(file, "}}\n")?;

    writeln!(file, "#[derive(Debug, Clone, PartialEq, Eq)]")?;
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

    output_stateful_element_builders(&mut file, elements_map, db)?;

    Ok(())
}

fn output_stateful_element_builders(
    file: &mut File,
    elements_map: &BTreeMap<String, ElementInfo>,
    db: &idl::IdlDatabase,
) -> anyhow::Result<()> {
    writeln!(file)?;
    writeln!(file, "use crate::node::{{Element as VdomElement, EventHandler as VdomEventHandler, Node as VdomNode}};")?;

    for (name, info) in elements_map {
        if name == "a" {
            writeln!(file, "pub type A<State, L> = Anchor<State, L>;")?;
            writeln!(file, "pub struct Anchor<State, L: crate::Route> {{ pub attributes: Vec<(String, String)>, pub styles: crate::Style, pub events: Vec<(String, VdomEventHandler<State>)>, pub children: Vec<VdomNode<State>>, _phantom: std::marker::PhantomData<L> }}")?;
            writeln!(file, "impl<State, L: crate::Route> Anchor<State, L> {{ pub fn new() -> Self {{ Self {{ attributes: Vec::new(), styles: crate::Style::new(), events: Vec::new(), children: Vec::new(), _phantom: std::marker::PhantomData }} }} pub fn attribute(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {{ self.attributes.push((key.into(), value.into())); self }} pub fn id(self, value: impl Into<String>) -> Self {{ self.attribute(\"id\", value) }} pub fn class(self, value: impl Into<String>) -> Self {{ self.attribute(\"class\", value) }} pub fn type_(self, value: impl Into<String>) -> Self {{ self.attribute(\"type\", value) }} pub fn style(mut self, style: impl Into<crate::Style>) -> Self {{ self.styles = style.into(); self }} pub fn popover(self) -> Self {{ self.attribute(\"popover\", \"auto\") }} pub fn children(mut self, children: impl Into<Vec<VdomNode<State>>>) -> Self {{ self.children = children.into(); self }} pub fn into_node(self) -> VdomNode<State> {{ VdomNode::Element(VdomElement {{ element_name: \"a\".to_string(), attributes: self.attributes, styles: self.styles, events: self.events, children: self.children }}) }} pub fn href(self, href: impl Into<crate::route::Href<L>>) -> Self {{ self.attribute(\"href\", href.into()) }} }}")?;
            writeln!(file, "impl<State, L: crate::Route> Default for Anchor<State, L> {{ fn default() -> Self {{ Self::new() }} }}")?;
            writeln!(file, "impl<State, L: crate::Route> From<Anchor<State, L>> for VdomNode<State> {{ fn from(value: Anchor<State, L>) -> Self {{ value.into_node() }} }}")?;
        } else {
            let type_name = old_element_type_name(name);
            writeln!(file, "pub struct {}<State> {{ pub attributes: Vec<(String, String)>, pub styles: crate::Style, pub events: Vec<(String, VdomEventHandler<State>)>, pub children: Vec<VdomNode<State>> }}", type_name)?;
            writeln!(file, "impl<State> Default for {}<State> {{ fn default() -> Self {{ Self::new() }} }}", type_name)?;
            writeln!(file, "impl<State> {}<State> {{ pub fn new() -> Self {{ Self {{ attributes: Vec::new(), styles: crate::Style::new(), events: Vec::new(), children: Vec::new() }} }} pub fn attribute(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {{ self.attributes.push((key.into(), value.into())); self }} pub fn id(self, value: impl Into<String>) -> Self {{ self.attribute(\"id\", value) }} pub fn class(self, value: impl Into<String>) -> Self {{ self.attribute(\"class\", value) }} pub fn type_(self, value: impl Into<String>) -> Self {{ self.attribute(\"type\", value) }} pub fn style(mut self, style: impl Into<crate::Style>) -> Self {{ self.styles = style.into(); self }} pub fn popover(self) -> Self {{ self.attribute(\"popover\", \"auto\") }} pub fn children(mut self, children: impl Into<Vec<VdomNode<State>>>) -> Self {{ self.children = children.into(); self }} pub fn into_node(self) -> VdomNode<State> {{ VdomNode::Element(VdomElement {{ element_name: \"{}\".to_string(), attributes: self.attributes, styles: self.styles, events: self.events, children: self.children }}) }} }}", type_name, name)?;
            writeln!(file, "impl<State> From<{}<State>> for VdomNode<State> {{ fn from(value: {}<State>) -> Self {{ value.into_node() }} }}", type_name, type_name)?;
        }

        let type_name = if name == "a" { "Anchor".to_string() } else { old_element_type_name(name) };
        for attr in db.resolve_interface_attributes(&info.interface) {
            let method_name = if attr.name.starts_with("on") { format!("on_{}", escape_method_name(attr.name.trim_start_matches("on"))) } else { escape_method_name(&attr.name) };
            if ["id", "class", "type_", "style", "popover", "children", "into_node"].contains(&method_name.as_str()) || (name == "a" && method_name == "href") { continue; }
            if attr.name.starts_with("on") {
                writeln!(file, "impl<State{}> {}<State{}> {{ pub fn {}(mut self, handler: VdomEventHandler<State>) -> Self {{ self.events.push((\"{}\".to_string(), handler)); self }} }}", if name == "a" { ", L: crate::Route" } else { "" }, type_name, if name == "a" { ", L" } else { "" }, method_name, attr.name.trim_start_matches("on"))?;
            } else if attr.type_name == "boolean" {
                writeln!(file, "impl<State{}> {}<State{}> {{ pub fn {}(mut self, value: bool) -> Self {{ if value {{ self.attributes.push((\"{}\".to_string(), String::new())); }} self }} }}", if name == "a" { ", L: crate::Route" } else { "" }, type_name, if name == "a" { ", L" } else { "" }, method_name, attr.name)?;
            } else {
                writeln!(file, "impl<State{}> {}<State{}> {{ pub fn {}(self, value: impl Into<String>) -> Self {{ self.attribute(\"{}\", value) }} }}", if name == "a" { ", L: crate::Route" } else { "" }, type_name, if name == "a" { ", L" } else { "" }, method_name, attr.name)?;
            }
        }
    }
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

    let mut html_attributes = Vec::new();
    let mut events = Vec::new();

    for attr in resolved_attributes {
        let is_global = GLOBAL_ATTRIBUTES.contains(&attr.name.to_lowercase().as_str());
        let is_event = attr.name.starts_with("on");
        if is_event {
            events.push(attr);
        } else if !is_global {
            if is_html_attribute(&attr) {
                html_attributes.push(attr);
            }
        }
    }

    struct GeneratedEnum {
        enum_type_name: String,
        variants: Vec<(String, String)>,
    }

    let mut generated_enums = Vec::new();

    for attr in &html_attributes {
        let enum_vals =
            get_attribute_enum_values(&info.interface, attr).or_else(|| attr.enum_values.clone());
        if let Some(enum_vals) = enum_vals {
            let enum_type_name = format!("{}{}", capitalized_element_name, capitalize(&attr.name));
            let mut variants = Vec::new();

            for val in enum_vals {
                let variant_name = escape_variant_name(val.as_str());
                if !variant_name.is_empty() {
                    variants.push((variant_name, val));
                }
            }

            if !variants.is_empty() {
                if supports_custom_values(&info.interface, attr) {
                    variants.push(("Custom".to_string(), "".to_string()));
                }
                generated_enums.push(GeneratedEnum {
                    enum_type_name,
                    variants,
                });
            }
        }
    }

    for gen_enum in &generated_enums {
        let supports_custom = gen_enum
            .variants
            .iter()
            .any(|(variant_name, _)| variant_name == "Custom");
        if supports_custom {
            writeln!(
                file,
                "#[derive(Debug, Clone, PartialEq, Eq)]\npub enum {} {{",
                gen_enum.enum_type_name
            )?;
            for (variant_name, _raw_val) in &gen_enum.variants {
                if variant_name == "Custom" {
                    writeln!(file, "    {}(String),", variant_name)?;
                } else {
                    writeln!(file, "    {},", variant_name)?;
                }
            }
            writeln!(file, "}}\n")?;

            writeln!(file, "impl {} {{", gen_enum.enum_type_name)?;
            writeln!(file, "    pub fn as_str(&self) -> String {{")?;
            writeln!(file, "        match self {{")?;
            for (variant_name, raw_val) in &gen_enum.variants {
                if variant_name == "Custom" {
                    writeln!(file, "            Self::Custom(value) => value.clone(),")?;
                } else {
                    writeln!(
                        file,
                        "            Self::{} => \"{}\".to_string(),",
                        variant_name, raw_val
                    )?;
                }
            }
            writeln!(file, "        }}")?;
            writeln!(file, "    }}")?;
            writeln!(file, "}}\n")?;
        } else {
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
    }

    writeln!(file, "/// HTML Content Attributes for {}", info.href)?;
    writeln!(file, "#[derive(Default, Debug, Clone, PartialEq, Eq)]")?;
    writeln!(file, "pub struct {} {{", capitalized_element_name)?;
    writeln!(
        file,
        "    pub attributes: std::collections::BTreeMap<String, String>,"
    )?;
    writeln!(file, "    pub events: Vec<(String, String)>,")?;
    writeln!(file, "    pub styles: crate::Style,")?;
    writeln!(file, "    pub children: Vec<super::Node>,")?;
    for attr in &html_attributes {
        let field_name = escape_attribute_field_name(&attr.name);
        let enum_values =
            get_attribute_enum_values(&info.interface, attr).or_else(|| attr.enum_values.clone());
        if enum_values.is_some() {
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

    writeln!(
        file,
        "pub fn {}() -> {} {{\n    {}::default()\n}}\n",
        escaped_module_name, capitalized_element_name, capitalized_element_name
    )?;

    writeln!(file, "impl {} {{", capitalized_element_name)?;
    write!(
        file,
        "{}",
        common_builder_methods(&capitalized_element_name, name)
    )?;
    for attr in &html_attributes {
        let method_name = escape_method_name(&attr.name);
        let field_name = escape_attribute_field_name(&attr.name);
        if matches!(
            method_name.as_str(),
            "attribute" | "id" | "class" | "style" | "popover" | "children" | "into_node"
        ) {
            continue;
        }
        let enum_values =
            get_attribute_enum_values(&info.interface, attr).or_else(|| attr.enum_values.clone());

        if enum_values.is_some() {
            let enum_type_name = format!("{}{}", capitalized_element_name, capitalize(&attr.name));
            writeln!(
                file,
                "    pub fn {}(mut self, value: {}) -> Self {{\n        self.attributes.insert(\"{}\".to_string(), value.as_str().to_string());\n        self.{} = Some(value);\n        self\n    }}\n",
                method_name, enum_type_name, attr.name, field_name
            )?;
        } else if attr.type_name == "boolean" {
            writeln!(
                file,
                "    pub fn {}(mut self, value: bool) -> Self {{\n        if value {{\n            self.attributes.insert(\"{}\".to_string(), String::new());\n        }} else {{\n            self.attributes.remove(\"{}\");\n        }}\n        self.{} = Some(value);\n        self\n    }}\n",
                method_name, attr.name, attr.name, field_name
            )?;
        } else {
            writeln!(
                file,
                "    pub fn {}(mut self, value: impl Into<String>) -> Self {{\n        let value = value.into();\n        self.attributes.insert(\"{}\".to_string(), value.clone());\n        self.{} = Some(value);\n        self\n    }}\n",
                method_name, attr.name, field_name
            )?;
        }
    }

    for attr in &events {
        let event_name = attr.name.trim_start_matches("on");
        let method_name = format!("on_{}", escape_method_name(event_name));
        writeln!(
            file,
            "    pub fn {}(mut self, handler: impl Into<String>) -> Self {{\n        self.events.push((\"{}\".to_string(), handler.into()));\n        self\n    }}\n",
            method_name, event_name
        )?;
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

fn get_attribute_enum_values(
    interface_name: &str,
    attr: &idl::ResolvedAttribute,
) -> Option<Vec<String>> {
    if attr.enum_values.is_some() {
        return attr.enum_values.clone();
    }

    match (interface_name, attr.name.as_str()) {
        ("HTMLButtonElement", "command") => Some(vec![
            "show-modal".to_string(),
            "close".to_string(),
            "request-close".to_string(),
            "show-popover".to_string(),
            "hide-popover".to_string(),
            "toggle-popover".to_string(),
        ]),
        _ => None,
    }
}

fn supports_custom_values(interface_name: &str, attr: &idl::ResolvedAttribute) -> bool {
    interface_name == "HTMLButtonElement" && attr.name == "command"
}

fn is_html_attribute(attr: &idl::ResolvedAttribute) -> bool {
    let name = attr.name.as_str();

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

    writeln!(file)?;

    writeln!(
        file,
        "#[cfg(test)]
mod tests {{
    use super::*;

    #[test]
    fn test_element_namespaces() {{
        assert!(is_svg_element_only(\"path\"));
        assert!(is_svg_element_only(\"rect\"));
        assert!(is_svg_element_only(\"circle\"));
        assert!(is_svg_element_only(\"svg\"));

        assert!(!is_svg_element_only(\"a\"));
        assert!(!is_svg_element_only(\"script\"));
        assert!(!is_svg_element_only(\"style\"));
        assert!(!is_svg_element_only(\"title\"));

        assert!(is_mathml_element_only(\"math\"));
        assert!(is_mathml_element_only(\"mfrac\"));
        assert!(is_mathml_element_only(\"mi\"));

        assert!(!is_svg_element_only(\"div\"));
        assert!(!is_svg_element_only(\"span\"));
        assert!(!is_mathml_element_only(\"div\"));
        assert!(!is_mathml_element_only(\"span\"));
    }}
}}"
    )?;

    Ok(())
}

fn common_builder_methods(element_name: &str, _tag_name: &str) -> String {
    let mut out = String::new();
    out.push_str(&format!(
        "    pub fn attribute(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {{\n        self.attributes.insert(key.into(), value.into());\n        self\n    }}\n\n"
    ));
    out.push_str(&format!(
        "    pub fn id(mut self, value: impl Into<String>) -> Self {{\n        self.attribute(\"id\", value)\n    }}\n\n"
    ));
    out.push_str(&format!(
        "    pub fn class(mut self, value: impl Into<String>) -> Self {{\n        self.attribute(\"class\", value)\n    }}\n\n"
    ));
    out.push_str(&format!(
        "    pub fn style(mut self, style: impl Into<crate::Style>) -> Self {{\n        self.styles = style.into();\n        self\n    }}\n\n"
    ));
    out.push_str(&format!(
        "    pub fn popover(self) -> Self {{\n        self.attribute(\"popover\", \"auto\")\n    }}\n\n"
    ));
    out.push_str(&format!(
        "    pub fn children(mut self, children: impl Into<Vec<super::Node>>) -> Self {{\n        self.children = children.into();\n        self\n    }}\n\n"
    ));
    out.push_str(&format!(
        "    pub fn into_node(self) -> super::Node {{\n        super::Node::Element(super::Element {{\n            global_attributes: super::GlobalAttributes::default(),\n            element_content: super::ElementContent::{}(self),\n            children: Vec::new(),\n        }})\n    }}\n\n",
        capitalize(element_name)
    ));
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::idl;

    #[test]
    fn common_builder_methods_are_generated_for_old_elements_compatibility() {
        let methods = common_builder_methods("Button", "button");
        assert!(methods.contains("pub fn attribute"));
        assert!(methods.contains("pub fn id"));
        assert!(methods.contains("pub fn class"));
        assert!(methods.contains("pub fn style"));
        assert!(methods.contains("pub fn popover"));
        assert!(methods.contains("pub fn children"));
        assert!(methods.contains("pub fn into_node"));
    }

    #[test]
    fn custom_enum_values_are_used_for_non_idl_attributes() {
        let attr = idl::ResolvedAttribute {
            name: "command".to_string(),
            type_name: "DOMString".to_string(),
            is_readonly: false,
            enum_values: None,
        };

        assert_eq!(
            get_attribute_enum_values("HTMLButtonElement", &attr),
            Some(vec![
                "show-modal".to_string(),
                "close".to_string(),
                "request-close".to_string(),
                "show-popover".to_string(),
                "hide-popover".to_string(),
                "toggle-popover".to_string(),
            ])
        );
        assert!(supports_custom_values("HTMLButtonElement", &attr));
    }

    #[test]
    fn class_attributes_are_generated_as_class() {
        use crate::naming::{escape_attribute_field_name, escape_method_name};

        assert_eq!(escape_method_name("className"), "class");
        assert_eq!(escape_attribute_field_name("className"), "class");
        assert_eq!(escape_method_name("class"), "class");
        assert_eq!(escape_attribute_field_name("class"), "class");
    }
}

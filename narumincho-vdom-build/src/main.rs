use std::fs::File;
use std::io::Write;
use std::path::Path;

#[derive(serde::Deserialize)]
struct Data {
    html: Html,
}

#[derive(serde::Deserialize)]
struct Html {
    elements: std::collections::HashMap<String, Element>,
    global_attributes: std::collections::HashMap<String, serde_json::Value>,
}

#[derive(serde::Deserialize)]
struct Element(std::collections::HashMap<String, serde_json::Value>);

fn main() -> anyhow::Result<()> {
    let data = if Path::new("./data.json").exists() {
        serde_json::from_slice::<Data>(&std::fs::read("./data.json")?)?
    } else {
        // https://github.com/mdn/browser-compat-data
        let response =
            reqwest::blocking::get("https://unpkg.com/@mdn/browser-compat-data/data.json")?
                .bytes()?;

        File::create("./data.json")?.write_all(&response)?;

        serde_json::from_slice::<Data>(&response)?
    };

    let mut file = File::create("./narumincho-vdom/src/elements.rs")?;
    writeln!(
        file,
        "// このファイルは narumincho-vdom-build によって自動生成されました。"
    )?;
    for tag in data.html.elements.keys() {
        writeln!(file, "pub mod {};", tag)?;
    }

    for (tag, element) in data.html.elements {
        let path = format!("./narumincho-vdom/src/elements/{}.rs", tag);
        let dest_path = Path::new(&path);
        let mut file = File::create(dest_path)?;

        writeln!(
            file,
            "// このファイルは narumincho-vdom-build によって自動生成されました。"
        )
        .unwrap();
        writeln!(file, "use crate::Element;")?;
        writeln!(file)?;
        writeln!(
            file,
            "pub struct {} {{
",
            tag
        )?;
        for (attr, _) in data
            .html
            .global_attributes
            .iter()
            .chain(element.0.iter().filter(|(k, _)| *k != "deprecated"))
            .filter(|(k, _)| !k.starts_with("__"))
        {
            writeln!(file, "    pub {}: Option<String>,", escape_identifier(attr))?;
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

fn escape_identifier(s: &str) -> String {
    match s {
        "type" | "loop" | "for" | "as" => "r#type".to_string(),
        _ => s.replace('-', "_"),
    }
}

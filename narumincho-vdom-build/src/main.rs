use std::fs::File;
use std::io::Write;
use std::path::Path;

#[derive(serde::Deserialize)]
struct Data {
    html: Html,
}

#[derive(serde::Deserialize)]
struct Html {
    elements: serde_json::Map<String, serde_json::Value>,
    global_attributes: serde_json::Map<String, serde_json::Value>,
}

fn main() -> std::io::Result<()> {
    let data = if Path::new("./data.json").exists() {
        serde_json::from_slice::<Data>(&std::fs::read("./data.json")?)?
    } else {
        let response =
            reqwest::blocking::get("https://unpkg.com/@mdn/browser-compat-data/data.json")
                .unwrap()
                .bytes()
                .unwrap();

        File::create("./data.json")
            .unwrap()
            .write_all(&response)
            .unwrap();

        serde_json::from_slice::<Data>(&response)?
    };

    for (tag, _) in data.html.elements {
        let path = format!("./narumincho-vdom/src/elements/{}.rs", tag);
        let dest_path = Path::new(&path);
        let mut file = File::create(dest_path).unwrap();

        writeln!(
            file,
            "// このファイルは narumincho-vdom-build によって自動生成されました。"
        )
        .unwrap();
        writeln!(file, "use crate::Element;").unwrap();
        writeln!(file).unwrap();
        // Rustの識別子（関数名）として安全かチェック（予約語などへの配慮が本来は必要）
        writeln!(
            file,
            r#"
pub fn {}() -> Element {{
    Element::new("{}")
}}"#,
            tag, tag
        )
        .unwrap();
        writeln!(file).unwrap();
    }

    Ok(())
}

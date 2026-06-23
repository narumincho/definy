// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://w3c.github.io/svgwg/svg2-draft/text.html#elementdef-tspan
pub struct Tspan {}

pub fn tspan() -> Tspan {
    Tspan {}
}

impl Tspan {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Tspan(self),
            children,
        }
    }
}

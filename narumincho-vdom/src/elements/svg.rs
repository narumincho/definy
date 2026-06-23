// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://w3c.github.io/svgwg/svg2-draft/struct.html#elementdef-svg
pub struct Svg {}

pub fn svg() -> Svg {
    Svg {}
}

impl Svg {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Svg(self),
            children,
        }
    }
}

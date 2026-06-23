// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://w3c.github.io/svgwg/svg2-draft/shapes.html#elementdef-polygon
pub struct Polygon {}

pub fn polygon() -> Polygon {
    Polygon {}
}

impl Polygon {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Polygon(self),
            children,
        }
    }
}

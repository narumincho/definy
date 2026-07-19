// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://www.w3.org/TR/SVG11/text.html#TextPathElement
pub struct TextPath {}

pub fn textPath() -> TextPath {
    TextPath {}
}

impl TextPath {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::TextPath(self),
            children,
        }
    }
}

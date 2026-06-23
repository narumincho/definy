// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://drafts.csswg.org/css-masking-1/#elementdef-clippath
pub struct ClipPath {}

pub fn clipPath() -> ClipPath {
    ClipPath {}
}

impl ClipPath {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::ClipPath(self),
            children,
        }
    }
}

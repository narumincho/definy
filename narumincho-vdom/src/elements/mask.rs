// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://drafts.csswg.org/css-masking-1/#elementdef-mask
pub struct Mask {}

pub fn mask() -> Mask {
    Mask {}
}

impl Mask {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Mask(self),
            children,
        }
    }
}

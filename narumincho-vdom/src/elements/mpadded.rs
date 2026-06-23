// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://w3c.github.io/mathml-core/#dfn-mpadded
pub struct Mpadded {}

pub fn mpadded() -> Mpadded {
    Mpadded {}
}

impl Mpadded {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Mpadded(self),
            children,
        }
    }
}

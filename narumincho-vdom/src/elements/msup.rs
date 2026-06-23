// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://w3c.github.io/mathml-core/#dfn-msup
pub struct Msup {}

pub fn msup() -> Msup {
    Msup {}
}

impl Msup {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Msup(self),
            children,
        }
    }
}

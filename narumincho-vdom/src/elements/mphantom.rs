// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://w3c.github.io/mathml-core/#dfn-mphantom
pub struct Mphantom {}

pub fn mphantom() -> Mphantom {
    Mphantom {}
}

impl Mphantom {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Mphantom(self),
            children,
        }
    }
}

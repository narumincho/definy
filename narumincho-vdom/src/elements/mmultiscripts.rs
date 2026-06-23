// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://w3c.github.io/mathml-core/#dfn-mmultiscripts
pub struct Mmultiscripts {}

pub fn mmultiscripts() -> Mmultiscripts {
    Mmultiscripts {}
}

impl Mmultiscripts {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Mmultiscripts(self),
            children,
        }
    }
}

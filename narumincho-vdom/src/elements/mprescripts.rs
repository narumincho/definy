// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://w3c.github.io/mathml-core/#dfn-mprescripts
pub struct Mprescripts {}

pub fn mprescripts() -> Mprescripts {
    Mprescripts {}
}

impl Mprescripts {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Mprescripts(self),
            children,
        }
    }
}

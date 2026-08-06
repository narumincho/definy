// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://w3c.github.io/html-ruby/#elementdef-rb
pub struct Rb {}

pub fn rb() -> Rb {
    Rb {}
}

impl Rb {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Rb(self),
            children,
        }
    }
}

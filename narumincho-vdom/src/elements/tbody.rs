// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://html.spec.whatwg.org/multipage/tables.html#the-tbody-element
pub struct Tbody {}

pub fn tbody() -> Tbody {
    Tbody {}
}

impl Tbody {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Tbody(self),
            children,
        }
    }
}

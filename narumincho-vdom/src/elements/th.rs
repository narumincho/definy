// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://html.spec.whatwg.org/multipage/tables.html#the-th-element
pub struct Th {}

pub fn th() -> Th {
    Th {}
}

impl Th {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Th(self),
            children,
        }
    }
}

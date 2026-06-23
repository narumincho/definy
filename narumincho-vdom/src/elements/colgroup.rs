// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://html.spec.whatwg.org/multipage/tables.html#the-colgroup-element
pub struct Colgroup {}

pub fn colgroup() -> Colgroup {
    Colgroup {}
}

impl Colgroup {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Colgroup(self),
            children,
        }
    }
}

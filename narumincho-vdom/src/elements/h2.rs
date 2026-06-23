// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://html.spec.whatwg.org/multipage/sections.html#the-h2-element
pub struct H2 {}

pub fn h2() -> H2 {
    H2 {}
}

impl H2 {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::H2(self),
            children,
        }
    }
}

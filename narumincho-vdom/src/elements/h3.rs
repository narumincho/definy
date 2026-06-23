// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://html.spec.whatwg.org/multipage/sections.html#the-h3-element
pub struct H3 {}

pub fn h3() -> H3 {
    H3 {}
}

impl H3 {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::H3(self),
            children,
        }
    }
}

// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://html.spec.whatwg.org/multipage/sections.html#the-h5-element
pub struct H5 {}

pub fn h5() -> H5 {
    H5 {}
}

impl H5 {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::H5(self),
            children,
        }
    }
}

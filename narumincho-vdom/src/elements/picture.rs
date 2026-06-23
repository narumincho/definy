// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://html.spec.whatwg.org/multipage/embedded-content.html#the-picture-element
pub struct Picture {}

pub fn picture() -> Picture {
    Picture {}
}

impl Picture {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Picture(self),
            children,
        }
    }
}

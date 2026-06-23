// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://html.spec.whatwg.org/multipage/semantics.html#the-link-element
pub struct Link {}

pub fn link() -> Link {
    Link {}
}

impl Link {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Link(self),
            children,
        }
    }
}

// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-u-element
pub struct U {}

pub fn u() -> U {
    U {}
}

impl U {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::U(self),
            children,
        }
    }
}

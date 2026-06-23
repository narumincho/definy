// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://html.spec.whatwg.org/multipage/scripting.html#the-noscript-element
pub struct Noscript {}

pub fn noscript() -> Noscript {
    Noscript {}
}

impl Noscript {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Noscript(self),
            children,
        }
    }
}

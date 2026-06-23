// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://html.spec.whatwg.org/multipage/edits.html#the-ins-element
pub struct Ins {}

pub fn ins() -> Ins {
    Ins {}
}

impl Ins {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Ins(self),
            children,
        }
    }
}

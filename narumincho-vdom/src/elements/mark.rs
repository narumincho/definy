// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-mark-element
pub struct Mark {}

pub fn mark() -> Mark {
    Mark {}
}

impl Mark {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Mark(self),
            children,
        }
    }
}

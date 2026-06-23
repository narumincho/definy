// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://html.spec.whatwg.org/multipage/grouping-content.html#the-dd-element
pub struct Dd {}

pub fn dd() -> Dd {
    Dd {}
}

impl Dd {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Dd(self),
            children,
        }
    }
}

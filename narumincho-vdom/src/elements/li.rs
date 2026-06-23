// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://html.spec.whatwg.org/multipage/grouping-content.html#the-li-element
pub struct Li {}

pub fn li() -> Li {
    Li {}
}

impl Li {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Li(self),
            children,
        }
    }
}

// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://html.spec.whatwg.org/multipage/edits.html#the-del-element
pub struct Del {}

pub fn del() -> Del {
    Del {}
}

impl Del {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Del(self),
            children,
        }
    }
}

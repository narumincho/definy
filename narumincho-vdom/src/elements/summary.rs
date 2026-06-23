// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://html.spec.whatwg.org/multipage/interactive-elements.html#the-summary-element
pub struct Summary {}

pub fn summary() -> Summary {
    Summary {}
}

impl Summary {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Summary(self),
            children,
        }
    }
}

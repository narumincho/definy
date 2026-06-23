// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://html.spec.whatwg.org/multipage/interactive-elements.html#the-details-element
pub struct Details {}

pub fn details() -> Details {
    Details {}
}

impl Details {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Details(self),
            children,
        }
    }
}

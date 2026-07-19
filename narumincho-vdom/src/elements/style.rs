// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://html.spec.whatwg.org/multipage/semantics.html#the-style-element
pub struct Style {}

pub fn style() -> Style {
    Style {}
}

impl Style {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Style(self),
            children,
        }
    }
}

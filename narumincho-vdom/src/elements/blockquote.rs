// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://html.spec.whatwg.org/multipage/grouping-content.html#the-blockquote-element
pub struct Blockquote {}

pub fn blockquote() -> Blockquote {
    Blockquote {}
}

impl Blockquote {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Blockquote(self),
            children,
        }
    }
}

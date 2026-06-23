// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://html.spec.whatwg.org/multipage/iframe-embed-object.html#the-embed-element
pub struct Embed {}

pub fn embed() -> Embed {
    Embed {}
}

impl Embed {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Embed(self),
            children,
        }
    }
}

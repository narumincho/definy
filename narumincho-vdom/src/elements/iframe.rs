// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://html.spec.whatwg.org/multipage/iframe-embed-object.html#the-iframe-element
pub struct Iframe {}

pub fn iframe() -> Iframe {
    Iframe {}
}

impl Iframe {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Iframe(self),
            children,
        }
    }
}

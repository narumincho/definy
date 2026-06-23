// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://html.spec.whatwg.org/multipage/embedded-content.html#the-img-element
pub struct Img {}

pub fn img() -> Img {
    Img {}
}

impl Img {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Img(self),
            children,
        }
    }
}
